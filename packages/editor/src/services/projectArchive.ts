import JSZip from 'jszip';
import {
  type AssetRecord,
  type ProjectExportManifest,
} from '@js-game-engine/shared';
import { db } from './db';
import {
  EXPORT_FORMAT_VERSION,
  extensionForMime,
} from './projectExport';

export async function buildProjectArchiveFromDb(projectId: string): Promise<Blob> {
  const stored = await db.projects.get(projectId);
  if (!stored) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const storedAssets = await db.assets.where('projectId').equals(projectId).toArray();
  const assets: ProjectExportManifest['assets'] = storedAssets.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
    mimeType: entry.mimeType,
    width: entry.width,
    height: entry.height,
    file: `assets/${entry.id}${extensionForMime(entry.mimeType)}`,
  }));

  const manifest: ProjectExportManifest = {
    exportVersion: EXPORT_FORMAT_VERSION,
    updatedAt: stored.updatedAt,
    project: {
      ...stored.data,
      name: stored.name,
    },
    assets,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  for (const entry of storedAssets) {
    zip.file(
      `assets/${entry.id}${extensionForMime(entry.mimeType)}`,
      entry.blob,
    );
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function importProjectArchiveToDb(
  archive: ArrayBuffer,
  options: {
    localProjectId: string;
    cloudId: string;
    overrideName?: string;
  },
): Promise<{ projectName: string; updatedAt: number }> {
  const zip = await JSZip.loadAsync(archive);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid project archive: missing manifest.json');
  }

  const manifest = JSON.parse(await manifestFile.async('string')) as ProjectExportManifest;
  if (manifest.exportVersion !== EXPORT_FORMAT_VERSION) {
    throw new Error(`Unsupported export version: ${manifest.exportVersion}`);
  }

  const projectId = options.localProjectId;
  await db.assets.where('projectId').equals(projectId).delete();

  for (const assetMeta of manifest.assets) {
    const assetFile = zip.file(assetMeta.file);
    if (!assetFile) {
      throw new Error(`Missing asset file in archive: ${assetMeta.file}`);
    }

    const blob = await assetFile.async('blob');
    const record: AssetRecord = {
      id: assetMeta.id,
      projectId,
      name: assetMeta.name,
      type: assetMeta.type,
      mimeType: assetMeta.mimeType,
      width: assetMeta.width,
      height: assetMeta.height,
    };
    await db.assets.put({ ...record, blob });
  }

  const projectName = options.overrideName?.trim() || manifest.project.name;
  const updatedAt = manifest.updatedAt ?? Date.now();

  await db.projects.put({
    id: projectId,
    name: projectName,
    data: {
      ...manifest.project,
      name: projectName,
    },
    updatedAt,
    cloudId: options.cloudId,
    lastSyncedAt: updatedAt,
  });

  return { projectName, updatedAt };
}
