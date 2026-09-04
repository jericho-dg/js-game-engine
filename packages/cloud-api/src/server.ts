import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import {
  authenticateToken,
  extractBearerToken,
  signIn,
  signOut,
  signUp,
} from './auth.js';

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.cloud-data',
);

interface ProjectIndexEntry {
  id: string;
  name: string;
  updatedAt: number;
}

interface UserIndex {
  projects: ProjectIndexEntry[];
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function userDir(userId: string): string {
  return path.join(DATA_DIR, userId);
}

async function readUserIndex(userId: string): Promise<UserIndex> {
  try {
    const raw = await readFile(path.join(userDir(userId), 'index.json'), 'utf8');
    return JSON.parse(raw) as UserIndex;
  } catch {
    return { projects: [] };
  }
}

async function writeUserIndex(userId: string, index: UserIndex): Promise<void> {
  const dir = userDir(userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
}

function projectPath(userId: string, projectId: string): string {
  return path.join(userDir(userId), `${projectId}.jge.zip`);
}

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
  if (pathname === '/v1/auth/signup' && req.method === 'POST') {
    const body = await readJsonBody<{ displayName?: string; password?: string }>(req);
    try {
      const result = await signUp(
        DATA_DIR,
        body.displayName ?? '',
        body.password ?? '',
      );
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
      const result = await signIn(
        DATA_DIR,
        body.displayName ?? '',
        body.password ?? '',
      );
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
      await signOut(DATA_DIR, token);
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === '/v1/auth/session' && req.method === 'GET') {
    const token = extractBearerToken(req.headers.authorization);
    const user = await authenticateToken(DATA_DIR, token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid or expired session.' });
      return true;
    }
    sendJson(res, 200, user);
    return true;
  }

  return false;
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

  const token = extractBearerToken(req.headers.authorization);
  const user = await authenticateToken(DATA_DIR, token);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return;
  }

  const userId = user.userId;

  if (req.method === 'GET' && url.pathname === '/v1/projects') {
    const index = await readUserIndex(userId);
    sendJson(res, 200, { projects: index.projects });
    return;
  }

  const projectMatch = url.pathname.match(/^\/v1\/projects\/([^/]+)$/);
  if (!projectMatch) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }

  const projectId = decodeURIComponent(projectMatch[1]!);

  if (req.method === 'GET') {
    try {
      const buffer = await readFile(projectPath(userId, projectId));
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(buffer);
    } catch {
      sendJson(res, 404, { error: 'Project not found.' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const body = await readBody(req);
    const meta = await parseProjectMeta(body);
    await mkdir(userDir(userId), { recursive: true });
    await writeFile(projectPath(userId, projectId), body);

    const index = await readUserIndex(userId);
    const nextEntry: ProjectIndexEntry = {
      id: projectId,
      name: meta.name,
      updatedAt: meta.updatedAt,
    };
    index.projects = [
      nextEntry,
      ...index.projects.filter((entry) => entry.id !== projectId),
    ];
    await writeUserIndex(userId, index);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    await rm(projectPath(userId, projectId), { force: true });
    const index = await readUserIndex(userId);
    index.projects = index.projects.filter((entry) => entry.id !== projectId);
    await writeUserIndex(userId, index);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
}

await ensureDataDir();
createServer((req, res) => {
  void handleRequest(req, res).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  });
}).listen(PORT, () => {
  console.log(`Cloud API listening on http://localhost:${PORT}`);
});
