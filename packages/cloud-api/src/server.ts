import 'dotenv/config';
import { createServer } from 'node:http';
import JSZip from 'jszip';
import { extractBearerToken } from './auth.js';
import { getCloudStoreBackend } from './config.js';
import { resolvePlayOrigin } from './playOrigin.js';
import { buildPlayUrl, injectPlayBaseHref, isPlayIndexRequest } from './publish.js';
import { buildShareUrl } from './shares.js';
import { getCloudStore, initializeCloudStore } from './store/index.js';

const PORT = Number(process.env.PORT ?? 8787);

async function parseProjectMeta(buffer: Buffer): Promise<{ name: string; updatedAt: number }> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid archive: missing manifest.json');
  }
  const manifest = JSON.parse(await manifestFile.async('string')) as {
    project?: { name?: string };
    updatedAt?: number;
  };
  return {
    name: manifest.project?.name?.trim() || 'Untitled Project',
    updatedAt: manifest.updatedAt ?? Date.now(),
  };
}

function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function readBody(req: import('node:http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody<T>(req: import('node:http').IncomingMessage): Promise<T> {
  const body = await readBody(req);
  return JSON.parse(body.toString('utf8')) as T;
}

async function handleAuthRoutes(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  pathname: string,
): Promise<boolean> {
  const store = getCloudStore();

  if (pathname === '/v1/auth/signup' && req.method === 'POST') {
    const body = await readJsonBody<{ displayName?: string; password?: string }>(req);
    try {
      const result = await store.signUp(body.displayName ?? '', body.password ?? '');
      sendJson(res, 201, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 400, { error: message });
    }
    return true;
  }

  if (pathname === '/v1/auth/login' && req.method === 'POST') {
    const body = await readJsonBody<{ displayName?: string; password?: string }>(req);
    try {
      const result = await store.signIn(body.displayName ?? '', body.password ?? '');
      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 401, { error: message });
    }
    return true;
  }

  if (pathname === '/v1/auth/logout' && req.method === 'POST') {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      await store.signOut(token);
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === '/v1/auth/session' && req.method === 'GET') {
    const token = extractBearerToken(req.headers.authorization);
    const user = await store.authenticateToken(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid or expired session.' });
      return true;
    }
    sendJson(res, 200, user);
    return true;
  }

  return false;
}

async function handlePlayRoutes(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  pathname: string,
): Promise<boolean> {
  const playMatch = pathname.match(/^\/play\/([^/]+)(?:\/(.*))?$/);
  if (!playMatch || req.method !== 'GET') {
    return false;
  }

  const publishId = decodeURIComponent(playMatch[1]!);
  const filePath = playMatch[2] ?? '';

  if (filePath === '' && !pathname.endsWith('/')) {
    res.writeHead(302, {
      Location: `${pathname}/`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end();
    return true;
  }

  const file = await getCloudStore().readPublishedFile(publishId, filePath || 'index.html');
  if (!file) {
    sendJson(res, 404, { error: 'Game not found.' });
    return true;
  }

  let body: Buffer | string = file.buffer;
  if (isPlayIndexRequest(filePath)) {
    body = injectPlayBaseHref(file.buffer.toString('utf8'), publishId);
  }

  res.writeHead(200, {
    'Content-Type': file.mimeType,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
  return true;
}

async function handleRequest(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (await handleAuthRoutes(req, res, url.pathname)) {
    return;
  }

  if (await handlePlayRoutes(req, res, url.pathname)) {
    return;
  }

  if (url.pathname === '/v1/gallery' && req.method === 'GET') {
    const limitParam = Number(url.searchParams.get('limit') ?? '50');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
    const games = await getCloudStore().listPublicGames(limit);
    const playOrigin = resolvePlayOrigin(req);
    sendJson(res, 200, {
      games: games.map((game) => ({
        ...game,
        playUrl: buildPlayUrl(playOrigin, game.publishId),
      })),
    });
    return;
  }

  const store = getCloudStore();
  const token = extractBearerToken(req.headers.authorization);
  const user = await store.authenticateToken(token);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return;
  }

  const userId = user.userId;

  if (req.method === 'GET' && url.pathname === '/v1/projects') {
    const projects = await store.listProjects(userId);
    sendJson(res, 200, { projects });
    return;
  }

  const sharedMatch = url.pathname.match(/^\/v1\/shared\/([^/]+)(?:\/(archive))?$/);
  if (sharedMatch && req.method === 'GET') {
    const shareToken = decodeURIComponent(sharedMatch[1]!);
    const share = await store.getShareByToken(shareToken);
    if (!share) {
      sendJson(res, 404, { error: 'Share link not found or revoked.' });
      return;
    }

    if (sharedMatch[2] === 'archive') {
      const buffer = await store.getProjectArchive(share.ownerId, share.projectId);
      if (!buffer) {
        sendJson(res, 404, { error: 'Shared project is no longer available.' });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(buffer);
      return;
    }

    sendJson(res, 200, {
      shareToken: share.token,
      projectName: share.projectName,
      ownerDisplayName: share.ownerDisplayName,
      updatedAt: share.updatedAt,
    });
    return;
  }

  const projectShareMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)\/share$/);
  if (projectShareMatch) {
    const projectId = decodeURIComponent(projectShareMatch[1]!);
    const projects = await store.listProjects(userId);
    const project = projects.find((entry) => entry.id === projectId);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found.' });
      return;
    }

    if (req.method === 'POST') {
      const share = await store.createOrGetProjectShare(
        userId,
        user.displayName,
        projectId,
        project.name,
      );
      const origin = req.headers.origin ?? `http://localhost:${PORT}`;
      sendJson(res, 200, {
        shareToken: share.token,
        shareUrl: buildShareUrl(origin, share.token),
        projectName: share.projectName,
        updatedAt: share.updatedAt,
      });
      return;
    }

    if (req.method === 'DELETE') {
      const revoked = await store.revokeProjectShare(userId, projectId);
      sendJson(res, 200, { ok: true, revoked });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const publishMatch = url.pathname.match(/^\/v1\/publish\/([^/]+)$/);
  if (publishMatch && req.method === 'PUT') {
    const publishId = decodeURIComponent(publishMatch[1]!);
    const body = await readBody(req);
    const isPublic =
      url.searchParams.get('public') === 'true' || url.searchParams.get('public') === '1';
    const titleParam = url.searchParams.get('title')?.trim();
    try {
      const result = await store.storePublishedGame(publishId, body, {
        userId,
        authorDisplayName: user.displayName,
        title: titleParam || undefined,
        isPublic,
      });
      const playOrigin = resolvePlayOrigin(req);
      sendJson(res, 200, {
        publishId,
        playUrl: buildPlayUrl(playOrigin, publishId),
        updatedAt: result.updatedAt,
        title: result.title,
        isPublic: result.isPublic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 400, { error: message });
    }
    return;
  }

  const projectMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)$/);
  if (!projectMatch) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }

  const projectId = decodeURIComponent(projectMatch[1]!);

  if (req.method === 'GET') {
    const buffer = await store.getProjectArchive(userId, projectId);
    if (!buffer) {
      sendJson(res, 404, { error: 'Project not found.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buffer);
    return;
  }

  if (req.method === 'PUT') {
    const body = await readBody(req);
    const meta = await parseProjectMeta(body);
    await store.putProjectArchive(userId, projectId, body, meta);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    await store.deleteProject(userId, projectId);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
}

await initializeCloudStore();
createServer((req, res) => {
  void handleRequest(req, res).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  });
}).listen(PORT, () => {
  const backend = getCloudStoreBackend();
  console.log(`Cloud API listening on http://localhost:${PORT} (${backend} backend)`);
});
