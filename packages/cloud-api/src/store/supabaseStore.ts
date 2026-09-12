import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { mimeTypeForPath } from '../publish.js';
import {
  authHandledByClientError,
  authenticateSupabaseJwt,
} from '../supabase/auth.js';
import {
  getSupabaseAdmin,
  PROJECT_ARCHIVES_BUCKET,
  PUBLISHED_GAMES_BUCKET,
} from '../supabase/client.js';
import type { CloudStore, ShareRecord } from './types.js';

function projectArchivePath(userId: string, projectId: string): string {
  return `${userId}/${projectId}.jge.zip`;
}

function publishedObjectPath(publishId: string, filePath: string): string {
  const normalized = filePath.replace(/^\/+/, '') || 'index.html';
  if (normalized.includes('..')) {
    throw new Error('Invalid published game path.');
  }
  return `${publishId}/${normalized}`;
}

export function createSupabaseStore(): CloudStore {
  return {
    async signUp() {
      throw authHandledByClientError();
    },

    async signIn() {
      throw authHandledByClientError();
    },

    async signOut() {
      // JWT sessions are revoked in the editor via Supabase Auth.
    },

    authenticateToken: authenticateSupabaseJwt,

    async listProjects(userId) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('cloud_projects')
        .select('id, name, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        updatedAt: row.updated_at,
      }));
    },

    async getProjectArchive(userId, projectId) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(PROJECT_ARCHIVES_BUCKET)
        .download(projectArchivePath(userId, projectId));
      if (error || !data) {
        return null;
      }

      return Buffer.from(await data.arrayBuffer());
    },

    async putProjectArchive(userId, projectId, archive, meta) {
      const supabase = getSupabaseAdmin();
      const storagePath = projectArchivePath(userId, projectId);

      const { error: uploadError } = await supabase.storage
        .from(PROJECT_ARCHIVES_BUCKET)
        .upload(storagePath, archive, {
          contentType: 'application/zip',
          upsert: true,
        });
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: upsertError } = await supabase.from('cloud_projects').upsert(
        {
          id: projectId,
          user_id: userId,
          name: meta.name,
          updated_at: meta.updatedAt,
          storage_path: storagePath,
        },
        { onConflict: 'user_id,id' },
      );
      if (upsertError) {
        throw new Error(upsertError.message);
      }
    },

    async deleteProject(userId, projectId) {
      const supabase = getSupabaseAdmin();
      await supabase.storage
        .from(PROJECT_ARCHIVES_BUCKET)
        .remove([projectArchivePath(userId, projectId)]);

      await supabase.from('cloud_shares').delete().match({
        owner_id: userId,
        project_id: projectId,
      });

      const { error } = await supabase.from('cloud_projects').delete().match({
        user_id: userId,
        id: projectId,
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    async createOrGetProjectShare(ownerId, ownerDisplayName, projectId, projectName) {
      const supabase = getSupabaseAdmin();
      const now = Date.now();

      const { data: existing, error: existingError } = await supabase
        .from('cloud_shares')
        .select('*')
        .match({ owner_id: ownerId, project_id: projectId })
        .maybeSingle();
      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('cloud_shares')
          .update({
            project_name: projectName,
            owner_display_name: ownerDisplayName,
            updated_at: now,
          })
          .eq('token', existing.token)
          .select('*')
          .single();
        if (updateError || !updated) {
          throw new Error(updateError?.message ?? 'Failed to update share.');
        }
        return mapShareRow(updated);
      }

      const token = randomUUID();
      const { data: created, error: createError } = await supabase
        .from('cloud_shares')
        .insert({
          token,
          owner_id: ownerId,
          owner_display_name: ownerDisplayName,
          project_id: projectId,
          project_name: projectName,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (createError || !created) {
        throw new Error(createError?.message ?? 'Failed to create share.');
      }

      return mapShareRow(created);
    },

    async getShareByToken(token) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('cloud_shares')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? mapShareRow(data) : null;
    },

    async revokeProjectShare(ownerId, projectId) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('cloud_shares')
        .delete()
        .match({ owner_id: ownerId, project_id: projectId })
        .select('token');
      if (error) {
        throw new Error(error.message);
      }
      return (data?.length ?? 0) > 0;
    },

    async storePublishedGame(publishId, archive, options = {}) {
      const zip = await JSZip.loadAsync(archive);
      for (const required of ['index.html', 'jge-player.js', 'game.json']) {
        if (!zip.file(required)) {
          throw new Error(`Invalid game archive: missing ${required}`);
        }
      }

      const gameFile = zip.file('game.json');
      const manifest = gameFile
        ? (JSON.parse(await gameFile.async('string')) as { name?: string })
        : {};
      const title = options.title?.trim() || manifest.name?.trim() || 'Untitled Game';
      const isPublic = options.isPublic ?? false;
      const userId = options.userId;

      const supabase = getSupabaseAdmin();
      const uploads: Array<{ path: string; body: Buffer }> = [];

      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        uploads.push({
          path: publishedObjectPath(publishId, entry.name),
          body: Buffer.from(await entry.async('nodebuffer')),
        });
      }

      if (uploads.length === 0) {
        throw new Error('Invalid game archive: no files found.');
      }

      for (const upload of uploads) {
        const { error } = await supabase.storage
          .from(PUBLISHED_GAMES_BUCKET)
          .upload(upload.path, upload.body, {
            contentType: mimeTypeForPath(upload.path),
            upsert: true,
          });
        if (error) {
          throw new Error(error.message);
        }
      }

      const updatedAt = Date.now();
      const { error: upsertError } = await supabase.from('published_games').upsert(
        {
          publish_id: publishId,
          user_id: userId ?? null,
          title,
          is_public: isPublic,
          updated_at: updatedAt,
        },
        { onConflict: 'publish_id' },
      );
      if (upsertError) {
        throw new Error(upsertError.message);
      }

      return { updatedAt, title, isPublic };
    },

    async listPublicGames(limit = 50) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('published_games')
        .select('publish_id, title, updated_at, user_id')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) {
        throw new Error(error.message);
      }

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
      const profileNames = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        if (profileError) {
          throw new Error(profileError.message);
        }
        for (const profile of profiles ?? []) {
          profileNames.set(profile.id, profile.display_name);
        }
      }

      return rows.map((row) => ({
        publishId: row.publish_id,
        title: row.title ?? 'Untitled Game',
        authorDisplayName: row.user_id ? profileNames.get(row.user_id) : undefined,
        updatedAt: row.updated_at,
      }));
    },

    async readPublishedFile(publishId, requestPath) {
      const supabase = getSupabaseAdmin();
      const objectPath = publishedObjectPath(publishId, requestPath || 'index.html');

      const { data, error } = await supabase.storage
        .from(PUBLISHED_GAMES_BUCKET)
        .download(objectPath);
      if (error || !data) {
        return null;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const normalized = requestPath.replace(/^\/+/, '') || 'index.html';
      return {
        buffer,
        mimeType: mimeTypeForPath(normalized),
      };
    },
  };
}

function mapShareRow(row: {
  token: string;
  owner_id: string;
  owner_display_name: string;
  project_id: string;
  project_name: string;
  created_at: number;
  updated_at: number;
}): ShareRecord {
  return {
    token: row.token,
    ownerId: row.owner_id,
    ownerDisplayName: row.owner_display_name,
    projectId: row.project_id,
    projectName: row.project_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
