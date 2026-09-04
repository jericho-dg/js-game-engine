import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

interface StoredUser {
  id: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

interface UserStore {
  users: StoredUser[];
}

interface SessionRecord {
  userId: string;
  displayName: string;
  expiresAt: number;
}

interface SessionStore {
  sessions: Record<string, SessionRecord>;
}

export interface AuthUser {
  userId: string;
  displayName: string;
}

export interface AuthResult {
  token: string;
  userId: string;
  displayName: string;
}

function usersPath(dataDir: string): string {
  return path.join(dataDir, 'users.json');
}

function sessionsPath(dataDir: string): string {
  return path.join(dataDir, 'sessions.json');
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, passwordHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(passwordHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function validateCredentials(displayName: string, password: string): string | null {
  if (!normalizeDisplayName(displayName)) {
    return 'Display name is required.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

async function pruneExpiredSessions(dataDir: string): Promise<SessionStore> {
  const store = await readJsonFile<SessionStore>(sessionsPath(dataDir), { sessions: {} });
  const now = Date.now();
  const nextSessions: Record<string, SessionRecord> = {};
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.expiresAt > now) {
      nextSessions[token] = session;
    }
  }
  if (Object.keys(nextSessions).length !== Object.keys(store.sessions).length) {
    await writeJsonFile(sessionsPath(dataDir), { sessions: nextSessions });
  }
  return { sessions: nextSessions };
}

async function createSession(
  dataDir: string,
  user: AuthUser,
): Promise<AuthResult> {
  const token = randomBytes(32).toString('hex');
  const store = await pruneExpiredSessions(dataDir);
  store.sessions[token] = {
    userId: user.userId,
    displayName: user.displayName,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await writeJsonFile(sessionsPath(dataDir), store);
  return {
    token,
    userId: user.userId,
    displayName: user.displayName,
  };
}

export async function signUp(
  dataDir: string,
  displayName: string,
  password: string,
): Promise<AuthResult> {
  const validationError = validateCredentials(displayName, password);
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedName = normalizeDisplayName(displayName);
  const store = await readJsonFile<UserStore>(usersPath(dataDir), { users: [] });
  const existing = store.users.find(
    (user) => user.displayName.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (existing) {
    throw new Error('An account with this display name already exists.');
  }

  const salt = randomBytes(16).toString('hex');
  const user: StoredUser = {
    id: randomUUID(),
    displayName: normalizedName,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: Date.now(),
  };
  store.users.push(user);
  await writeJsonFile(usersPath(dataDir), store);

  return createSession(dataDir, { userId: user.id, displayName: user.displayName });
}

export async function signIn(
  dataDir: string,
  displayName: string,
  password: string,
): Promise<AuthResult> {
  const validationError = validateCredentials(displayName, password);
  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedName = normalizeDisplayName(displayName);
  const store = await readJsonFile<UserStore>(usersPath(dataDir), { users: [] });
  const user = store.users.find(
    (entry) => entry.displayName.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    throw new Error('Invalid display name or password.');
  }

  return createSession(dataDir, { userId: user.id, displayName: user.displayName });
}

export async function signOut(dataDir: string, token: string): Promise<void> {
  const store = await pruneExpiredSessions(dataDir);
  if (store.sessions[token]) {
    delete store.sessions[token];
    await writeJsonFile(sessionsPath(dataDir), store);
  }
}

export async function authenticateToken(
  dataDir: string,
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token?.trim()) return null;

  const store = await pruneExpiredSessions(dataDir);
  const session = store.sessions[token];
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return {
    userId: session.userId,
    displayName: session.displayName,
  };
}

export function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}
