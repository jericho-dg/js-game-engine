import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type {
  GalleryGameEntry,
  PublishGameOptions,
  StorePublishedGameResult,
} from './store/publishTypes.js';

const REQUIRED_FILES = ['index.html', 'jge-player.js', 'game.json'];
const META_FILE = '.publish-meta.json';

export interface PublishedCatalogEntry {
  publishId: string;
  title: string;
  isPublic: boolean;
  userId?: string;
  authorDisplayName?: string;
  updatedAt: number;
}

interface PublishedCatalog {
  games: PublishedCatalogEntry[];
}

function publishedDir(dataDir: string, publishId: string): string {
  return path.join(dataDir, 'published', publishId);
}

function catalogPath(dataDir: string): string {
  return path.join(dataDir, 'published', 'catalog.json');
}

export function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.ogg') return 'audio/ogg';
  return 'application/octet-stream';
}

export async function parseGameTitleFromArchive(archive: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(archive);
  const gameFile = zip.file('game.json');
  if (!gameFile) {
    return 'Untitled Game';
  }

  const manifest = JSON.parse(await gameFile.async('string')) as { name?: string };
  return manifest.name?.trim() || 'Untitled Game';
}

async function readCatalog(dataDir: string): Promise<PublishedCatalog> {
  try {
    const raw = await readFile(catalogPath(dataDir), 'utf8');
    const parsed = JSON.parse(raw) as PublishedCatalog;
    return { games: parsed.games ?? [] };
  } catch {
    return { games: [] };
  }
}

async function writeCatalog(dataDir: string, catalog: PublishedCatalog): Promise<void> {
  await mkdir(path.join(dataDir, 'published'), { recursive: true });
  await writeFile(catalogPath(dataDir), JSON.stringify(catalog, null, 2));
}

async function upsertCatalogEntry(
  dataDir: string,
  entry: PublishedCatalogEntry,
): Promise<void> {
  const catalog = await readCatalog(dataDir);
  catalog.games = [entry, ...catalog.games.filter((game) => game.publishId !== entry.publishId)];
  await writeCatalog(dataDir, catalog);
}

export async function storePublishedGame(
  dataDir: string,
  publishId: string,
  archive: Buffer,
  options: PublishGameOptions = {},
): Promise<StorePublishedGameResult> {
  const zip = await JSZip.loadAsync(archive);
  for (const required of REQUIRED_FILES) {
    if (!zip.file(required)) {
      throw new Error(`Invalid game archive: missing ${required}`);
    }
  }

  const title = options.title?.trim() || (await parseGameTitleFromArchive(archive));
  const isPublic = options.isPublic ?? false;
  const updatedAt = Date.now();

  const targetDir = publishedDir(dataDir, publishId);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const content = await entry.async('nodebuffer');
    const filePath = path.join(targetDir, entry.name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  const meta = {
    publishId,
    title,
    isPublic,
    userId: options.userId,
    authorDisplayName: options.authorDisplayName,
    updatedAt,
  };
  await writeFile(path.join(targetDir, META_FILE), JSON.stringify(meta, null, 2));

  await upsertCatalogEntry(dataDir, meta);

  return { updatedAt, title, isPublic };
}

export async function listPublicGames(
  dataDir: string,
  limit = 50,
): Promise<GalleryGameEntry[]> {
  const catalog = await readCatalog(dataDir);
  return catalog.games
    .filter((game) => game.isPublic)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((game) => ({
      publishId: game.publishId,
      title: game.title,
      authorDisplayName: game.authorDisplayName,
      updatedAt: game.updatedAt,
    }));
}

export async function readPublishedFile(
  dataDir: string,
  publishId: string,
  requestPath: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const normalized = requestPath.replace(/^\/+/, '') || 'index.html';
  if (normalized.includes('..') || normalized === META_FILE) {
    return null;
  }

  const filePath = path.join(publishedDir(dataDir, publishId), normalized);
  try {
    const buffer = await readFile(filePath);
    return { buffer, mimeType: mimeTypeForPath(normalized) };
  } catch {
    return null;
  }
}

export function buildPlayUrl(origin: string, publishId: string): string {
  // No trailing slash: Vercel static rewrites match /play/:id but often 404 on /play/:id/
  return `${origin.replace(/\/$/, '')}/play/${publishId}`;
}

export function injectPlayBaseHref(html: string, publishId: string): string {
  const baseTag = `<base href="/play/${publishId}/" />`;
  if (html.includes('<base ')) {
    return html;
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n    ${baseTag}`);
  }
  return `${baseTag}\n${html}`;
}

export function isPlayIndexRequest(filePath: string): boolean {
  return filePath === '' || filePath === 'index.html';
}
