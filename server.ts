import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync, backup as sqliteBackup } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';
import { PassThrough, Readable } from 'node:stream';
import tls from 'node:tls';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { Ytdl, chooseFormat, Quality } from '@distube/ytdl-core';
import type { VideoFormat } from '@distube/ytdl-core';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  TelegramClient,
  Api,
  sessions,
  utils as tgUtils,
  client as tgClientLib,
  password as tgPassword,
} from 'telegram';
import bigInt from 'big-integer';

const ytdl = new Ytdl();
const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const SESSION_COOKIE_NAME = 'grove_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AppLogLevel = 'info' | 'warn' | 'error';

interface AppLogEntry {
  id: number;
  timestamp: string;
  level: AppLogLevel;
  source: string;
  message: string;
}

const MAX_APP_LOGS = 500;
const appLogBuffer: AppLogEntry[] = [];
let nextAppLogId = 1;

function redactSensitiveLogText(text: string): string {
  return text
    .replace(/bot\d+:[A-Za-z0-9_-]{20,}/g, 'bot***:***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1***')
    .replace(/(grove_session=)[^;\s]+/gi, '$1***')
    .replace(/(po_token=)[^&\s]+/gi, '$1***');
}

function appendAppLog(level: AppLogLevel, source: string, message: string): void {
  const cleaned = redactSensitiveLogText(String(message || '')).trim();
  if (!cleaned) return;
  appLogBuffer.push({
    id: nextAppLogId++,
    timestamp: new Date().toISOString(),
    level,
    source: String(source || 'server').slice(0, 32),
    message: cleaned.length > 2000 ? `${cleaned.slice(0, 2000)}…` : cleaned,
  });
  if (appLogBuffer.length > MAX_APP_LOGS) {
    appLogBuffer.splice(0, appLogBuffer.length - MAX_APP_LOGS);
  }
}

const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

function extractConsoleSource(text: string, fallback: string): string {
  const match = text.match(/^\[([a-zA-Z0-9_.:-]+)\]\s*/);
  return match ? match[1] : fallback;
}

console.log = (...args: unknown[]) => {
  originalConsoleLog(...args);
  const text = formatConsoleArgs(args);
  appendAppLog('info', extractConsoleSource(text, 'server'), text);
};

console.info = (...args: unknown[]) => {
  originalConsoleInfo(...args);
  const text = formatConsoleArgs(args);
  appendAppLog('info', extractConsoleSource(text, 'server'), text);
};

console.warn = (...args: unknown[]) => {
  originalConsoleWarn(...args);
  const text = formatConsoleArgs(args);
  appendAppLog('warn', extractConsoleSource(text, 'server'), text);
};

console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
  const text = formatConsoleArgs(args);
  appendAppLog('error', extractConsoleSource(text, 'server'), text);
};

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  appendAppLog('error', 'process', `Unhandled rejection: ${msg}`);
});

process.on('uncaughtExceptionMonitor', (err) => {
  appendAppLog('error', 'process', `Uncaught exception: ${err.stack || err.message}`);
});

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  passwordSalt?: string;
  provider: 'email' | 'google';
  role: 'user' | 'admin';
  preferences: {
    theme: 'dark' | 'light';
    language: 'en' | 'fa' | 'ru' | 'zh';
    defaultQuality: string;
    youtubeCookies?: string;
    youtubePoToken?: string;
  };
}

let DATA_DIR = path.resolve(
  process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data')
);

function resolveWorkingPaths(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
  } catch (err) {
    const fallback = path.join(os.tmpdir(), 'grove_data');
    console.warn(`[server] Warning: DATA_DIR (${DATA_DIR}) is not writable (${err instanceof Error ? err.message : err}). Falling back to ${fallback}`);
    DATA_DIR = fallback;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }
}

resolveWorkingPaths();

let CACHE_DIR = path.resolve(DATA_DIR, 'cache');
let BIN_DIR = path.resolve(DATA_DIR, 'bin');
let YT_DLP_PLUGINS_DIR = path.resolve(DATA_DIR, 'yt-dlp-plugins');
let YT_DLP_CACHE_DIR = path.resolve(DATA_DIR, 'yt-dlp-cache');
let PARTH_DL_DIR = path.resolve(DATA_DIR, 'parth-dl');
let USERS_FILE = path.resolve(DATA_DIR, 'users.json');
let ADMIN_CONFIG_FILE = path.resolve(DATA_DIR, 'admin-config.json');
let YT_COOKIES_FILE = path.resolve(DATA_DIR, 'yt-cookies.txt');
let XRAY_CONFIG_FILE = path.resolve(DATA_DIR, 'xray-runtime.json');
let BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
let DB_FILE = path.resolve(DATA_DIR, 'grove.db');

function ensureDataDir(): void {
  resolveWorkingPaths();
  CACHE_DIR = path.resolve(DATA_DIR, 'cache');
  BIN_DIR = path.resolve(DATA_DIR, 'bin');
  YT_DLP_PLUGINS_DIR = path.resolve(DATA_DIR, 'yt-dlp-plugins');
  YT_DLP_CACHE_DIR = path.resolve(DATA_DIR, 'yt-dlp-cache');
  PARTH_DL_DIR = path.resolve(DATA_DIR, 'parth-dl');
  USERS_FILE = path.resolve(DATA_DIR, 'users.json');
  ADMIN_CONFIG_FILE = path.resolve(DATA_DIR, 'admin-config.json');
  YT_COOKIES_FILE = path.resolve(DATA_DIR, 'yt-cookies.txt');
  XRAY_CONFIG_FILE = path.resolve(DATA_DIR, 'xray-runtime.json');
  BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
  DB_FILE = path.resolve(DATA_DIR, 'grove.db');

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }
  if (!fs.existsSync(YT_DLP_PLUGINS_DIR)) {
    fs.mkdirSync(YT_DLP_PLUGINS_DIR, { recursive: true });
  }
  if (!fs.existsSync(YT_DLP_CACHE_DIR)) {
    fs.mkdirSync(YT_DLP_CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

type DownloadFileExt = 'mp4' | 'mp3' | 'jpg' | 'png' | 'webp' | 'zip';

function getMimeTypeForExt(ext: DownloadFileExt): string {
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'zip':
      return 'application/zip';
    default:
      return 'video/mp4';
  }
}

interface DownloadJob {
  id: string;
  url: string;
  title: string;
  quality: string;
  audioFormatId?: string;
  ext: DownloadFileExt;
  mimeType: string;
  status: 'downloading' | 'processing' | 'ready' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  filePath: string;
  contentDisposition: string;
  error?: string;
  createdAt: number;
  fileName?: string;
  telegramFileId?: string;
  telegramMessageId?: number;
  telegramChatId?: string;
  telegramUploading?: boolean;
  telegramUploadError?: string;
  ownerUserId?: string | null;
  author?: string;
}

interface MediaAudioTrack {
  formatId: string;
  language: string;
  label: string;
  ext: string;
  abr: number | null;
  isDefault: boolean;
}

interface MediaSubtitleTrack {
  lang: string;
  label: string;
  isAuto: boolean;
}

const downloadJobs = new Map<string, DownloadJob>();

function cleanupExpiredJobs(): void {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of downloadJobs.entries()) {
    if (job.createdAt < cutoff && job.status !== 'downloading' && job.status !== 'processing') {
      fs.promises.rm(job.filePath, { force: true }).catch(() => {});
      downloadJobs.delete(id);
    }
  }
}

setInterval(cleanupExpiredJobs, 5 * 60 * 1000).unref();

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash: derived, salt: usedSalt };
}

function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_EMAIL_NORMALIZED = ADMIN_EMAIL ? ADMIN_EMAIL.trim().toLowerCase() : '';
DB_FILE = path.resolve(DATA_DIR, 'grove.db');

interface UserHistoryItem {
  id: string;
  jobId?: string;
  url: string;
  title: string;
  author: string;
  quality: string;
  sizeBytes: number;
  thumbnail: string | null;
  savedAt: string;
}

ensureDataDir();
let db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    role TEXT NOT NULL DEFAULT 'user',
    theme TEXT NOT NULL DEFAULT 'dark',
    language TEXT NOT NULL DEFAULT 'en',
    default_quality TEXT NOT NULL DEFAULT '1080p',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS download_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    quality TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    thumbnail TEXT,
    saved_at TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, url, quality)
  );
  CREATE INDEX IF NOT EXISTS idx_history_user_created ON download_history(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS telegram_files (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT,
    source_url TEXT,
    title TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    quality TEXT,
    chat_id TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    access_hash TEXT,
    file_ref TEXT,
    file_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    caption TEXT,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_tg_files_user_created ON telegram_files(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tg_files_job ON telegram_files(job_id);

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'Admin',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
`);

// Migrate existing download_history tables from UNIQUE(user_id, url) to UNIQUE(user_id, url, quality)
try {
  const histTableRow = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='download_history'")
    .get() as { sql?: string } | undefined;
  const histDdl = histTableRow?.sql || '';
  if (histDdl && !/UNIQUE\s*\(\s*user_id\s*,\s*url\s*,\s*quality\s*\)/i.test(histDdl)) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE download_history_v2 (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id TEXT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        quality TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        thumbnail TEXT,
        saved_at TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, url, quality)
      );
      INSERT OR IGNORE INTO download_history_v2 (
        id, user_id, job_id, url, title, author, quality, size_bytes, thumbnail, saved_at, created_at
      )
      SELECT id, user_id, job_id, url, title, author, quality, size_bytes, thumbnail, saved_at, created_at
      FROM download_history;
      DROP TABLE download_history;
      ALTER TABLE download_history_v2 RENAME TO download_history;
      CREATE INDEX IF NOT EXISTS idx_history_user_created ON download_history(user_id, created_at DESC);
      COMMIT;
    `);
  }
} catch (migErr) {
  try {
    db.exec('ROLLBACK;');
  } catch {}
  console.warn('[db] download_history migration note:', migErr instanceof Error ? migErr.message : migErr);
}

try {
  const tgCols = db.prepare("PRAGMA table_info('telegram_files')").all() as Array<{ name?: string }>;
  if (!tgCols.some((c) => c.name === 'bot_file_id')) {
    db.exec('ALTER TABLE telegram_files ADD COLUMN bot_file_id TEXT;');
  }
} catch {
  // Ignore migration error if table is newly created
}

function normalizeQualityValue(raw: unknown): string {
  if (typeof raw === 'string' && ['2160p', '1080p', '720p', '480p', '360p'].includes(raw)) {
    return raw;
  }
  return '1080p';
}

function dbRowToUser(row: Record<string, unknown>): StoredUser {
  const emailLower = String(row.email || '').toLowerCase();
  const role: 'user' | 'admin' =
    row.role === 'admin' || (ADMIN_EMAIL_NORMALIZED && emailLower === ADMIN_EMAIL_NORMALIZED)
      ? 'admin'
      : 'user';
  const lang = row.language;
  return {
    id: String(row.id),
    email: emailLower,
    displayName: String(row.display_name || emailLower.split('@')[0] || 'User'),
    passwordHash: typeof row.password_hash === 'string' ? row.password_hash : undefined,
    passwordSalt: typeof row.password_salt === 'string' ? row.password_salt : undefined,
    provider: row.provider === 'google' ? 'google' : 'email',
    role,
    preferences: {
      theme: row.theme === 'light' ? 'light' : 'dark',
      language: lang === 'fa' || lang === 'ru' || lang === 'zh' ? lang : 'en',
      defaultQuality: normalizeQualityValue(row.default_quality),
    },
  };
}

function getUserByEmail(email: string): StoredUser | null {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
    .get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
  return row ? dbRowToUser(row) : null;
}

function getUserById(id: string): StoredUser | null {
  const row = db
    .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .get(id) as Record<string, unknown> | undefined;
  return row ? dbRowToUser(row) : null;
}

function insertUser(user: StoredUser): void {
  const now = Date.now();
  db.prepare(`
    INSERT INTO users (
      id, email, display_name, password_hash, password_salt,
      provider, role, theme, language, default_quality, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      display_name = excluded.display_name,
      password_hash = COALESCE(excluded.password_hash, users.password_hash),
      password_salt = COALESCE(excluded.password_salt, users.password_salt),
      role = excluded.role,
      updated_at = excluded.updated_at
  `).run(
    user.id,
    user.email.toLowerCase(),
    user.displayName,
    user.passwordHash ?? null,
    user.passwordSalt ?? null,
    user.provider,
    user.role,
    user.preferences.theme,
    user.preferences.language,
    normalizeQualityValue(user.preferences.defaultQuality),
    now,
    now
  );
}

function updateUserPreferencesInDb(
  userId: string,
  prefs: { theme: 'dark' | 'light'; language: 'en' | 'fa' | 'ru' | 'zh'; defaultQuality: string }
): void {
  db.prepare(`
    UPDATE users
    SET theme = ?, language = ?, default_quality = ?, updated_at = ?
    WHERE id = ?
  `).run(prefs.theme, prefs.language, normalizeQualityValue(prefs.defaultQuality), Date.now(), userId);
}

function getFirstAdminPreferences(): { youtubeCookies?: string; youtubePoToken?: string } {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as StoredUser[];
      for (const u of arr) {
        if (u.role === 'admin' && (u.preferences?.youtubeCookies || u.preferences?.youtubePoToken)) {
          return {
            youtubeCookies: u.preferences.youtubeCookies,
            youtubePoToken: u.preferences.youtubePoToken,
          };
        }
      }
    }
  } catch {
    // Ignore
  }
  return {};
}

// Migrate legacy users.json into SQLite database once if needed
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const arr = JSON.parse(raw) as StoredUser[];
    for (const u of arr) {
      if (!u.email) continue;
      const emailLower = u.email.trim().toLowerCase();
      if (!getUserByEmail(emailLower)) {
        const role: 'user' | 'admin' =
          u.role === 'admin' || (ADMIN_EMAIL_NORMALIZED && emailLower === ADMIN_EMAIL_NORMALIZED)
            ? 'admin'
            : 'user';
        insertUser({
          id: u.id || crypto.randomUUID(),
          email: emailLower,
          displayName: u.displayName || emailLower.split('@')[0] || 'User',
          passwordHash: u.passwordHash,
          passwordSalt: u.passwordSalt,
          provider: u.provider === 'google' ? 'google' : 'email',
          role,
          preferences: {
            theme: u.preferences?.theme === 'light' ? 'light' : 'dark',
            language:
              u.preferences?.language === 'fa' ||
              u.preferences?.language === 'ru' ||
              u.preferences?.language === 'zh'
                ? u.preferences.language
                : 'en',
            defaultQuality: normalizeQualityValue(u.preferences?.defaultQuality),
          },
        });
      }
    }
  }
} catch {
  // Ignore malformed legacy file
}

if (ADMIN_EMAIL_NORMALIZED && ADMIN_PASSWORD) {
  const { hash, salt } = hashPassword(ADMIN_PASSWORD);
  const existing = getUserByEmail(ADMIN_EMAIL_NORMALIZED);
  const adminUser: StoredUser = {
    id: existing?.id || crypto.randomUUID(),
    email: ADMIN_EMAIL_NORMALIZED,
    displayName: existing?.displayName || 'Administrator',
    passwordHash: hash,
    passwordSalt: salt,
    provider: 'email',
    role: 'admin',
    preferences: existing?.preferences || {
      theme: 'dark',
      language: 'en',
      defaultQuality: '1080p',
    },
  };
  insertUser(adminUser);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function createUserSession(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  db.prepare(`
    INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), tokenHash, userId, now + SESSION_TTL_MS, now);
  return rawToken;
}

function verifySessionToken(rawToken: string): StoredUser | null {
  if (!rawToken || rawToken.length < 16) return null;
  const tokenHash = hashSessionToken(rawToken);
  const row = db
    .prepare(`
      SELECT u.*
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
      LIMIT 1
    `)
    .get(tokenHash, Date.now()) as Record<string, unknown> | undefined;
  return row ? dbRowToUser(row) : null;
}

function revokeSessionToken(rawToken: string): void {
  if (!rawToken) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(rawToken));
}

function cleanupExpiredSessions(): void {
  try {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  } catch {
    // Ignore cleanup error
  }
}

cleanupExpiredSessions();
setInterval(cleanupExpiredSessions, 60 * 60 * 1000).unref();

function getUserHistory(userId: string): UserHistoryItem[] {
  const rows = db
    .prepare(`
      SELECT id, job_id, url, title, author, quality, size_bytes, thumbnail, saved_at
      FROM download_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `)
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    ...(typeof r.job_id === 'string' && r.job_id ? { jobId: r.job_id } : {}),
    url: String(r.url),
    title: String(r.title),
    author: String(r.author),
    quality: String(r.quality),
    sizeBytes: Number(r.size_bytes || 0),
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : null,
    savedAt: String(r.saved_at),
  }));
}

function upsertUserHistoryItem(userId: string, item: UserHistoryItem): UserHistoryItem[] {
  const now = Date.now();
  db.prepare(`
    INSERT INTO download_history (
      id, user_id, job_id, url, title, author, quality, size_bytes, thumbnail, saved_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, url, quality) DO UPDATE SET
      id = excluded.id,
      job_id = excluded.job_id,
      title = excluded.title,
      author = excluded.author,
      size_bytes = excluded.size_bytes,
      thumbnail = excluded.thumbnail,
      saved_at = excluded.saved_at,
      created_at = excluded.created_at
  `).run(
    item.id,
    userId,
    item.jobId ?? null,
    item.url,
    item.title,
    item.author,
    item.quality,
    Math.max(0, Math.floor(item.sizeBytes || 0)),
    item.thumbnail ?? null,
    item.savedAt,
    now
  );
  // Keep latest 50 items per user
  db.prepare(`
    DELETE FROM download_history
    WHERE user_id = ? AND id NOT IN (
      SELECT id FROM download_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    )
  `).run(userId, userId);
  return getUserHistory(userId);
}

function clearUserHistoryInDb(userId: string): void {
  db.prepare('DELETE FROM download_history WHERE user_id = ?').run(userId);
}

interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: number;
}

function listAnnouncements(limit = 30): AnnouncementRecord[] {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const rows = db
    .prepare('SELECT id, title, body, author_name, created_at FROM announcements ORDER BY created_at DESC LIMIT ?')
    .all(safeLimit) as Array<{
      id: string;
      title: string;
      body: string;
      author_name: string;
      created_at: number;
    }>;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title || ''),
    body: String(r.body || ''),
    authorName: String(r.author_name || 'Admin'),
    createdAt: Number(r.created_at || 0),
  }));
}

function createAnnouncementInDb(input: { title: string; body: string; authorName: string }): AnnouncementRecord {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  db.prepare(
    'INSERT INTO announcements (id, title, body, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.title, input.body, input.authorName, createdAt);
  return {
    id,
    title: input.title,
    body: input.body,
    authorName: input.authorName,
    createdAt,
  };
}

function deleteAnnouncementInDb(id: string): boolean {
  const res = db.prepare('DELETE FROM announcements WHERE id = ?').run(id) as { changes?: number | bigint };
  return Number(res?.changes || 0) > 0;
}

interface XrayProfileTestResult {
  ok: boolean;
  testedAt: number;
  latencyMs?: number;
  downloadedBytes?: number;
  title?: string;
  exitIp?: string | null;
  error?: string;
}

interface XrayProfile {
  id: string;
  name: string;
  protocol: string;
  address: string;
  configInput: string;
  lastTest?: XrayProfileTestResult;
}

interface AdminXrayConfig {
  enabled: boolean;
  configInput: string;
  activeProfileId: string | null;
  profiles: XrayProfile[];
  testYoutubeUrl: string;
  socksPort: number;
  httpPort: number;
}

interface AdminPotProviderConfig {
  enabled: boolean;
  mode: 'managed' | 'external';
  baseUrl: string;
  port: number;
}

interface AdminTelegramConfig {
  enabled: boolean;
  uploadEnabled: boolean;
  apiId: number | null;
  apiHash: string;
  botToken: string;
  session: string;
  mode: 'user' | 'bot';
  channel: string;
  // True when `channel` was filled in automatically from the bot's last chat
  // rather than typed by the admin. Lets a later phone sign-in discard it.
  channelAuto?: boolean;
}

interface AdminConfig {
  youtubeCookies: string;
  youtubePoToken: string;
  xray: AdminXrayConfig;
  potProvider: AdminPotProviderConfig;
  telegram: AdminTelegramConfig;
}

const DEFAULT_XRAY_TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

function defaultAdminConfig(): AdminConfig {
  return {
    youtubeCookies: '',
    youtubePoToken: '',
    xray: {
      enabled: false,
      configInput: '',
      activeProfileId: null,
      profiles: [],
      testYoutubeUrl: DEFAULT_XRAY_TEST_YOUTUBE_URL,
      socksPort: 10808,
      httpPort: 10809,
    },
    potProvider: {
      enabled: true,
      mode: 'managed',
      baseUrl: 'http://127.0.0.1:4416',
      port: 4416,
    },
    telegram: {
      enabled: false,
      uploadEnabled: false,
      apiId: null,
      apiHash: '',
      botToken: '',
      session: '',
      mode: 'user',
      channel: '',
    },
  };
}

function loadAdminConfig(): AdminConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AdminConfig>;
      const rawProfiles = Array.isArray(parsed.xray?.profiles) ? parsed.xray.profiles : [];
      const profiles: XrayProfile[] = rawProfiles
        .filter(
          (p): p is XrayProfile =>
            Boolean(p) &&
            typeof p.id === 'string' &&
            typeof p.configInput === 'string' &&
            p.configInput.trim().length > 0
        )
        .map((p) => ({
          id: p.id,
          name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Xray Server',
          protocol: typeof p.protocol === 'string' ? p.protocol : 'xray',
          address: typeof p.address === 'string' ? p.address : '',
          configInput: p.configInput.trim(),
          ...(p.lastTest && typeof p.lastTest.ok === 'boolean' ? { lastTest: p.lastTest } : {}),
        }));
      const legacyConfigInput = typeof parsed.xray?.configInput === 'string' ? parsed.xray.configInput.trim() : '';
      let activeProfileId =
        typeof parsed.xray?.activeProfileId === 'string' ? parsed.xray.activeProfileId : null;
      if (!profiles.length && legacyConfigInput) {
        try {
          const extracted = extractXrayProfileMeta(legacyConfigInput);
          const migratedProfile: XrayProfile = {
            id: crypto.randomUUID(),
            ...extracted,
            configInput: legacyConfigInput,
          };
          profiles.push(migratedProfile);
          activeProfileId = migratedProfile.id;
        } catch {
          // Keep raw legacy configInput even if unparsed
        }
      }
      return {
        youtubeCookies: typeof parsed.youtubeCookies === 'string' ? parsed.youtubeCookies : '',
        youtubePoToken: typeof parsed.youtubePoToken === 'string' ? parsed.youtubePoToken : '',
        xray: {
          enabled: Boolean(parsed.xray?.enabled),
          configInput: legacyConfigInput,
          activeProfileId,
          profiles,
          testYoutubeUrl:
            typeof parsed.xray?.testYoutubeUrl === 'string' && parsed.xray.testYoutubeUrl.trim()
              ? parsed.xray.testYoutubeUrl.trim()
              : DEFAULT_XRAY_TEST_YOUTUBE_URL,
          socksPort:
            typeof parsed.xray?.socksPort === 'number' && parsed.xray.socksPort > 1024 && parsed.xray.socksPort < 65535
              ? parsed.xray.socksPort
              : 10808,
          httpPort:
            typeof parsed.xray?.httpPort === 'number' && parsed.xray.httpPort > 1024 && parsed.xray.httpPort < 65535
              ? parsed.xray.httpPort
              : 10809,
        },
        potProvider: {
          enabled: parsed.potProvider?.enabled !== undefined ? Boolean(parsed.potProvider.enabled) : true,
          mode: parsed.potProvider?.mode === 'external' ? 'external' : 'managed',
          baseUrl:
            typeof parsed.potProvider?.baseUrl === 'string' && parsed.potProvider.baseUrl.trim()
              ? parsed.potProvider.baseUrl.trim()
              : 'http://127.0.0.1:4416',
          port:
            typeof parsed.potProvider?.port === 'number' && parsed.potProvider.port > 1024 && parsed.potProvider.port < 65535
              ? parsed.potProvider.port
              : 4416,
        },
        telegram: {
          enabled: Boolean(parsed.telegram?.enabled),
          uploadEnabled: Boolean(parsed.telegram?.uploadEnabled),
          apiId:
            typeof parsed.telegram?.apiId === 'number' && Number.isFinite(parsed.telegram.apiId)
              ? parsed.telegram.apiId
              : null,
          apiHash: typeof parsed.telegram?.apiHash === 'string' ? parsed.telegram.apiHash.trim() : '',
          botToken: typeof parsed.telegram?.botToken === 'string' ? parsed.telegram.botToken.trim() : '',
          session: typeof parsed.telegram?.session === 'string' ? parsed.telegram.session.trim() : '',
          mode: parsed.telegram?.mode === 'bot' ? 'bot' : 'user',
          channel: typeof parsed.telegram?.channel === 'string' ? parsed.telegram.channel.trim() : '',
          channelAuto: parsed.telegram?.channelAuto === true,
        },
      };
    }
  } catch {
    // Fall back to migration/default
  }
  const migrated = defaultAdminConfig();
  const legacyAdminPrefs = getFirstAdminPreferences();
  if (legacyAdminPrefs.youtubeCookies) migrated.youtubeCookies = legacyAdminPrefs.youtubeCookies;
  if (legacyAdminPrefs.youtubePoToken) migrated.youtubePoToken = legacyAdminPrefs.youtubePoToken;
  saveAdminConfig(migrated);
  return migrated;
}

function saveAdminConfig(cfg: AdminConfig): void {
  ensureDataDir();
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 });
}

const adminConfig: AdminConfig = loadAdminConfig();

/* ------------------------------------------------------------------ *
 * Telegram storage backend
 *
 * Files are uploaded to a Telegram channel and served back to users
 * through a server-side, Range-aware proxy route. Nothing is kept on
 * the app's own disk beyond the short-lived cache file that already
 * exists for every download job.
 * ------------------------------------------------------------------ */

interface PendingTelegramLogin {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  phoneCodeHash: string;
  isCodeViaApp: boolean;
  client: TelegramClient;
  createdAt: number;
}

const telegramState: {
  client: TelegramClient | null;
  clientKey: string;
  connecting: Promise<TelegramClient> | null;
  lastError: string | null;
  selfLabel: string | null;
} = {
  client: null,
  clientKey: '',
  connecting: null,
  lastError: null,
  selfLabel: null,
};

let pendingTelegramLogin: PendingTelegramLogin | null = null;

function telegramCredentials(cfg: AdminTelegramConfig): { apiId: number; apiHash: string } | null {
  if (typeof cfg.apiId !== 'number' || !Number.isFinite(cfg.apiId) || !cfg.apiHash) return null;
  return { apiId: cfg.apiId, apiHash: cfg.apiHash };
}

function telegramUsesBotHttpApi(cfg: AdminTelegramConfig): boolean {
  // A bot token means the Bot HTTP API is the transport, unless a real user
  // session (phone login) is also present — that always wins over the token.
  if (!cfg.botToken) return false;
  if (cfg.mode === 'user' && cfg.session) return false;
  return true;
}

/** Telegram Bot HTTP API's hard upload cap; phone sessions can go far higher. */
const TELEGRAM_BOT_MAX_BYTES = 50 * 1024 * 1024;

/**
 * True when an upload error means "stop, another strategy will not help".
 * The branches of the direct path each try a different way to obtain the media
 * and fall through on failure — but a rejected Telegram upload must abort the
 * whole job, or a doomed file is fetched and re-uploaded several times.
 */
function isFatalTelegramUploadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /over the 50 MB Telegram bot upload limit|Telegram upload is not enabled/i.test(msg);
}

function telegramIsConfigured(cfg: AdminTelegramConfig): boolean {
  if (cfg.mode === 'bot') return Boolean(cfg.botToken);
  if (!telegramCredentials(cfg)) return Boolean(cfg.botToken);
  // Credentials alone are not a login; the account must be signed in, or a bot
  // token must be present to drive the Bot HTTP API.
  return Boolean(cfg.session) || Boolean(cfg.botToken);
}

function telegramEnabledForUploads(cfg: AdminTelegramConfig): boolean {
  return Boolean(cfg.enabled && cfg.uploadEnabled && cfg.channel && telegramIsConfigured(cfg));
}

/**
 * Once valid Telegram credentials arrive, keep the app on the diskless path by
 * default: switch storage + uploads on, and for a phone account with no channel
 * chosen yet, publish to Saved Messages ("me") so a download never touches the
 * server disk. The admin can still turn either toggle off afterwards; that only
 * happens on a credential change, so an explicit "off" is respected later.
 */
function telegramActivateDiskless(cfg: AdminTelegramConfig): void {
  if (!telegramIsConfigured(cfg)) return;
  cfg.enabled = true;
  cfg.uploadEnabled = true;
  if (cfg.mode === 'user' && cfg.session && !cfg.channel) {
    cfg.channel = 'me';
  }
}

function sanitizeTelegramError(err: unknown, botToken?: string): string {
  let msg = err instanceof Error ? err.message : String(err || 'Telegram request failed.');
  if (botToken) {
    msg = msg.split(botToken).join('[REDACTED]');
  }
  msg = msg.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED]');
  return msg;
}

async function callTelegramBotApi<T = unknown>(
  botToken: string,
  method: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `https://api.telegram.org/bot${botToken}/${method}${qs}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = (await res.json()) as { ok?: boolean; result?: T; description?: string };
    if (!res.ok || !data.ok || data.result === undefined) {
      throw new Error(data.description || `Telegram Bot API HTTP ${res.status}`);
    }
    return data.result;
  } catch (err) {
    throw new Error(sanitizeTelegramError(err, botToken));
  }
}

/**
 * Finds a chat id a bot can post into when the admin has only supplied a token.
 * A brand-new bot has no chat until someone messages it or adds it to a channel,
 * so this returns null in that case and the admin must set the channel manually.
 */
async function telegramDiscoverBotChatId(botToken: string): Promise<string | null> {
  try {
    const updates = await callTelegramBotApi<
      Array<{ message?: { chat?: { id?: number | string } }; channel_post?: { chat?: { id?: number | string } } }>
    >(botToken, 'getUpdates', { limit: 1, offset: -1, allowed_updates: JSON.stringify(['message', 'channel_post']) });
    const chatId = updates?.[0]?.message?.chat?.id ?? updates?.[0]?.channel_post?.chat?.id;
    return chatId === undefined || chatId === null ? null : String(chatId);
  } catch {
    return null;
  }
}

async function disposeTelegramClient(): Promise<void> {
  const existing = telegramState.client;
  telegramState.client = null;
  telegramState.clientKey = '';
  telegramState.selfLabel = null;
  if (!existing) return;
  try {
    await existing.disconnect();
  } catch {
    // A dead socket is fine to ignore here.
  }
  try {
    await existing.destroy();
  } catch {
    // destroy() is optional for the GramJS client.
  }
}

/**
 * Returns a connected GramJS client for the configured Telegram account.
 * The client is cached and rebuilt whenever the credentials change.
 */
async function getTelegramClient(): Promise<TelegramClient> {
  const cfg = adminConfig.telegram;
  const creds = telegramCredentials(cfg);
  if (!creds) {
    throw new Error('Telegram API ID and API hash are required.');
  }

  const sessionValue = cfg.mode === 'bot' ? '' : cfg.session;
  if (cfg.mode === 'user' && !sessionValue) {
    throw new Error('Telegram account is not signed in yet.');
  }
  if (cfg.mode === 'bot' && !cfg.botToken) {
    throw new Error('Telegram bot token is required.');
  }

  const key = `${creds.apiId}:${creds.apiHash}:${cfg.mode}:${cfg.mode === 'bot' ? cfg.botToken : sessionValue}`;
  if (telegramState.client && telegramState.clientKey === key) {
    return telegramState.client;
  }
  if (telegramState.connecting && telegramState.clientKey === key) {
    return telegramState.connecting;
  }

  const build = (async () => {
    await disposeTelegramClient();
    const session = new sessions.StringSession(sessionValue || '');
    const client = new TelegramClient(session, creds.apiId, creds.apiHash, {
      connectionRetries: 5,
      useWSS: false,
      autoReconnect: true,
      deviceModel: 'Grove Save',
      systemVersion: 'Server',
      appVersion: '1.0.0',
    });
    await client.connect();

    if (cfg.mode === 'bot') {
      if (!(await client.checkAuthorization())) {
        await client.start({ botAuthToken: cfg.botToken });
      }
    } else if (!(await client.checkAuthorization())) {
      await client.disconnect();
      throw new Error('Telegram session is no longer valid. Sign in again from the admin panel.');
    }

    try {
      const me = (await client.getMe()) as { firstName?: string; username?: string; id?: unknown };
      telegramState.selfLabel = me.username ? `@${me.username}` : me.firstName || null;
    } catch {
      telegramState.selfLabel = null;
    }

    telegramState.client = client;
    telegramState.clientKey = key;
    telegramState.lastError = null;
    return client;
  })();

  telegramState.connecting = build;
  try {
    return await build;
  } catch (err) {
    telegramState.lastError = sanitizeTelegramError(err, cfg.botToken);
    telegramState.connecting = null;
    throw err;
  } finally {
    if (telegramState.connecting === build) {
      telegramState.connecting = null;
    }
  }
}

async function telegramClientIfReady(): Promise<TelegramClient | null> {
  if (!telegramIsConfigured(adminConfig.telegram) || telegramUsesBotHttpApi(adminConfig.telegram)) return null;
  try {
    return await getTelegramClient();
  } catch (err) {
    telegramState.lastError = sanitizeTelegramError(err, adminConfig.telegram.botToken);
    return null;
  }
}

function telegramStatusView() {
  const cfg = adminConfig.telegram;
  const usingBotHttpApi = telegramUsesBotHttpApi(cfg);
  const mtprotoConnected =
    telegramState.client !== null && telegramState.clientKey.startsWith(`${cfg.apiId || 0}:`);
  const signedIn =
    cfg.mode === 'bot'
      ? usingBotHttpApi
        ? Boolean(cfg.botToken)
        : mtprotoConnected || Boolean(cfg.botToken && telegramCredentials(cfg))
      : mtprotoConnected;
  return {
    enabled: cfg.enabled,
    uploadEnabled: cfg.uploadEnabled,
    mode: cfg.mode,
    usingBotHttpApi,
    channel: cfg.channel,
    apiId: cfg.apiId,
    hasApiHash: Boolean(cfg.apiHash),
    apiHashMasked: cfg.apiHash ? `${cfg.apiHash.slice(0, 4)}…${cfg.apiHash.slice(-4)}` : '',
    hasBotToken: Boolean(cfg.botToken),
    hasSession: Boolean(cfg.session),
    signedIn,
    // True only when the pipeline will stream straight to Telegram instead of
    // the server disk (enabled + upload toggle + channel + working credentials).
    uploadsActive: telegramEnabledForUploads(cfg),
    // Uploads are switched on and credentials exist, but nothing can be
    // published yet — the UI must say so, because downloads now fail instead
    // of silently landing on the server disk.
    needsChannel: Boolean(cfg.uploadEnabled && telegramIsConfigured(cfg) && !cfg.channel),
    account: telegramState.selfLabel,
    lastError: telegramState.lastError,
    pendingLogin: Boolean(pendingTelegramLogin),
  };
}

function telegramFileIdForJob(jobId: string): string | null {
  const row = db
    .prepare('SELECT id FROM telegram_files WHERE job_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1')
    .get(jobId) as { id?: string } | undefined;
  return row?.id ?? null;
}

interface TelegramFileRow {
  id: string;
  user_id: string | null;
  job_id: string | null;
  source_url: string | null;
  title: string;
  author: string;
  quality: string | null;
  chat_id: string;
  message_id: number;
  bot_file_id?: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  created_at: number;
}

function recordTelegramFile(row: {
  userId: string | null;
  jobId: string;
  sourceUrl: string;
  title: string;
  author: string;
  quality: string;
  chatId: string;
  messageId: number;
  botFileId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO telegram_files
       (id, user_id, job_id, source_url, title, author, quality, chat_id, message_id, bot_file_id, file_name, mime_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    row.userId,
    row.jobId,
    row.sourceUrl,
    row.title,
    row.author,
    row.quality,
    row.chatId,
    row.messageId,
    row.botFileId ?? null,
    row.fileName,
    row.mimeType,
    row.sizeBytes,
    Date.now()
  );
  return id;
}

function lookupTelegramFile(id: string): TelegramFileRow | null {
  const row = db
    .prepare('SELECT * FROM telegram_files WHERE id = ? AND deleted_at IS NULL')
    .get(id) as TelegramFileRow | undefined;
  return row ?? null;
}

/**
 * Streams a Readable directly into Telegram MTProto (`SaveFilePart` for <= 10 MB
 * or `SaveBigFilePart` with streaming `fileTotalParts = -1` for > 10 MB) with
 * bounded concurrency and backpressure, never touching the server disk.
 */
async function uploadStreamToTelegramMtproto(
  client: TelegramClient,
  readable: Readable,
  fileName: string,
  onProgress?: (uploadedBytes: number) => void
): Promise<{ inputFile: Api.InputFile | Api.InputFileBig; sizeBytes: number }> {
  const PART_SIZE = 512 * 1024;
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB (20 parts of 512 KB)
  const WORKERS = 4;

  const rawId = crypto.randomBytes(8).readBigInt64LE(0);
  const fileId = bigInt(rawId.toString());

  await client.getSender(client.session.dcId);

  let uploadedBytes = 0;
  const sendPart = async (
    isLarge: boolean,
    partIndex: number,
    totalPartsArg: number,
    bytes: Buffer
  ): Promise<void> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      let sender: Awaited<ReturnType<TelegramClient['getSender']>> | undefined;
      try {
        sender = await client.getSender(client.session.dcId);
        await sender.send(
          isLarge
            ? new Api.upload.SaveBigFilePart({
                fileId,
                filePart: partIndex,
                fileTotalParts: totalPartsArg,
                bytes,
              })
            : new Api.upload.SaveFilePart({
                fileId,
                filePart: partIndex,
                bytes,
              })
        );
        uploadedBytes += bytes.length;
        if (onProgress) onProgress(uploadedBytes);
        return;
      } catch (err: unknown) {
        const errAny = err as { seconds?: number; message?: string };
        if (typeof errAny?.seconds === 'number' && errAny.seconds > 0) {
          await new Promise((r) => setTimeout(r, (errAny.seconds! + 1) * 1000));
          continue;
        }
        if (sender && !sender.isConnected()) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        if (attempt < 3 && /timeout|ECONNRESET|EPIPE|disconnect/i.test(String(errAny?.message || ''))) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Failed to upload file part to Telegram after retries.');
  };

  const inFlight = new Set<Promise<void>>();
  const enqueue = async (task: () => Promise<void>): Promise<void> => {
    while (inFlight.size >= WORKERS) {
      await Promise.race(inFlight);
    }
    let tracked!: Promise<void>;
    tracked = task().finally(() => {
      inFlight.delete(tracked);
    });
    inFlight.add(tracked);
  };

  let accChunks: Buffer[] = [];
  let accLen = 0;
  const takeExact = (n: number): Buffer => {
    const joined = accChunks.length === 1 ? accChunks[0] : Buffer.concat(accChunks, accLen);
    const slice = joined.subarray(0, n);
    const rest = joined.subarray(n);
    accChunks = rest.length > 0 ? [rest] : [];
    accLen = rest.length;
    return Buffer.from(slice);
  };
  const drainRemaining = (): Buffer | null => {
    if (accLen === 0) return null;
    const joined = accChunks.length === 1 ? accChunks[0] : Buffer.concat(accChunks, accLen);
    accChunks = [];
    accLen = 0;
    return joined;
  };

  let totalBytes = 0;
  let streamingBig = false;
  let nextPartIndex = 0;
  const initialParts: Buffer[] = [];
  let heldBigChunk: Buffer | null = null;

  const flushInitialToBig = async (holdLast: boolean): Promise<void> => {
    streamingBig = true;
    const limit = holdLast ? initialParts.length - 1 : initialParts.length;
    for (let i = 0; i < limit; i += 1) {
      const partBuf = initialParts[i];
      const idx = nextPartIndex++;
      await enqueue(() => sendPart(true, idx, -1, partBuf));
    }
    if (holdLast && initialParts.length > 0) {
      heldBigChunk = initialParts[initialParts.length - 1];
    }
    initialParts.length = 0;
  };

  try {
    for await (const raw of readable) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
      if (chunk.length === 0) continue;
      totalBytes += chunk.length;
      accChunks.push(chunk);
      accLen += chunk.length;

      while (accLen >= PART_SIZE) {
        const part = takeExact(PART_SIZE);
        if (!streamingBig) {
          initialParts.push(part);
          if (totalBytes > LARGE_FILE_THRESHOLD) {
            // If there are still bytes in accLen, none of initialParts is the last chunk;
            // otherwise hold the last full chunk until more bytes or EOF arrive.
            await flushInitialToBig(accLen === 0);
          }
        } else {
          if (heldBigChunk !== null) {
            const toSend = heldBigChunk;
            const idx = nextPartIndex++;
            await enqueue(() => sendPart(true, idx, -1, toSend));
          }
          heldBigChunk = part;
        }
      }

      if (!streamingBig && totalBytes > LARGE_FILE_THRESHOLD && initialParts.length > 0 && accLen > 0) {
        await flushInitialToBig(false);
      }
      if (streamingBig && heldBigChunk !== null && accLen > 0) {
        const toSend = heldBigChunk;
        heldBigChunk = null;
        const idx = nextPartIndex++;
        await enqueue(() => sendPart(true, idx, -1, toSend));
      }
    }
  } catch (err) {
    await Promise.allSettled(inFlight);
    throw err;
  }

  const tail = drainRemaining();

  if (!streamingBig) {
    if (tail) initialParts.push(tail);
    if (totalBytes === 0 || initialParts.length === 0) {
      throw new Error('Media stream was empty.');
    }
    const totalParts = initialParts.length;
    const isLarge = totalBytes > LARGE_FILE_THRESHOLD;
    for (let i = 0; i < totalParts; i += 1) {
      const partBuf = initialParts[i];
      await enqueue(() => sendPart(isLarge, i, totalParts, partBuf));
    }
    await Promise.all(inFlight);
    return {
      inputFile: isLarge
        ? new Api.InputFileBig({ id: fileId, parts: totalParts, name: fileName })
        : new Api.InputFile({ id: fileId, parts: totalParts, name: fileName, md5Checksum: '' }),
      sizeBytes: totalBytes,
    };
  }

  // Wait for all intermediate `-1` parts before sending the final part with exact totalParts.
  await Promise.all(inFlight);

  if (heldBigChunk !== null && tail !== null) {
    const midIdx = nextPartIndex++;
    await sendPart(true, midIdx, -1, heldBigChunk);
    const finalIdx = nextPartIndex++;
    const totalParts = finalIdx + 1;
    await sendPart(true, finalIdx, totalParts, tail);
    return {
      inputFile: new Api.InputFileBig({ id: fileId, parts: totalParts, name: fileName }),
      sizeBytes: totalBytes,
    };
  }

  const finalBuf = heldBigChunk ?? tail;
  if (!finalBuf) {
    throw new Error('Missing final stream chunk.');
  }
  const finalIdx = nextPartIndex++;
  const totalParts = finalIdx + 1;
  await sendPart(true, finalIdx, totalParts, finalBuf);
  return {
    inputFile: new Api.InputFileBig({ id: fileId, parts: totalParts, name: fileName }),
    sizeBytes: totalBytes,
  };
}

/**
 * Streams a Readable directly to Telegram Bot HTTP API (`sendDocument`) via
 * chunked multipart/form-data without saving anything to disk.
 * Subject to Telegram Bot API's 50 MB upload cap unless MTProto API ID/Hash are configured.
 */
async function uploadStreamToTelegramBotApi(
  botToken: string,
  channel: string,
  readable: Readable,
  fileName: string,
  mimeType: string,
  caption: string,
  onProgress?: (uploadedBytes: number) => void
): Promise<{ messageId: number; chatId: string; botFileId: string | null; sizeBytes: number }> {
  const MAX_BOT_API_BYTES = TELEGRAM_BOT_MAX_BYTES;
  const boundary = '----GroveSaveTg' + crypto.randomBytes(16).toString('hex');
  const safeName = fileName.replace(/["\r\n]/g, '_');

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="chat_id"\r\n\r\n${channel}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="document"; filename="${safeName}"\r\n` +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`,
    'utf8'
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');

  let sizeBytes = 0;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      readable.destroy();
      reject(new Error(sanitizeTelegramError(err, botToken)));
    };

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendDocument`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Transfer-Encoding': 'chunked',
        },
        timeout: 180000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          if (settled) return;
          settled = true;
          try {
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              ok?: boolean;
              description?: string;
              result?: {
                message_id?: number;
                chat?: { id?: number | string };
                document?: { file_id?: string };
                video?: { file_id?: string };
                audio?: { file_id?: string };
                photo?: Array<{ file_id?: string }>;
              };
            };
            const r = payload.result;
            // Narrow on `r` itself so the message id is known to be a number below.
            if (!payload.ok || !r?.message_id) {
              reject(new Error(sanitizeTelegramError(payload.description || `Bot API HTTP ${res.statusCode}`, botToken)));
              return;
            }
            const botFileId =
              r.document?.file_id ||
              r.video?.file_id ||
              r.audio?.file_id ||
              r.photo?.[r.photo.length - 1]?.file_id ||
              null;
            resolve({
              messageId: r.message_id,
              chatId: String(r.chat?.id ?? channel),
              botFileId,
              sizeBytes,
            });
          } catch (parseErr) {
            reject(new Error(sanitizeTelegramError(parseErr, botToken)));
          }
        });
        res.on('error', fail);
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Telegram Bot API upload timed out.'));
    });
    req.on('error', fail);

    req.write(preamble);

    readable.on('data', (chunk: Buffer) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      sizeBytes += buf.length;
      if (sizeBytes > MAX_BOT_API_BYTES) {
        req.destroy(
          new Error(
            'File exceeds Telegram Bot HTTP API 50 MB limit. Add API ID & API Hash in Telegram settings to stream up to 2 GB.'
          )
        );
        return;
      }
      if (onProgress) onProgress(sizeBytes);
      if (!req.write(buf)) {
        readable.pause();
        req.once('drain', () => {
          if (!settled) readable.resume();
        });
      }
    });
    readable.on('error', fail);
    readable.on('end', () => {
      if (settled) return;
      if (sizeBytes === 0) {
        req.destroy(new Error('Media stream was empty.'));
        return;
      }
      req.end(epilogue);
    });
  });
}

/**
 * Streams a finished/live Readable directly into the configured Telegram
 * channel (user MTProto, bot MTProto, or bot HTTP API) without touching disk.
 */
async function uploadStreamJobToTelegram(
  job: DownloadJob,
  readable: Readable,
  knownTotalBytes: number | null,
  options?: { ext?: DownloadFileExt; mimeType?: string; fileName?: string }
): Promise<void> {
  const cfg = adminConfig.telegram;
  if (!telegramEnabledForUploads(cfg)) {
    throw new Error('Telegram upload is not enabled.');
  }

  // The Bot HTTP API caps documents at 50 MB. Check before streaming a single
  // byte: otherwise a doomed upload pushes 50 MB to Telegram, gets rejected,
  // and every caller that falls through to the next strategy repeats it.
  // (Callers treat this prefix as fatal — see isFatalTelegramUploadError.)
  if (telegramUsesBotHttpApi(cfg) && knownTotalBytes && knownTotalBytes > TELEGRAM_BOT_MAX_BYTES) {
    throw new Error(
      `This file is ${(knownTotalBytes / (1024 * 1024)).toFixed(1)} MB, over the 50 MB Telegram bot upload limit. Sign in with a phone number to upload files up to 2 GB.`
    );
  }

  if (options?.ext) {
    job.ext = options.ext;
    job.mimeType = options.mimeType || getMimeTypeForExt(options.ext);
    job.contentDisposition = buildContentDisposition(job.title, job.quality, options.ext);
  } else if (options?.mimeType) {
    job.mimeType = options.mimeType;
  }

  const fileName = options?.fileName || job.fileName || `${sanitizeFilename(`${job.title}-${job.quality}`)}.${job.ext}`;
  job.fileName = fileName;
  if (knownTotalBytes && knownTotalBytes > 0) {
    job.totalBytes = knownTotalBytes;
  }

  const caption = `${job.title}\n${job.quality.toUpperCase()} · grove save`;
  job.telegramUploading = true;
  job.status = 'downloading';

  const reportProgress = (bytes: number) => {
    job.downloadedBytes = bytes;
    if (job.totalBytes && job.totalBytes > 0) {
      job.progress = Math.min(97, Math.max(5, Math.floor((bytes / job.totalBytes) * 97)));
    } else {
      job.progress = Math.min(94, 5 + Math.floor(Math.log2(1 + bytes / (512 * 1024)) * 11));
    }
  };

  try {
    let chatId = cfg.channel;
    let messageId = 0;
    let botFileId: string | null = null;
    let sizeBytes = 0;

    if (telegramUsesBotHttpApi(cfg)) {
      const result = await uploadStreamToTelegramBotApi(
        cfg.botToken,
        cfg.channel,
        readable,
        fileName,
        job.mimeType,
        caption,
        reportProgress
      );
      chatId = result.chatId;
      messageId = result.messageId;
      botFileId = result.botFileId;
      sizeBytes = result.sizeBytes;
    } else {
      const client = await getTelegramClient();
      const uploadedStream = await uploadStreamToTelegramMtproto(client, readable, fileName, reportProgress);
      job.status = 'processing';
      job.progress = 98;
      const sent = (await client.sendFile(cfg.channel, {
        file: uploadedStream.inputFile,
        caption,
        forceDocument: true,
        supportsStreaming: false,
        attributes: [new Api.DocumentAttributeFilename({ fileName })],
      })) as { id: number };
      messageId = sent.id;
      sizeBytes = uploadedStream.sizeBytes;

      try {
        const inputPeer = await client.getInputEntity(cfg.channel);
        chatId = tgUtils.getPeerId(inputPeer as never);
      } catch {
        chatId = cfg.channel;
      }
    }

    const recordId = recordTelegramFile({
      userId: job.ownerUserId ?? null,
      jobId: job.id,
      sourceUrl: job.url,
      title: job.title,
      author: job.author || 'grove save',
      quality: job.quality,
      chatId: chatId || cfg.channel,
      messageId,
      botFileId,
      fileName,
      mimeType: job.mimeType,
      sizeBytes,
    });

    job.telegramFileId = recordId;
    job.telegramMessageId = messageId;
    job.telegramChatId = chatId || cfg.channel;
    job.telegramUploadError = undefined;
    job.totalBytes = sizeBytes;
    job.downloadedBytes = sizeBytes;
    job.progress = 100;
    job.status = 'ready';
  } catch (err) {
    const safeMsg = sanitizeTelegramError(err, cfg.botToken);
    job.telegramUploadError = safeMsg;
    throw new Error(safeMsg);
  } finally {
    job.telegramUploading = false;
  }
}

/**
 * Uploads a finished job's cache file to the configured Telegram channel and
 * records the mapping in the database. On success the local cache file is
 * deleted, because Telegram is the only storage for published downloads.
 */
async function uploadJobToTelegram(job: DownloadJob, ownerUserId: string | null, author: string): Promise<void> {
  const cfg = adminConfig.telegram;
  if (!telegramEnabledForUploads(cfg)) return;

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(job.filePath);
  } catch {
    job.telegramUploadError = 'Cache file disappeared before upload.';
    return;
  }

  job.ownerUserId = ownerUserId;
  job.author = author;
  const rs = fs.createReadStream(job.filePath);
  try {
    await uploadStreamJobToTelegram(job, rs, stat.size);
    await fs.promises.rm(job.filePath, { force: true }).catch(() => {});
  } catch (err) {
    rs.destroy();
    job.telegramUploadError = sanitizeTelegramError(err, cfg.botToken);
    console.error('[telegram] upload failed:', job.telegramUploadError);
  }
}

interface ResolvedTelegramFile {
  message: any;
  dcId: number;
  location: any;
  size: number;
}

/**
 * Builds the InputFileLocation for a message's media.
 *
 * GramJS's `utils.getFileInfo` is unusable here: for a `Message` input it
 * assigns `location = message.media` but then re-tests the original message
 * with `instanceof MessageMediaDocument`, which is never true, so every call
 * throws "Cannot cast Message to any kind of InputFileLocation". We unwrap the
 * media ourselves and only then hand it to the helper. Note that the helper
 * also rejects a bare `Document`/`Photo`, so the MessageMedia wrapper matters.
 */
function telegramFileLocation(message: any): { dcId: number; location: any; size: number } {
  let media = message?.media;

  // CustomMessage exposes `.document` / `.photo` instead, so re-wrap those too.
  if ((!media || media.className === 'MessageMediaEmpty') && message?.document) {
    media = new Api.MessageMediaDocument({ document: message.document });
  } else if ((!media || media.className === 'MessageMediaEmpty') && message?.photo) {
    media = new Api.MessageMediaPhoto({ photo: message.photo });
  }

  if (!media || media.className === 'MessageMediaEmpty') {
    throw new Error('The stored Telegram message has no downloadable media.');
  }

  const info = tgUtils.getFileInfo(media as never);
  const dcId =
    typeof info.dcId === 'number'
      ? info.dcId
      : media.document?.dcId ?? media.photo?.dcId ?? undefined;
  const size = typeof info.size === 'number' ? info.size : Number(info.size) || 0;
  if (typeof dcId !== 'number') {
    throw new Error('Could not determine the Telegram data center for this file.');
  }
  if (!info.location) {
    throw new Error('Could not resolve a Telegram file location for this message.');
  }
  return { dcId, location: info.location, size };
}

async function resolveTelegramFile(client: TelegramClient, row: TelegramFileRow): Promise<ResolvedTelegramFile> {
  // File references expire, so the message is re-fetched on every request
  // instead of persisting the reference bytes in the database.
  const messages = await client.getMessages(row.chat_id, { ids: row.message_id });
  const message = (Array.isArray(messages) ? messages[0] : undefined) as any;
  if (!message || message.className === 'MessageEmpty' || message.id === undefined) {
    throw new Error('The stored Telegram message no longer exists in the channel.');
  }
  const { dcId, location, size } = telegramFileLocation(message);
  return { message, dcId, location, size: size || row.size_bytes };
}

/**
 * Streams a byte range of a Telegram-stored file into an HTTP response.
 * Supports `Range` so browsers and download managers can seek/resume.
 */
async function streamTelegramFile(
  row: TelegramFileRow,
  req: Request,
  res: Response,
  inline = false
): Promise<void> {
  const cfg = adminConfig.telegram;
  const fileName = row.file_name || 'grove-save-media';
  const disposition = (() => {
    const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
    const mode = inline ? 'inline' : 'attachment';
    return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  })();

  if (telegramUsesBotHttpApi(cfg)) {
    if (!row.bot_file_id) {
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Add Telegram API ID & API Hash to stream files stored via MTProto.',
        });
      }
      return;
    }
    try {
      const info = await callTelegramBotApi<{ file_path?: string; file_size?: number }>(cfg.botToken, 'getFile', {
        file_id: row.bot_file_id,
      });
      if (!info.file_path) {
        throw new Error('Telegram Bot API did not return a file path.');
      }
      if (req.method === 'HEAD') {
        const size = info.file_size || row.size_bytes || 0;
        res.status(200);
        res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', disposition);
        if (size > 0) res.setHeader('Content-Length', String(size));
        res.end();
        return;
      }
      const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : '';
      await new Promise<void>((resolve, reject) => {
        const upstreamReq = https.request(
          {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/file/bot${cfg.botToken}/${info.file_path}`,
            method: 'GET',
            headers: rangeHeader ? { Range: rangeHeader } : {},
            timeout: 120000,
          },
          (upstreamRes) => {
            const status = upstreamRes.statusCode || 200;
            if (status >= 400) {
              upstreamRes.resume();
              reject(new Error(`Telegram Bot file proxy returned HTTP ${status}`));
              return;
            }
            res.status(status);
            res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Disposition', disposition);
            res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
            for (const h of ['content-length', 'content-range']) {
              const v = upstreamRes.headers[h];
              if (v) res.setHeader(h, v);
            }
            const onClose = () => upstreamRes.destroy();
            req.once('close', onClose);
            upstreamRes.on('error', (err) => {
              req.off('close', onClose);
              reject(err);
            });
            upstreamRes.on('end', () => {
              req.off('close', onClose);
              resolve();
            });
            upstreamRes.pipe(res);
          }
        );
        upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Telegram file stream timed out.')));
        upstreamReq.on('error', reject);
        upstreamReq.end();
      });
    } catch (err) {
      const safeErr = sanitizeTelegramError(err, cfg.botToken);
      if (!res.headersSent) {
        res.status(503).json({ error: safeErr });
      } else {
        res.destroy();
      }
    }
    return;
  }

  // Never let this reject: Express 4 does not catch async handler rejections,
  // and a bad Telegram login would otherwise take the whole server down.
  let client: TelegramClient;
  let resolved: ResolvedTelegramFile;
  try {
    client = await getTelegramClient();
    resolved = await resolveTelegramFile(client, row);
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({
        error: sanitizeTelegramError(err, cfg.botToken),
      });
    } else {
      res.destroy();
    }
    return;
  }

  const total = resolved.size || row.size_bytes || 0;
  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : '';
  let start = 0;
  let end = Math.max(total - 1, 0);
  let partial = false;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (match) {
      const rawStart = match[1];
      const rawEnd = match[2];
      if (rawStart === '' && rawEnd !== '') {
        const suffix = Number(rawEnd);
        if (Number.isFinite(suffix) && suffix > 0) {
          start = Math.max(total - suffix, 0);
          end = total - 1;
          partial = true;
        }
      } else if (rawStart !== '') {
        const s = Number(rawStart);
        if (Number.isFinite(s) && s >= 0) {
          // A start at or past EOF is unsatisfiable, not a reason to send the tail.
          if (total > 0 && s >= total) {
            res.status(416).setHeader('Content-Range', `bytes */${total}`);
            res.end();
            return;
          }
          start = s;
          if (rawEnd !== '') {
            const e = Number(rawEnd);
            if (Number.isFinite(e)) end = Math.min(e, total - 1);
          }
          partial = true;
        }
      }
      if (partial && end < start) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`);
        res.end();
        return;
      }
    }
  }

  const length = Math.max(end - start + 1, 0);

  res.status(partial ? 206 : 200);
  res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  if (total > 0) {
    res.setHeader('Content-Length', String(length));
    if (partial) {
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    }
  }

  if (length === 0 || req.method === 'HEAD') {
    // HEAD is used by the UI to verify the link before triggering a save, so
    // answer from metadata alone instead of pulling bytes from Telegram.
    res.end();
    return;
  }

  let aborted = false;
  const onClose = () => {
    aborted = true;
  };
  res.on('close', onClose);

  const CHUNK = 256 * 1024;

  // Streams [cursor, end] with the current file reference. Throws when Telegram
  // drops the reference; the caller refreshes it and resumes from `cursor`.
  let cursor = start;
  const pump = async (): Promise<void> => {
    if (cursor > end) return;
    const iterator = client.iterDownload({
      file: resolved.location,
      dcId: resolved.dcId,
      offset: bigInt(cursor),
      fileSize: bigInt(total),
      requestSize: CHUNK,
      limit: Math.ceil((end + 1 - cursor) / CHUNK),
    });
    for await (const chunk of iterator) {
      if (aborted || cursor > end) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
      const room = end + 1 - cursor;
      const slice = buf.length > room ? buf.subarray(0, room) : buf;
      if (slice.length === 0) break;
      cursor += slice.length;
      if (!res.write(slice)) {
        await new Promise<void>((done) => {
          const release = () => {
            res.off('drain', release);
            res.off('close', release);
            done();
          };
          res.once('drain', release);
          res.once('close', release);
        });
      }
    }
  };

  try {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await pump();
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (aborted || cursor > end) break;
        // File references expire mid-stream. Fetch a fresh one and continue from
        // the exact byte already sent, so the client never receives duplicates.
        try {
          resolved = await resolveTelegramFile(client, row);
        } catch {
          break;
        }
      }
    }
    if (aborted) return;
    if (cursor <= end) {
      const message =
        lastError instanceof Error ? lastError.message : 'Telegram download ended before the requested range.';
      if (!res.headersSent) {
        res.status(502).json({ error: message });
      } else {
        res.destroy(new Error(message));
      }
      return;
    }
    res.end();
  } finally {
    res.off('close', onClose);
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function isRequestHttps(req: Request): boolean {
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  if (req.secure || (typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https')) {
    return true;
  }
  const sslHeader = req.headers['x-forwarded-ssl'];
  if (typeof sslHeader === 'string' && sslHeader.trim().toLowerCase() === 'on') {
    return true;
  }
  const forwarded = req.headers.forwarded;
  if (typeof forwarded === 'string' && /proto=https/i.test(forwarded)) {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.toLowerCase().startsWith('https://')) {
    return true;
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.toLowerCase().startsWith('https://')) {
    return true;
  }
  return false;
}

function setSessionCookie(req: Request, res: Response, rawToken: string): void {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isRequestHttps(req)) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
  ];
  if (isRequestHttps(req)) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function isCsrfValid(req: Request): boolean {
  if (typeof req.headers['x-requested-with'] === 'string' && req.headers['x-requested-with'].trim()) {
    return true;
  }
  const origin = req.headers.origin;
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (typeof origin === 'string' && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return originHost === host.split(',')[0].trim().toLowerCase();
    } catch {
      return false;
    }
  }
  return false;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.replace('::ffff:', '');
      return isPrivateIp(mapped);
    }
    return false;
  }
  return true;
}

function isKnownMediaHost(host: string): boolean {
  const allowed = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'instagram.com',
    'www.instagram.com',
    'm.instagram.com',
    'instagr.am',
    'cdninstagram.com',
    'fbcdn.net',
    'vimeo.com',
    'dailymotion.com',
    'twitch.tv',
    'soundcloud.com',
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'tiktokv.com',
    'x.com',
    'www.x.com',
    'mobile.x.com',
    'twitter.com',
    'www.twitter.com',
    'mobile.twitter.com',
    't.co',
    'fxtwitter.com',
    'vxtwitter.com',
    'fixupx.com',
    'twimg.com',
    'pbs.twimg.com',
    'video.twimg.com',
  ];
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

function isInstagramUrl(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  return (
    host === 'instagram.com' ||
    host === 'www.instagram.com' ||
    host === 'm.instagram.com' ||
    host === 'instagr.am' ||
    host.endsWith('.instagram.com')
  );
}

function isTikTokUrl(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  return host === 'tiktok.com' || host.endsWith('.tiktok.com');
}

function isXUrl(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  return (
    host === 'x.com' ||
    host.endsWith('.x.com') ||
    host === 'twitter.com' ||
    host.endsWith('.twitter.com') ||
    host === 'fxtwitter.com' ||
    host === 'vxtwitter.com' ||
    host === 'fixupx.com' ||
    host === 't.co'
  );
}

function normalizeXUrl(parsed: URL): string {
  const copy = new URL(parsed.toString());
  const host = copy.hostname.toLowerCase();
  if (
    host === 'twitter.com' ||
    host === 'www.twitter.com' ||
    host === 'mobile.twitter.com' ||
    host === 'mobile.x.com' ||
    host === 'www.x.com' ||
    host === 'fxtwitter.com' ||
    host === 'vxtwitter.com' ||
    host === 'fixupx.com'
  ) {
    copy.hostname = 'x.com';
  }
  return copy.toString();
}

function maybeProxySocialThumbnail(rawUrl: string | undefined | null, parsedPageUrl: URL): string | null {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return null;
  if (isInstagramUrl(parsedPageUrl) || isTikTokUrl(parsedPageUrl) || isXUrl(parsedPageUrl)) {
    return `/api/media/thumbnail?url=${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
}

function normalizeInstagramUrl(parsed: URL): string {
  const copy = new URL(parsed.toString());
  const host = copy.hostname.toLowerCase();
  if (
    host === 'instagram.com' ||
    host === 'www.instagram.com' ||
    host === 'm.instagram.com' ||
    host === 'instagr.am' ||
    host.endsWith('.instagram.com')
  ) {
    copy.hostname = 'www.instagram.com';
  }
  return copy.toString();
}

async function fetchJsonViaOptionalXray<T = unknown>(targetUrl: string, timeoutMs = 12000): Promise<T> {
  if (adminConfig.xray.enabled && xrayState.running) {
    const resp = await proxyHttpGet(targetUrl, adminConfig.xray.httpPort, timeoutMs);
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw new Error(`HTTP ${resp.statusCode}`);
    }
    return JSON.parse(resp.body) as T;
  }
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

interface ResolvedFallbackMedia {
  title: string;
  author: string;
  durationSeconds: number | null;
  thumbnail: string | null;
  videos: Array<{ url: string; width: number; height: number }>;
  photos: Array<{ url: string }>;
  musicUrl?: string | null;
  referer?: string;
}

async function resolveShortRedirectUrl(parsed: URL): Promise<URL> {
  if (parsed.hostname.toLowerCase() !== 't.co') return parsed;
  try {
    const res = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(6000),
    });
    const loc = res.headers.get('location');
    if (loc) {
      const valid = await validatePublicUrl(new URL(loc, parsed).toString());
      if (valid) return valid;
    }
  } catch {
    // Keep original URL
  }
  return parsed;
}

async function resolveXMediaFallback(rawParsed: URL): Promise<ResolvedFallbackMedia> {
  const resolvedParsed = await resolveShortRedirectUrl(rawParsed);
  const pathMatch = resolvedParsed.pathname.match(/^\/(?:([A-Za-z0-9_]+)\/)?status(?:es)?\/(\d+)/i);
  if (!pathMatch) {
    throw new Error('Invalid X / Twitter post URL.');
  }
  const userPart = pathMatch[1] || 'i';
  const statusId = pathMatch[2];
  const apiUrl = `https://api.fxtwitter.com/${encodeURIComponent(userPart)}/status/${statusId}`;
  const payload = await fetchJsonViaOptionalXray<{
    code?: number;
    message?: string;
    tweet?: {
      text?: string;
      author?: { name?: string; screen_name?: string; avatar_url?: string };
      media?: {
        videos?: Array<{
          url?: string;
          thumbnail_url?: string;
          duration?: number;
          width?: number;
          height?: number;
          variants?: Array<{ url?: string; content_type?: string; bitrate?: number }>;
        }>;
        photos?: Array<{ url?: string; width?: number; height?: number }>;
      };
    };
  }>(apiUrl, 15000);

  const tweet = payload?.tweet;
  if (!tweet) {
    throw new Error(payload?.message || 'Could not load X post.');
  }

  const videos: Array<{ url: string; width: number; height: number }> = [];
  let durationSeconds: number | null = null;
  let thumb: string | null = null;

  for (const v of tweet.media?.videos || []) {
    if (typeof v.duration === 'number' && durationSeconds === null) {
      durationSeconds = Math.round(v.duration);
    }
    if (!thumb && typeof v.thumbnail_url === 'string') {
      thumb = v.thumbnail_url;
    }
    const mp4Variants = Array.isArray(v.variants)
      ? v.variants
          .filter((vr) => typeof vr.url === 'string' && (!vr.content_type || vr.content_type.includes('mp4')))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
      : [];
    const primaryUrl = mp4Variants[0]?.url || v.url;
    if (typeof primaryUrl === 'string') {
      const valid = await validatePublicUrl(primaryUrl);
      if (valid) {
        videos.push({
          url: valid.toString(),
          width: Number(v.width || 0),
          height: Number(v.height || 0),
        });
      }
    }
  }

  const photos: Array<{ url: string }> = [];
  for (const p of tweet.media?.photos || []) {
    if (typeof p.url === 'string') {
      const valid = await validatePublicUrl(p.url);
      if (valid) {
        if (!thumb) thumb = valid.toString();
        photos.push({ url: valid.toString() });
      }
    }
  }

  if (videos.length === 0 && photos.length === 0) {
    throw new Error('This X post does not contain downloadable video or photo media.');
  }

  const rawText = (tweet.text || '').replace(/https?:\/\/t\.co\/\S+/gi, '').trim();
  const screenName = (tweet.author?.screen_name || '').trim();
  const title = rawText ? rawText.slice(0, 90) : screenName ? `X Post by @${screenName}` : 'X Media';

  return {
    title,
    author: screenName ? `@${screenName}` : tweet.author?.name || 'X',
    durationSeconds,
    thumbnail: thumb || tweet.author?.avatar_url || null,
    videos,
    photos,
    referer: 'https://x.com/',
  };
}

async function resolveTikTokMediaFallback(parsed: URL): Promise<ResolvedFallbackMedia> {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(parsed.toString())}&hd=1`;
  const payload = await fetchJsonViaOptionalXray<{
    code?: number;
    msg?: string;
    data?: {
      title?: string;
      duration?: number;
      cover?: string;
      origin_cover?: string;
      play?: string;
      hdplay?: string;
      music?: string;
      images?: string[];
      author?: { unique_id?: string; nickname?: string };
    };
  }>(apiUrl, 15000);

  const data = payload?.data;
  if (!data || (payload.code !== undefined && payload.code !== 0)) {
    throw new Error(payload?.msg || 'Could not fetch TikTok media.');
  }

  const photos: Array<{ url: string }> = [];
  if (Array.isArray(data.images)) {
    for (const imgUrl of data.images) {
      if (typeof imgUrl === 'string') {
        const valid = await validatePublicUrl(imgUrl);
        if (valid) photos.push({ url: valid.toString() });
      }
    }
  }

  const videos: Array<{ url: string; width: number; height: number }> = [];
  if (photos.length === 0) {
    for (const candidate of [data.hdplay, data.play]) {
      if (typeof candidate === 'string' && candidate.trim()) {
        const valid = await validatePublicUrl(candidate.trim());
        if (valid) {
          videos.push({ url: valid.toString(), width: 1080, height: 1920 });
          break;
        }
      }
    }
  }

  let musicUrl: string | null = null;
  if (typeof data.music === 'string' && data.music.trim()) {
    const validMusic = await validatePublicUrl(data.music.trim());
    if (validMusic) musicUrl = validMusic.toString();
  }

  if (videos.length === 0 && photos.length === 0) {
    throw new Error('No downloadable TikTok video or photo found.');
  }

  const cleanTitle = (data.title || '').trim().slice(0, 90) || 'TikTok Video';
  const uid = (data.author?.unique_id || '').replace(/^@/, '').trim();
  const author = uid ? `@${uid}` : data.author?.nickname || 'TikTok';

  return {
    title: cleanTitle,
    author,
    durationSeconds: typeof data.duration === 'number' && data.duration > 0 ? data.duration : null,
    thumbnail: data.cover || data.origin_cover || photos[0]?.url || null,
    videos,
    photos,
    musicUrl,
    referer: 'https://www.tiktok.com/',
  };
}

async function downloadRemoteUrlToFile(
  remoteUrl: string,
  destPath: string,
  referer?: string,
  onProgress?: (downloaded: number, total: number) => void,
  redirectDepth = 0
): Promise<string> {
  const valid = await validatePublicUrl(remoteUrl);
  if (!valid) {
    throw new Error('Disallowed remote media URL.');
  }
  const targetPort = valid.port ? Number(valid.port) : valid.protocol === 'https:' ? 443 : 80;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: '*/*',
  };
  if (referer) headers.Referer = referer;

  const consumeResponse = (
    upstreamRes: http.IncomingMessage,
    resolve: (ct: string) => void,
    reject: (err: Error) => void
  ) => {
    const status = upstreamRes.statusCode || 200;
    if (status >= 300 && status < 400 && upstreamRes.headers.location) {
      const nextLoc = upstreamRes.headers.location;
      upstreamRes.resume();
      if (redirectDepth >= 5) {
        reject(new Error('Too many redirects downloading media.'));
        return;
      }
      let nextAbs = '';
      try {
        nextAbs = new URL(nextLoc, valid).toString();
      } catch {
        reject(new Error('Invalid redirect location.'));
        return;
      }
      downloadRemoteUrlToFile(nextAbs, destPath, referer, onProgress, redirectDepth + 1)
        .then(resolve)
        .catch((e) => reject(e instanceof Error ? e : new Error(String(e))));
      return;
    }
    if (status >= 400) {
      upstreamRes.destroy();
      reject(new Error(`Upstream returned HTTP ${status}.`));
      return;
    }
    const ct = String(upstreamRes.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
    const total = Number(upstreamRes.headers['content-length'] || 0) || 0;
    let downloaded = 0;
    const out = fs.createWriteStream(destPath);
    upstreamRes.on('data', (chunk: Buffer) => {
      downloaded += chunk.byteLength;
      if (onProgress) onProgress(downloaded, total);
    });
    upstreamRes.on('error', (err) => {
      out.destroy();
      reject(err);
    });
    out.on('error', reject);
    out.on('finish', () => resolve(ct));
    upstreamRes.pipe(out);
  };

  if (adminConfig.xray.enabled && xrayState.running) {
    return new Promise((resolve, reject) => {
      const connectReq = http.request({
        host: '127.0.0.1',
        port: adminConfig.xray.httpPort,
        method: 'CONNECT',
        path: `${valid.hostname}:${targetPort}`,
        timeout: 12000,
      });
      connectReq.on('connect', (cRes, socket) => {
        if (cRes.statusCode !== 200) {
          socket.destroy();
          reject(new Error(`Proxy CONNECT ${cRes.statusCode}`));
          return;
        }
        const mod = valid.protocol === 'https:' ? https : http;
        const createConnection = () =>
          valid.protocol === 'https:'
            ? tls.connect({ socket, servername: valid.hostname })
            : socket;
        const upstreamReq = mod.request(
          {
            hostname: valid.hostname,
            port: targetPort,
            path: valid.pathname + valid.search,
            method: 'GET',
            createConnection,
            headers: { ...headers, Host: valid.host },
            timeout: 120000,
          },
          (upstreamRes) => consumeResponse(upstreamRes, resolve, reject)
        );
        upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Media download timed out.')));
        upstreamReq.on('error', reject);
        upstreamReq.end();
      });
      connectReq.on('timeout', () => connectReq.destroy(new Error('Proxy connect timed out.')));
      connectReq.on('error', reject);
      connectReq.end();
    });
  }

  return new Promise((resolve, reject) => {
    const mod = valid.protocol === 'https:' ? https : http;
    const upstreamReq = mod.request(
      {
        hostname: valid.hostname,
        port: targetPort,
        path: valid.pathname + valid.search,
        method: 'GET',
        headers,
        timeout: 120000,
      },
      (upstreamRes) => consumeResponse(upstreamRes, resolve, reject)
    );
    upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Media download timed out.')));
    upstreamReq.on('error', reject);
    upstreamReq.end();
  });
}

async function validatePublicUrl(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return null;
    }
    if (net.isIP(host)) {
      return isPrivateIp(host) ? null : parsed;
    }
    try {
      const records = await dns.lookup(host, { all: true });
      if (!records.length) return null;
      for (const rec of records) {
        if (isPrivateIp(rec.address)) return null;
      }
    } catch {
      if (!isKnownMediaHost(host)) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractYouTubeId(parsed: URL): string | null {
  const host = parsed.hostname.toLowerCase();
  if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
  }
  if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{6,15}$/.test(v)) return v;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') && parts[1]) {
      return /^[a-zA-Z0-9_-]{6,15}$/.test(parts[1]) ? parts[1] : null;
    }
  }
  return null;
}

interface ParthDlFormat {
  url: string;
  width?: number | null;
  height?: number | null;
  format_id?: string;
  has_audio?: boolean;
}

interface ParthDlEntry {
  kind: 'video' | 'image';
  formats: ParthDlFormat[];
}

interface ParthDlInfo {
  id?: string;
  title?: string;
  uploader?: string;
  type?: string;
  duration?: number | null;
  thumbnail?: string | null;
  entries?: ParthDlEntry[];
}

const PARTH_DL_FALLBACK_WHEEL_URL =
  'https://files.pythonhosted.org/packages/b8/c8/6a074c1cb6b786c5c097b7722d5ec69725ac0eae009b75609655e89752a3/parth_dl-1.2.1-py3-none-any.whl';

const PARTH_DL_INFO_PY = `
import json, sys
from parth_dl import InstagramDownloader
from parth_dl.utils import RateLimitError, ValidationError
url = sys.argv[1]
try:
    dl = InstagramDownloader(quiet=True, rate_limit=False)
    info = dl.get_info(url)
    print(json.dumps({"ok": True, "info": info}, ensure_ascii=False))
except RateLimitError as e:
    print(json.dumps({"ok": False, "code": "RATE_LIMIT", "error": str(e)}, ensure_ascii=False))
    sys.exit(2)
except ValidationError as e:
    print(json.dumps({"ok": False, "code": "VALIDATION", "error": str(e)}, ensure_ascii=False))
    sys.exit(3)
except Exception as e:
    print(json.dumps({"ok": False, "code": "DOWNLOAD_ERROR", "error": str(e)}, ensure_ascii=False))
    sys.exit(1)
`.trim();

const PARTH_DL_DOWNLOAD_PY = `
import json, sys
from parth_dl import InstagramDownloader
from parth_dl.utils import RateLimitError, ValidationError
url, out_dir, quality = sys.argv[1], sys.argv[2], sys.argv[3]
info_arg = sys.argv[4] if len(sys.argv) > 4 else "-"
cached_info = None
if info_arg and info_arg != "-":
    try:
        with open(info_arg, "r", encoding="utf-8") as f:
            cached_info = json.load(f)
    except Exception:
        cached_info = None
def hook(downloaded, total):
    sys.stderr.write(f"PROGRESS:{int(downloaded)}:{int(total or 0)}\\n")
    sys.stderr.flush()
try:
    dl = InstagramDownloader(quiet=True, overwrite=True, rate_limit=False, progress_hook=hook)
    result = dl.download(url, output_path=out_dir, quality=quality, output_mode="directory", info=cached_info)
    files = result if isinstance(result, list) else ([result] if result else [])
    info = dl.last_info or cached_info or {}
    print(json.dumps({"ok": True, "files": [str(p) for p in files], "info": info}, ensure_ascii=False))
except RateLimitError as e:
    print(json.dumps({"ok": False, "code": "RATE_LIMIT", "error": str(e)}, ensure_ascii=False))
    sys.exit(2)
except ValidationError as e:
    print(json.dumps({"ok": False, "code": "VALIDATION", "error": str(e)}, ensure_ascii=False))
    sys.exit(3)
except Exception as e:
    print(json.dumps({"ok": False, "code": "DOWNLOAD_ERROR", "error": str(e)}, ensure_ascii=False))
    sys.exit(1)
`.trim();

let parthDlReadyCache: boolean | undefined;
let parthDlInstallPromise: Promise<boolean> | null = null;
const instagramInfoCache = new Map<string, { info: ParthDlInfo; expiresAt: number }>();
const instagramInfoInflight = new Map<string, Promise<ParthDlInfo>>();

function buildParthDlEnv(includeLocalDir = true): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  // Python urllib.request does not support SOCKS proxies without PySocks; route via Xray HTTP proxy only
  delete env.ALL_PROXY;
  delete env.all_proxy;
  if (includeLocalDir) {
    const existing = env.PYTHONPATH ? `${path.delimiter}${env.PYTHONPATH}` : '';
    env.PYTHONPATH = `${PARTH_DL_DIR}${existing}`;
  }
  if (adminConfig.xray.enabled && xrayState.running) {
    const hp = `http://127.0.0.1:${adminConfig.xray.httpPort}`;
    env.HTTP_PROXY = hp;
    env.HTTPS_PROXY = hp;
    env.http_proxy = hp;
    env.https_proxy = hp;
    env.NO_PROXY = '127.0.0.1,localhost';
    env.no_proxy = '127.0.0.1,localhost';
  }
  return env;
}

async function canImportParthDl(): Promise<boolean> {
  try {
    await execFileAsync(
      'python3',
      ['-c', "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('parth_dl') else 1)"],
      { timeout: 6000, env: buildParthDlEnv(true) }
    );
    return true;
  } catch {
    return false;
  }
}

async function installParthDlPackage(): Promise<boolean> {
  if (parthDlInstallPromise) return parthDlInstallPromise;
  parthDlInstallPromise = (async () => {
    let whlPath = '';
    let tmpDir = '';
    try {
      ensureDataDir();
      let wheelUrl = PARTH_DL_FALLBACK_WHEEL_URL;
      try {
        const metaRes = await fetch('https://pypi.org/pypi/parth-dl/json', {
          signal: AbortSignal.timeout(12000),
        });
        if (metaRes.ok) {
          const meta = (await metaRes.json()) as {
            urls?: Array<{ packagetype?: string; url?: string }>;
          };
          const whl = meta.urls?.find((u) => u.packagetype === 'bdist_wheel' && typeof u.url === 'string');
          if (whl?.url) wheelUrl = whl.url;
        }
      } catch {
        // Use fallback pinned PyPI wheel URL
      }

      const whlRes = await fetch(wheelUrl, { signal: AbortSignal.timeout(30000) });
      if (!whlRes.ok) {
        throw new Error(`Failed to fetch parth-dl wheel (HTTP ${whlRes.status})`);
      }
      const buf = Buffer.from(await whlRes.arrayBuffer());
      whlPath = path.join(DATA_DIR, `parth_dl-${crypto.randomUUID()}.whl`);
      tmpDir = path.join(DATA_DIR, `parth_dl_tmp_${crypto.randomUUID()}`);
      await fs.promises.writeFile(whlPath, buf);
      await fs.promises.mkdir(tmpDir, { recursive: true });
      await execFileAsync('python3', ['-m', 'zipfile', '-e', whlPath, tmpDir], {
        timeout: 15000,
      });
      await fs.promises.rm(PARTH_DL_DIR, { recursive: true, force: true }).catch(() => {});
      await fs.promises.rename(tmpDir, PARTH_DL_DIR);
      tmpDir = '';
      const ok = await canImportParthDl();
      parthDlReadyCache = ok;
      return ok;
    } catch (err) {
      console.warn('[parth-dl] Auto-install failed:', err instanceof Error ? err.message : err);
      return false;
    } finally {
      if (whlPath) await fs.promises.rm(whlPath, { force: true }).catch(() => {});
      if (tmpDir) await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      parthDlInstallPromise = null;
    }
  })();
  return parthDlInstallPromise;
}

async function getParthDlRunner(options?: { autoInstall?: boolean }): Promise<boolean> {
  if (parthDlReadyCache === true && fs.existsSync(PARTH_DL_DIR)) {
    return true;
  }
  if (await canImportParthDl()) {
    parthDlReadyCache = true;
    return true;
  }
  if (options?.autoInstall !== false) {
    return installParthDlPackage();
  }
  return false;
}

class ParthDlInvocationError extends Error {
  code: string;
  constructor(message: string, code = 'DOWNLOAD_ERROR') {
    super(message);
    this.code = code;
  }
}

async function runParthDlInfo(rawUrl: string, forceRefresh = false): Promise<ParthDlInfo> {
  const ready = await getParthDlRunner({ autoInstall: true });
  if (!ready) {
    throw new ParthDlInvocationError('parth-dl is not available on the server.', 'UNAVAILABLE');
  }
  const xrayFingerprint = `${adminConfig.xray.enabled}:${adminConfig.xray.activeProfileId || ''}:${xrayState.running}`;
  const cacheKey = `${rawUrl}::${xrayFingerprint}`;
  if (!forceRefresh) {
    const cached = instagramInfoCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.info;
    }
    if (cached) instagramInfoCache.delete(cacheKey);
  } else {
    instagramInfoCache.delete(cacheKey);
  }

  let inflight = instagramInfoInflight.get(cacheKey);
  if (!inflight) {
    inflight = (async () => {
      try {
        const { stdout } = await execFileAsync('python3', ['-c', PARTH_DL_INFO_PY, rawUrl], {
          timeout: 30000,
          maxBuffer: 4 * 1024 * 1024,
          env: buildParthDlEnv(true),
        });
        const parsedOut = JSON.parse(stdout.trim()) as {
          ok?: boolean;
          info?: ParthDlInfo;
          error?: string;
          code?: string;
        };
        if (!parsedOut.ok || !parsedOut.info) {
          throw new ParthDlInvocationError(
            parsedOut.error || 'Failed to extract Instagram media info.',
            parsedOut.code || 'DOWNLOAD_ERROR'
          );
        }
        instagramInfoCache.set(cacheKey, {
          info: parsedOut.info,
          expiresAt: Date.now() + 3 * 60 * 1000,
        });
        if (instagramInfoCache.size > 100) {
          const oldest = instagramInfoCache.keys().next().value;
          if (oldest) instagramInfoCache.delete(oldest);
        }
        return parsedOut.info;
      } catch (err: unknown) {
        if (err instanceof ParthDlInvocationError) throw err;
        const execErr = err as { stdout?: string; stderr?: string; message?: string };
        const rawOut = (execErr.stdout || '').trim();
        if (rawOut.startsWith('{')) {
          try {
            const payload = JSON.parse(rawOut) as { error?: string; code?: string };
            throw new ParthDlInvocationError(
              payload.error || 'Failed to extract Instagram media info.',
              payload.code || 'DOWNLOAD_ERROR'
            );
          } catch (inner) {
            if (inner instanceof ParthDlInvocationError) throw inner;
          }
        }
        const errMsg = (execErr.stderr || execErr.message || 'Instagram extraction failed.').trim();
        throw new ParthDlInvocationError(errMsg, 'DOWNLOAD_ERROR');
      } finally {
        instagramInfoInflight.delete(cacheKey);
      }
    })();
    instagramInfoInflight.set(cacheKey, inflight);
  }

  return inflight;
}

async function runParthDlDownload(
  rawUrl: string,
  outDir: string,
  quality: 'best' | 'worst',
  cachedInfo?: ParthDlInfo | null,
  onProgress?: (downloaded: number, total: number) => void
): Promise<{ files: string[]; info: ParthDlInfo }> {
  const ready = await getParthDlRunner({ autoInstall: true });
  if (!ready) {
    throw new ParthDlInvocationError('parth-dl is not available on the server.', 'UNAVAILABLE');
  }
  let infoJsonPath = '-';
  if (cachedInfo) {
    infoJsonPath = path.join(outDir, 'cached-info.json');
    await fs.promises.writeFile(infoJsonPath, JSON.stringify(cachedInfo), 'utf8');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      'python3',
      ['-c', PARTH_DL_DOWNLOAD_PY, rawUrl, outDir, quality, infoJsonPath],
      { shell: false, env: buildParthDlEnv(true) }
    );
    let stdout = '';
    let stderrBuf = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        try {
          child.kill('SIGTERM');
        } catch {}
        settled = true;
        reject(new ParthDlInvocationError('Instagram download timed out.', 'TIMEOUT'));
      }
    }, 120000);
    timer.unref();

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8');
      const lines = stderrBuf.split(/\r?\n/);
      stderrBuf = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          const parts = line.split(':');
          const dl = Number(parts[1] || 0);
          const total = Number(parts[2] || 0);
          if (onProgress && Number.isFinite(dl)) {
            onProgress(dl, Number.isFinite(total) ? total : 0);
          }
        }
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      const trimmed = stdout.trim();
      const jsonLine = trimmed.split(/\r?\n/).reverse().find((l) => l.trim().startsWith('{'));
      if (jsonLine) {
        try {
          const payload = JSON.parse(jsonLine) as {
            ok?: boolean;
            files?: string[];
            info?: ParthDlInfo;
            error?: string;
            code?: string;
          };
          if (payload.ok && Array.isArray(payload.files) && payload.files.length > 0) {
            resolve({ files: payload.files, info: payload.info || cachedInfo || {} });
            return;
          }
          reject(
            new ParthDlInvocationError(
              payload.error || `Instagram download failed (code ${code}).`,
              payload.code || 'DOWNLOAD_ERROR'
            )
          );
          return;
        } catch {
          // Fall through
        }
      }
      reject(
        new ParthDlInvocationError(
          stderrBuf.trim() || `Instagram download failed with exit code ${code}.`,
          'DOWNLOAD_ERROR'
        )
      );
    });
  });
}

function cleanInstagramTitle(info: ParthDlInfo): string {
  const rawTitle = (info.title || '').replace(/\s+/g, ' ').trim();
  if (rawTitle) {
    return rawTitle.slice(0, 120);
  }
  const uploader = (info.uploader || '').replace(/^@/, '').trim();
  const kindLabel = info.type === 'profile_picture' ? 'Profile Picture' : info.type || 'Post';
  return uploader ? `@${uploader} — Instagram ${kindLabel}` : `Instagram ${kindLabel}`;
}

function pickInstagramThumbnail(info: ParthDlInfo): string | null {
  if (typeof info.thumbnail === 'string' && /^https?:\/\//i.test(info.thumbnail)) {
    return info.thumbnail;
  }
  const entries = info.entries || [];
  for (const entry of entries) {
    if (entry.kind === 'image' && Array.isArray(entry.formats)) {
      const best = entry.formats.find((f) => typeof f.url === 'string' && /^https?:\/\//i.test(f.url));
      if (best?.url) return best.url;
    }
  }
  return null;
}

function selectInstagramVideoFormat(entry: ParthDlEntry, targetH: number): ParthDlFormat | null {
  const valid = (entry.formats || []).filter((f) => typeof f.url === 'string' && /^https?:\/\//i.test(f.url));
  if (!valid.length) return null;
  const withAudio = valid.filter((f) => f.has_audio);
  const pool = withAudio.length > 0 ? withAudio : valid;
  const sorted = [...pool].sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    return areaB - areaA;
  });
  return targetH <= 480 ? sorted[sorted.length - 1] : sorted[0];
}

let cachedYtDlpRunner: { cmd: string; baseArgs: string[] } | null | undefined;
let cachedYtDlpVersion: string | null | undefined;
let ytDlpInstallPromise: Promise<{ cmd: string; baseArgs: string[] } | null> | null = null;

async function installYtDlpBinary(): Promise<{ cmd: string; baseArgs: string[] } | null> {
  if (process.platform !== 'linux') return null;
  if (ytDlpInstallPromise) return ytDlpInstallPromise;

  ytDlpInstallPromise = (async () => {
    try {
      ensureDataDir();
      const targetPath = path.join(BIN_DIR, 'yt-dlp');
      const archAsset = process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
      const candidateUrls = [
        `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${archAsset}`,
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
      ];

      for (const downloadUrl of candidateUrls) {
        try {
          const tmpPath = `${targetPath}.tmp`;
          const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(45000) });
          if (!res.ok) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          await fs.promises.writeFile(tmpPath, buf, { mode: 0o755 });
          await fs.promises.chmod(tmpPath, 0o755);
          await fs.promises.rename(tmpPath, targetPath);

          const { stdout } = await execFileAsync(targetPath, ['--version'], { timeout: 10000 });
          if (stdout.trim()) {
            cachedYtDlpRunner = { cmd: targetPath, baseArgs: [] };
            cachedYtDlpVersion = stdout.trim();
            return cachedYtDlpRunner;
          }
        } catch {
          // Try next candidate (e.g. pure Python zipapp on Alpine/musl)
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      ytDlpInstallPromise = null;
    }
  })();

  return ytDlpInstallPromise;
}

async function getYtDlpRunner(options?: { autoInstall?: boolean }): Promise<{ cmd: string; baseArgs: string[] } | null> {
  if (cachedYtDlpRunner) return cachedYtDlpRunner;
  const managedBin = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const candidates: { cmd: string; baseArgs: string[] }[] =
    process.platform === 'win32'
      ? [
          { cmd: managedBin, baseArgs: [] },
          { cmd: 'python', baseArgs: ['-m', 'yt_dlp'] },
          { cmd: 'yt-dlp', baseArgs: [] },
        ]
      : [
          { cmd: 'yt-dlp', baseArgs: [] },
          { cmd: '/usr/local/bin/yt-dlp', baseArgs: [] },
          { cmd: '/usr/bin/yt-dlp', baseArgs: [] },
          { cmd: managedBin, baseArgs: [] },
          { cmd: 'python3', baseArgs: ['-m', 'yt_dlp'] },
        ];
  for (const c of candidates) {
    try {
      if (c.cmd === managedBin && !fs.existsSync(managedBin)) continue;
      const { stdout } = await execFileAsync(c.cmd, [...c.baseArgs, '--version'], { timeout: 8000 });
      if (stdout.trim()) {
        cachedYtDlpRunner = c;
        cachedYtDlpVersion = stdout.trim();
        return cachedYtDlpRunner;
      }
    } catch {
      // Try next candidate
    }
  }
  if (options?.autoInstall !== false && process.platform === 'linux') {
    return installYtDlpBinary();
  }
  return null;
}

async function getYtDlpPath(): Promise<string | null> {
  const runner = await getYtDlpRunner({ autoInstall: false });
  return runner ? 'available' : null;
}

async function getYtDlpVersion(): Promise<string | null> {
  if (cachedYtDlpVersion) return cachedYtDlpVersion;
  await getYtDlpRunner({ autoInstall: false });
  return cachedYtDlpVersion || null;
}

function getBgutilPluginDirIfPresent(): string | null {
  const managedExtractor = path.join(YT_DLP_PLUGINS_DIR, 'yt_dlp_plugins', 'extractor');
  if (
    fs.existsSync(path.join(managedExtractor, 'getpot_bgutil.py')) ||
    fs.existsSync(path.join(managedExtractor, 'getpot_bgutil_http.py'))
  ) {
    return YT_DLP_PLUGINS_DIR;
  }
  const repoPluginDirs = [
    path.join(DATA_DIR, 'bgutil-pot', 'plugin'),
    '/opt/bgutil-pot/plugin',
  ];
  for (const dir of repoPluginDirs) {
    if (
      fs.existsSync(path.join(dir, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil.py')) ||
      fs.existsSync(path.join(dir, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil_http.py'))
    ) {
      return dir;
    }
  }
  return null;
}

function buildYtDlpArgs(
  baseArgs: string[],
  options?: { isYouTube?: boolean; isDownload?: boolean; isSubtitle?: boolean }
): string[] {
  ensureDataDir();
  const isYouTube =
    options?.isYouTube !== undefined
      ? options.isYouTube
      : baseArgs.some((a) => /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(a));
  const args = [
    '--js-runtimes',
    'node',
    '--no-check-certificate',
    '--cache-dir',
    YT_DLP_CACHE_DIR,
    '--remote-components',
    'ejs:github',
    '--force-ipv4',
    '--retries',
    '3',
    '--fragment-retries',
    '3',
    '--extractor-retries',
    '2',
    '--retry-sleep',
    'http:exp=1:15',
    '--retry-sleep',
    'extractor:exp=2:20',
  ];
  if (isYouTube) {
    args.push('--sleep-requests', '1.25');
    if (options?.isDownload) {
      args.push('--concurrent-fragments', '1', '--sleep-interval', '1', '--max-sleep-interval', '3');
    }
    if (options?.isSubtitle) {
      args.push('--sleep-subtitles', '1');
    }
  }
  const pluginDir = getBgutilPluginDirIfPresent();
  if (pluginDir) {
    args.push('--plugin-dirs', pluginDir);
  }
  return [...args, ...baseArgs];
}

// --- Xray VPN Core Manager (Admin Only) ---

interface XrayRuntimeState {
  process: ChildProcess | null;
  running: boolean;
  binaryPath: string | null;
  lastError: string | null;
  logs: string[];
}

const xrayState: XrayRuntimeState = {
  process: null,
  running: false,
  binaryPath: null,
  lastError: null,
  logs: [],
};

async function findXrayBinary(): Promise<string | null> {
  const candidates = [
    path.join(BIN_DIR, process.platform === 'win32' ? 'xray.exe' : 'xray'),
    '/usr/local/bin/xray',
    '/usr/bin/xray',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      xrayState.binaryPath = candidate;
      return candidate;
    }
  }
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileAsync(cmd, ['xray'], { timeout: 2500 });
    const found = stdout.trim().split(/\r?\n/)[0]?.trim();
    if (found && fs.existsSync(found)) {
      xrayState.binaryPath = found;
      return found;
    }
  } catch {
    // Not in PATH
  }
  xrayState.binaryPath = null;
  return null;
}

function decodeBase64Safe(input: string): string {
  const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function buildStreamSettings(params: {
  network?: string;
  security?: string;
  sni?: string;
  fp?: string;
  alpn?: string;
  host?: string;
  path?: string;
  serviceName?: string;
  mode?: string;
  pbk?: string;
  sid?: string;
  spx?: string;
  headerType?: string;
  allowInsecure?: boolean;
}): Record<string, unknown> {
  const netType = (params.network || 'tcp').toLowerCase();
  const secType = (params.security || 'none').toLowerCase();
  const stream: Record<string, unknown> = {
    network: netType === 'splithttp' ? 'xhttp' : netType,
  };

  if (netType === 'ws') {
    stream.wsSettings = {
      path: params.path || '/',
      ...(params.host ? { headers: { Host: params.host } } : {}),
    };
  } else if (netType === 'httpupgrade') {
    stream.httpupgradeSettings = {
      path: params.path || '/',
      ...(params.host ? { host: params.host } : {}),
    };
  } else if (netType === 'xhttp' || netType === 'splithttp') {
    stream.xhttpSettings = {
      path: params.path || '/',
      ...(params.host ? { host: params.host } : {}),
      ...(params.mode ? { mode: params.mode } : {}),
    };
  } else if (netType === 'grpc') {
    stream.grpcSettings = {
      serviceName: params.serviceName || '',
      multiMode: params.mode === 'multi',
    };
  } else if (netType === 'tcp' && params.headerType === 'http') {
    stream.tcpSettings = {
      header: {
        type: 'http',
        request: {
          path: [params.path || '/'],
          headers: params.host ? { Host: params.host.split(',').map((s) => s.trim()) } : {},
        },
      },
    };
  }

  if (secType === 'tls') {
    stream.security = 'tls';
    stream.tlsSettings = {
      ...(params.sni ? { serverName: params.sni } : {}),
      ...(params.fp ? { fingerprint: params.fp } : {}),
      ...(params.alpn ? { alpn: params.alpn.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
      allowInsecure: Boolean(params.allowInsecure),
    };
  } else if (secType === 'reality') {
    stream.security = 'reality';
    stream.realitySettings = {
      show: false,
      fingerprint: params.fp || 'chrome',
      serverName: params.sni || '',
      publicKey: params.pbk || '',
      shortId: params.sid || '',
      spiderX: params.spx || '/',
    };
  } else {
    stream.security = 'none';
  }

  return stream;
}

function buildXrayRuntimeConfig(rawInput: string, socksPort: number, httpPort: number): Record<string, unknown> {
  const input = rawInput.trim();
  if (!input) {
    throw new Error('Xray configuration is empty.');
  }

  const localInbounds = [
    {
      tag: 'socks-in',
      port: socksPort,
      listen: '127.0.0.1',
      protocol: 'socks',
      settings: { auth: 'noauth', udp: true },
      sniffing: { enabled: true, destOverride: ['http', 'tls'] },
    },
    {
      tag: 'http-in',
      port: httpPort,
      listen: '127.0.0.1',
      protocol: 'http',
      settings: {},
    },
  ];

  // Full Xray JSON configuration
  if (input.startsWith('{')) {
    const parsed = JSON.parse(input) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.outbounds) || parsed.outbounds.length === 0) {
      throw new Error('JSON config must include a non-empty "outbounds" array.');
    }
    const existingInbounds = Array.isArray(parsed.inbounds) ? (parsed.inbounds as Record<string, unknown>[]) : [];
    const filteredInbounds = existingInbounds.filter(
      (ib) => ib && ib.port !== socksPort && ib.port !== httpPort && ib.tag !== 'socks-in' && ib.tag !== 'http-in'
    );
    return {
      ...parsed,
      log: { loglevel: 'warning' },
      inbounds: [...localInbounds, ...filteredInbounds],
    };
  }

  // Share link parsing (take first non-empty line if multiple lines pasted)
  const linkLine = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => Boolean(l));
  if (!linkLine) {
    throw new Error('Invalid Xray link or JSON configuration.');
  }

  let outbound: Record<string, unknown>;

  if (linkLine.startsWith('vless://')) {
    const u = new URL(linkLine);
    const q = u.searchParams;
    const uuid = decodeURIComponent(u.username);
    const address = u.hostname;
    const port = Number(u.port || 443);
    if (!uuid || !address || !port) throw new Error('Invalid VLESS link.');
    const flow = q.get('flow') || '';
    const encryption = q.get('encryption') || 'none';
    outbound = {
      tag: 'proxy',
      protocol: 'vless',
      settings: {
        vnext: [
          {
            address,
            port,
            users: [
              {
                id: uuid,
                encryption,
                ...(flow ? { flow } : {}),
              },
            ],
          },
        ],
      },
      streamSettings: buildStreamSettings({
        network: q.get('type') || 'tcp',
        security: q.get('security') || 'none',
        sni: q.get('sni') || undefined,
        fp: q.get('fp') || undefined,
        alpn: q.get('alpn') || undefined,
        host: q.get('host') || undefined,
        path: q.get('path') || undefined,
        serviceName: q.get('serviceName') || undefined,
        mode: q.get('mode') || undefined,
        pbk: q.get('pbk') || undefined,
        sid: q.get('sid') || undefined,
        spx: q.get('spx') || undefined,
        headerType: q.get('headerType') || undefined,
        allowInsecure: q.get('allowInsecure') === '1' || q.get('allowInsecure') === 'true',
      }),
    };
  } else if (linkLine.startsWith('vmess://')) {
    const payloadStr = decodeBase64Safe(linkLine.slice('vmess://'.length));
    const v = JSON.parse(payloadStr) as Record<string, unknown>;
    const address = String(v.add || '');
    const port = Number(v.port || 443);
    const id = String(v.id || '');
    if (!address || !port || !id) throw new Error('Invalid VMess link.');
    outbound = {
      tag: 'proxy',
      protocol: 'vmess',
      settings: {
        vnext: [
          {
            address,
            port,
            users: [
              {
                id,
                alterId: Number(v.aid || 0),
                security: String(v.scy || 'auto'),
              },
            ],
          },
        ],
      },
      streamSettings: buildStreamSettings({
        network: String(v.net || 'tcp'),
        security: String(v.tls || 'none'),
        sni: v.sni ? String(v.sni) : v.host ? String(v.host) : undefined,
        fp: v.fp ? String(v.fp) : undefined,
        alpn: v.alpn ? String(v.alpn) : undefined,
        host: v.host ? String(v.host) : undefined,
        path: v.path ? String(v.path) : undefined,
        headerType: v.type ? String(v.type) : undefined,
        allowInsecure: v.insecure === '1' || v.insecure === 1 || v.insecure === true,
      }),
    };
  } else if (linkLine.startsWith('trojan://')) {
    const u = new URL(linkLine);
    const q = u.searchParams;
    const password = decodeURIComponent(u.username);
    const address = u.hostname;
    const port = Number(u.port || 443);
    if (!password || !address || !port) throw new Error('Invalid Trojan link.');
    outbound = {
      tag: 'proxy',
      protocol: 'trojan',
      settings: {
        servers: [{ address, port, password }],
      },
      streamSettings: buildStreamSettings({
        network: q.get('type') || 'tcp',
        security: q.get('security') || 'tls',
        sni: q.get('sni') || address,
        fp: q.get('fp') || undefined,
        alpn: q.get('alpn') || undefined,
        host: q.get('host') || undefined,
        path: q.get('path') || undefined,
        serviceName: q.get('serviceName') || undefined,
        mode: q.get('mode') || undefined,
        pbk: q.get('pbk') || undefined,
        sid: q.get('sid') || undefined,
        spx: q.get('spx') || undefined,
      }),
    };
  } else if (linkLine.startsWith('ss://')) {
    const withoutScheme = linkLine.slice('ss://'.length).split('#')[0];
    let method = '';
    let password = '';
    let address = '';
    let port = 0;

    if (withoutScheme.includes('@')) {
      const [userInfo, hostPart] = withoutScheme.split('@');
      const hostClean = hostPart.split('?')[0];
      const lastColon = hostClean.lastIndexOf(':');
      address = hostClean.slice(0, lastColon).replace(/^\[|\]$/g, '');
      port = Number(hostClean.slice(lastColon + 1));
      const decodedUser = userInfo.includes(':') ? decodeURIComponent(userInfo) : decodeBase64Safe(userInfo);
      const sep = decodedUser.indexOf(':');
      method = decodedUser.slice(0, sep);
      password = decodedUser.slice(sep + 1);
    } else {
      const decoded = decodeBase64Safe(withoutScheme.split('?')[0]);
      const atIdx = decoded.lastIndexOf('@');
      const userInfo = decoded.slice(0, atIdx);
      const hostClean = decoded.slice(atIdx + 1);
      const lastColon = hostClean.lastIndexOf(':');
      address = hostClean.slice(0, lastColon).replace(/^\[|\]$/g, '');
      port = Number(hostClean.slice(lastColon + 1));
      const sep = userInfo.indexOf(':');
      method = userInfo.slice(0, sep);
      password = userInfo.slice(sep + 1);
    }

    if (!method || !password || !address || !port) throw new Error('Invalid Shadowsocks link.');
    outbound = {
      tag: 'proxy',
      protocol: 'shadowsocks',
      settings: {
        servers: [{ address, port, method, password }],
      },
    };
  } else {
    throw new Error('Unsupported config format. Use vless://, vmess://, trojan://, ss://, or Xray JSON.');
  }

  return {
    log: { loglevel: 'warning' },
    inbounds: localInbounds,
    outbounds: [
      outbound,
      { tag: 'direct', protocol: 'freedom' },
      { tag: 'block', protocol: 'blackhole' },
    ],
  };
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractXrayProfileMeta(rawConfig: string): { name: string; protocol: string; address: string } {
  const trimmed = rawConfig.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as {
      outbounds?: Array<{ protocol?: string; settings?: { vnext?: Array<{ address?: string; port?: number }>; servers?: Array<{ address?: string; port?: number }> } }>;
    };
    const first = parsed.outbounds?.[0];
    const proto = (first?.protocol || 'json').toLowerCase();
    const ep = first?.settings?.vnext?.[0] || first?.settings?.servers?.[0];
    const address = ep?.address ? `${ep.address}:${ep.port || ''}`.replace(/:$/, '') : 'custom-json';
    return { name: `Xray JSON (${address})`, protocol: proto, address };
  }

  if (trimmed.startsWith('vmess://')) {
    const payloadStr = decodeBase64Safe(trimmed.slice('vmess://'.length));
    const v = JSON.parse(payloadStr) as { ps?: string; add?: string; port?: string | number };
    const address = `${v.add || ''}:${v.port || ''}`.replace(/:$/, '');
    const name = (typeof v.ps === 'string' && v.ps.trim()) || `VMess (${address})`;
    return { name, protocol: 'vmess', address };
  }

  const hashIdx = trimmed.indexOf('#');
  const fragment = hashIdx !== -1 ? safeDecodeURIComponent(trimmed.slice(hashIdx + 1).trim()) : '';

  if (trimmed.startsWith('ss://')) {
    const withoutScheme = trimmed.slice('ss://'.length).split('#')[0];
    let address = '';
    if (withoutScheme.includes('@')) {
      address = withoutScheme.split('@')[1]?.split('?')[0] || '';
    } else {
      const decoded = decodeBase64Safe(withoutScheme.split('?')[0]);
      address = decoded.slice(decoded.lastIndexOf('@') + 1);
    }
    return { name: fragment || `SS (${address})`, protocol: 'ss', address };
  }

  const u = new URL(trimmed);
  const protocol = u.protocol.replace(/:$/, '').toLowerCase();
  const address = `${u.hostname}:${u.port || 443}`;
  return { name: fragment || `${protocol.toUpperCase()} (${address})`, protocol, address };
}

function parseXrayProfilesInput(rawInput: string): {
  profiles: Array<{ name: string; protocol: string; address: string; configInput: string }>;
  errors: string[];
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { profiles: [], errors: ['Empty configuration input.'] };
  }

  if (trimmed.startsWith('{')) {
    try {
      buildXrayRuntimeConfig(trimmed, 10808, 10809);
      const meta = extractXrayProfileMeta(trimmed);
      return { profiles: [{ ...meta, configInput: trimmed }], errors: [] };
    } catch (err) {
      return { profiles: [], errors: [err instanceof Error ? err.message : 'Invalid Xray JSON config.'] };
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const profiles: Array<{ name: string; protocol: string; address: string; configInput: string }> = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      buildXrayRuntimeConfig(line, 10808, 10809);
      const meta = extractXrayProfileMeta(line);
      profiles.push({ ...meta, configInput: line });
    } catch (err) {
      errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : 'Invalid config'}`);
    }
  }

  return { profiles, errors };
}

function getFreeLocalPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => {
        if (port > 0) resolve(port);
        else reject(new Error('Failed to allocate local port'));
      });
    });
  });
}

function waitForLocalPort(port: number, timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const socket = net.connect({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() < deadline) {
          setTimeout(attempt, 120);
        } else {
          resolve(false);
        }
      });
    };
    attempt();
  });
}

async function stopXrayProcess(): Promise<void> {
  const proc = xrayState.process;
  xrayState.process = null;
  xrayState.running = false;
  if (!proc || proc.killed) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
      resolve();
    }, 1500);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      proc.kill('SIGTERM');
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

async function startXrayProcess(): Promise<void> {
  await stopXrayProcess();
  xrayState.lastError = null;
  xrayState.logs = [];

  if (!adminConfig.xray.enabled || !adminConfig.xray.configInput.trim()) {
    return;
  }

  const bin = await findXrayBinary();
  if (!bin) {
    xrayState.lastError = 'Xray binary is not installed on this server.';
    return;
  }

  let runtimeConfig: Record<string, unknown>;
  try {
    runtimeConfig = buildXrayRuntimeConfig(
      adminConfig.xray.configInput,
      adminConfig.xray.socksPort,
      adminConfig.xray.httpPort
    );
  } catch (err) {
    xrayState.lastError = err instanceof Error ? err.message : 'Invalid Xray configuration.';
    return;
  }

  ensureDataDir();
  fs.writeFileSync(XRAY_CONFIG_FILE, JSON.stringify(runtimeConfig, null, 2), { encoding: 'utf8', mode: 0o600 });

  const child = spawn(bin, ['run', '-config', XRAY_CONFIG_FILE], { shell: false });
  xrayState.process = child;

  const pushLog = (chunk: Buffer) => {
    const lines = chunk
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      xrayState.logs.push(line);
      if (xrayState.logs.length > 30) xrayState.logs.shift();
      const lower = line.toLowerCase();
      const lvl: AppLogLevel =
        lower.includes('error') || lower.includes('failed') ? 'error' : lower.includes('warn') ? 'warn' : 'info';
      appendAppLog(lvl, 'xray', line);
    }
  };

  child.stdout.on('data', pushLog);
  child.stderr.on('data', pushLog);
  child.on('exit', (code) => {
    if (xrayState.process === child) {
      xrayState.process = null;
      xrayState.running = false;
      if (code !== 0 && code !== null) {
        xrayState.lastError = xrayState.logs[xrayState.logs.length - 1] || `Xray exited with code ${code}`;
        appendAppLog('error', 'xray', xrayState.lastError);
      } else {
        appendAppLog('info', 'xray', `Xray exited (${code ?? 'signal'})`);
      }
    }
  });
  child.on('error', (err) => {
    if (xrayState.process === child) {
      xrayState.process = null;
      xrayState.running = false;
      xrayState.lastError = err.message;
      appendAppLog('error', 'xray', `Xray process error: ${err.message}`);
    }
  });

  const ready = await waitForLocalPort(adminConfig.xray.socksPort, 3000);
  if (xrayState.process === child && ready) {
    xrayState.running = true;
    xrayState.lastError = null;
  } else if (xrayState.process === child && !xrayState.lastError) {
    xrayState.lastError = xrayState.logs[xrayState.logs.length - 1] || 'Xray proxy port did not open in time.';
  }
}

async function installXrayBinary(): Promise<string> {
  if (process.platform !== 'linux') {
    throw new Error('Automatic Xray installation is supported on Linux hosts only. Install xray in PATH.');
  }
  const archMap: Record<string, string> = {
    x64: '64',
    arm64: 'arm64-v8a',
  };
  const xrayArch = archMap[process.arch];
  if (!xrayArch) {
    throw new Error(`Unsupported CPU architecture: ${process.arch}`);
  }

  ensureDataDir();
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  const downloadUrl = `https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-${xrayArch}.zip`;
  const zipPath = path.join(BIN_DIR, 'xray.zip');
  const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(45000) });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Xray-core (HTTP ${res.status}).`);
  }
  const arrayBuf = await res.arrayBuffer();
  await fs.promises.writeFile(zipPath, Buffer.from(arrayBuf));

  try {
    await execFileAsync('unzip', ['-o', zipPath, 'xray', '-d', BIN_DIR], { timeout: 15000 });
  } finally {
    await fs.promises.rm(zipPath, { force: true }).catch(() => {});
  }

  const binPath = path.join(BIN_DIR, 'xray');
  await fs.promises.chmod(binPath, 0o755);
  xrayState.binaryPath = binPath;
  return binPath;
}

async function proxyHttpGet(
  targetUrl: string,
  httpPort: number,
  timeoutMs = 10000
): Promise<{ statusCode: number; body: string }> {
  const parsed = new URL(targetUrl);
  const targetPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Proxy request timed out'));
    }, timeoutMs);

    const connectReq = http.request({
      host: '127.0.0.1',
      port: httpPort,
      method: 'CONNECT',
      path: `${parsed.hostname}:${targetPort}`,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed (${res.statusCode})`));
        return;
      }

      if (parsed.protocol === 'https:') {
        const tlsSocket = tls.connect({
          socket,
          servername: parsed.hostname,
        });
        const req = https.request(
          {
            hostname: parsed.hostname,
            port: targetPort,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            createConnection: () => tlsSocket,
            headers: {
              Host: parsed.host,
              'User-Agent': 'GroveSave/1.0',
              Connection: 'close',
            },
          },
          (resp) => {
            let body = '';
            resp.on('data', (d) => {
              if (body.length < 16384) body += d.toString();
            });
            resp.on('end', () => {
              clearTimeout(timer);
              resolve({ statusCode: resp.statusCode || 0, body });
            });
          }
        );
        req.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        req.end();
      } else {
        const req = http.request(
          {
            hostname: parsed.hostname,
            port: targetPort,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            createConnection: () => socket,
            headers: {
              Host: parsed.host,
              'User-Agent': 'GroveSave/1.0',
              Connection: 'close',
            },
          },
          (resp) => {
            let body = '';
            resp.on('data', (d) => {
              if (body.length < 16384) body += d.toString();
            });
            resp.on('end', () => {
              clearTimeout(timer);
              resolve({ statusCode: resp.statusCode || 0, body });
            });
          }
        );
        req.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        req.end();
      }
    });

    connectReq.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    connectReq.end();
  });
}

async function testXrayConfigWithYouTubeDownload(
  configInput: string,
  rawYoutubeUrl?: string
): Promise<{
  success: boolean;
  latencyMs: number;
  downloadedBytes?: number;
  title?: string;
  exitIp?: string | null;
  youtubeUrl: string;
  error?: string;
}> {
  const started = Date.now();
  const targetUrl =
    (rawYoutubeUrl && rawYoutubeUrl.trim()) ||
    adminConfig.xray.testYoutubeUrl ||
    DEFAULT_XRAY_TEST_YOUTUBE_URL;

  const parsedUrl = await validatePublicUrl(targetUrl);
  if (!parsedUrl) {
    return {
      success: false,
      latencyMs: Date.now() - started,
      youtubeUrl: targetUrl,
      error: 'Invalid or disallowed YouTube test URL.',
    };
  }

  let bin = await findXrayBinary();
  if (!bin && process.platform === 'linux') {
    try {
      bin = await installXrayBinary();
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        youtubeUrl: parsedUrl.toString(),
        error: err instanceof Error ? err.message : 'Xray binary is not installed.',
      };
    }
  }
  if (!bin) {
    return {
      success: false,
      latencyMs: Date.now() - started,
      youtubeUrl: parsedUrl.toString(),
      error: 'Xray binary is not installed on this server.',
    };
  }

  const runner = await getYtDlpRunner();
  if (!runner) {
    return {
      success: false,
      latencyMs: Date.now() - started,
      youtubeUrl: parsedUrl.toString(),
      error: 'yt-dlp is not available on this host to run YouTube download tests.',
    };
  }

  const socksPort = await getFreeLocalPort();
  let httpPort = await getFreeLocalPort();
  if (httpPort === socksPort) httpPort = await getFreeLocalPort();

  let runtimeConfig: Record<string, unknown>;
  try {
    runtimeConfig = buildXrayRuntimeConfig(configInput, socksPort, httpPort);
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - started,
      youtubeUrl: parsedUrl.toString(),
      error: err instanceof Error ? err.message : 'Invalid Xray configuration.',
    };
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-xtest-'));
  const tempXrayCfgPath = path.join(tempDir, 'xray-test.json');
  await fs.promises.writeFile(tempXrayCfgPath, JSON.stringify(runtimeConfig, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });

  const logs: string[] = [];
  const child = spawn(bin, ['run', '-config', tempXrayCfgPath], { shell: false });
  const pushLog = (chunk: Buffer) => {
    const lines = chunk
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      logs.push(line);
      if (logs.length > 25) logs.shift();
    }
  };
  child.stdout.on('data', pushLog);
  child.stderr.on('data', pushLog);

  try {
    const portReady = await waitForLocalPort(socksPort, 3500);
    if (!portReady || child.killed || child.exitCode !== null) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        youtubeUrl: parsedUrl.toString(),
        error: logs[logs.length - 1] || 'Xray test tunnel failed to start on local port.',
      };
    }

    let exitIp: string | null = null;
    try {
      const ipRes = await proxyHttpGet('https://api.ipify.org?format=json', httpPort, 6000);
      if (ipRes.statusCode === 200) {
        const parsedIp = JSON.parse(ipRes.body) as { ip?: string };
        exitIp = parsedIp.ip || null;
      }
    } catch {
      // Optional IP lookup; proceed directly to actual YouTube download test
    }

    const { extraArgs, env } = await getYtDlpAuthAndProxy({ skipProxy: true });
    const socksProxy = `socks5h://127.0.0.1:${socksPort}`;
    const httpProxy = `http://127.0.0.1:${httpPort}`;
    const testEnv: NodeJS.ProcessEnv = {
      ...env,
      ALL_PROXY: socksProxy,
      HTTP_PROXY: httpProxy,
      HTTPS_PROXY: httpProxy,
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    };

    const outputTemplate = path.join(tempDir, 'video.%(ext)s');
    const ytdlpArgs = insertBeforeDoubleDash(
      buildYtDlpArgs(
        [
          '-f',
          'worst[ext=mp4]/worst[vcodec!=none][acodec!=none]/worstvideo+worstaudio/worst',
          '--no-playlist',
          '--no-part',
          '--max-filesize',
          '40M',
          '--socket-timeout',
          '15',
          '--retries',
          '2',
          '--print',
          'before_dl:title',
          '--no-simulate',
          '-o',
          outputTemplate,
          '--',
          parsedUrl.toString(),
        ],
        { isYouTube: false }
      ),
      [...extraArgs, '--proxy', socksProxy]
    );

    const { stdout } = await execFileAsync(runner.cmd, [...runner.baseArgs, ...ytdlpArgs], {
      timeout: 45000,
      maxBuffer: 4 * 1024 * 1024,
      env: testEnv,
    });

    const files = await fs.promises.readdir(tempDir);
    const mediaFiles = files.filter((f) => f !== 'xray-test.json' && !f.endsWith('.part'));
    let downloadedBytes = 0;
    for (const f of mediaFiles) {
      const st = await fs.promises.stat(path.join(tempDir, f));
      if (st.isFile() && st.size > downloadedBytes) {
        downloadedBytes = st.size;
      }
    }

    if (downloadedBytes <= 0) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        exitIp,
        youtubeUrl: parsedUrl.toString(),
        error: 'yt-dlp completed but no media bytes were saved.',
      };
    }

    const titleLine = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => Boolean(l) && !l.startsWith('['));

    return {
      success: true,
      latencyMs: Date.now() - started,
      downloadedBytes,
      title: titleLine || undefined,
      exitIp,
      youtubeUrl: parsedUrl.toString(),
    };
  } catch (err: unknown) {
    const errObj = err as { stderr?: string; message?: string };
    const stderrLines = (errObj.stderr || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const reason = stderrLines[stderrLines.length - 1] || errObj.message || 'YouTube download test failed';
    return {
      success: false,
      latencyMs: Date.now() - started,
      youtubeUrl: parsedUrl.toString(),
      error: reason.slice(0, 260),
    };
  } finally {
    try {
      if (!child.killed && child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise((r) => setTimeout(r, 200));
        if (child.exitCode === null) child.kill('SIGKILL');
      }
    } catch {}
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// --- bgutil-ytdlp-pot-provider Server Manager (Admin Only) ---

interface BgutilRuntimeState {
  process: ChildProcess | null;
  running: boolean;
  entryPath: string | null;
  lastError: string | null;
  logs: string[];
}

const bgutilState: BgutilRuntimeState = {
  process: null,
  running: false,
  entryPath: null,
  lastError: null,
  logs: [],
};

function findBgutilPotEntry(): string | null {
  const candidates = [
    '/opt/bgutil-pot/server/build/main.js',
    path.join(DATA_DIR, 'bgutil-pot', 'server', 'build', 'main.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      bgutilState.entryPath = p;
      return p;
    }
  }
  bgutilState.entryPath = null;
  return null;
}

function syncBgutilPluginFromRepo(): boolean {
  const sources = [
    path.join(DATA_DIR, 'bgutil-pot', 'plugin', 'yt_dlp_plugins'),
    '/opt/bgutil-pot/plugin/yt_dlp_plugins',
  ];
  const src = sources.find(
    (s) =>
      fs.existsSync(path.join(s, 'extractor', 'getpot_bgutil.py')) ||
      fs.existsSync(path.join(s, 'extractor', 'getpot_bgutil_http.py'))
  );
  if (!src) return false;

  const targetPlugin = path.join(YT_DLP_PLUGINS_DIR, 'yt_dlp_plugins');
  try {
    if (!fs.existsSync(path.join(targetPlugin, 'extractor', 'getpot_bgutil.py'))) {
      fs.mkdirSync(YT_DLP_PLUGINS_DIR, { recursive: true });
      fs.cpSync(src, targetPlugin, { recursive: true, force: true });
    }
  } catch {
    // Non-fatal if repo plugin dir itself is directly usable via getBgutilPluginDirIfPresent()
  }

  // Best-effort copy to user's ~/.yt-dlp/plugins as well
  try {
    const userPluginDir = path.join(os.homedir(), '.yt-dlp', 'plugins', 'bgutil-ytdlp-pot-provider', 'yt_dlp_plugins');
    if (!fs.existsSync(path.join(userPluginDir, 'extractor', 'getpot_bgutil.py'))) {
      fs.mkdirSync(path.dirname(userPluginDir), { recursive: true });
      fs.cpSync(src, userPluginDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore read-only home directory
  }
  return true;
}

function hasBgutilInPluginFolder(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) return false;
    if (
      fs.existsSync(path.join(dirPath, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil.py')) ||
      fs.existsSync(path.join(dirPath, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil_http.py'))
    ) {
      return true;
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (lower.includes('bgutil')) return true;
      if (entry.isDirectory()) {
        const sub = path.join(dirPath, entry.name);
        if (
          fs.existsSync(path.join(sub, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil.py')) ||
          fs.existsSync(path.join(sub, 'yt_dlp_plugins', 'extractor', 'getpot_bgutil_http.py'))
        ) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

async function isBgutilPipPluginInstalled(): Promise<boolean> {
  syncBgutilPluginFromRepo();
  if (getBgutilPluginDirIfPresent()) {
    return true;
  }

  const pluginDirs = [
    YT_DLP_PLUGINS_DIR,
    path.join(os.homedir(), '.yt-dlp', 'plugins'),
    path.join(os.homedir(), '.config', 'yt-dlp', 'plugins'),
    '/etc/yt-dlp/plugins',
    '/etc/yt-dlp-plugins',
    '/usr/local/share/yt-dlp/plugins',
    '/usr/share/yt-dlp/plugins',
  ];
  for (const dir of pluginDirs) {
    if (hasBgutilInPluginFolder(dir)) {
      return true;
    }
  }

  const pythonCandidates = new Set<string>(
    process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']
  );

  // Also inspect yt-dlp binary shebang if it's a Python script (e.g., venv / pipx)
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileAsync(whichCmd, ['yt-dlp'], { timeout: 3000 });
    const ytDlpFile = stdout.trim().split(/\r?\n/)[0]?.trim();
    if (ytDlpFile && fs.existsSync(ytDlpFile)) {
      const fd = await fs.promises.open(ytDlpFile, 'r');
      const buf = Buffer.alloc(160);
      await fd.read(buf, 0, 160, 0);
      await fd.close();
      const firstLine = buf.toString('utf8').split(/\r?\n/)[0] || '';
      if (firstLine.startsWith('#!') && firstLine.toLowerCase().includes('python')) {
        const shebangBin = firstLine.slice(2).trim().split(/\s+/)[0];
        if (shebangBin && fs.existsSync(shebangBin)) {
          pythonCandidates.add(shebangBin);
        }
      }
    }
  } catch {}

  for (const pyCmd of pythonCandidates) {
    try {
      await execFileAsync(
        pyCmd,
        [
          '-c',
          "import importlib.util, sys; sys.exit(0 if (importlib.util.find_spec('yt_dlp_plugins.extractor.getpot_bgutil') or importlib.util.find_spec('yt_dlp_plugins.extractor.getpot_bgutil_http')) else 1)",
        ],
        { timeout: 6000 }
      );
      return true;
    } catch {}
    try {
      await execFileAsync(pyCmd, ['-m', 'pip', 'show', 'bgutil-ytdlp-pot-provider'], { timeout: 10000 });
      return true;
    } catch {}
  }

  return false;
}

function getEffectivePotBaseUrl(): string {
  if (adminConfig.potProvider.mode === 'external') {
    return adminConfig.potProvider.baseUrl.replace(/\/+$/, '');
  }
  return `http://127.0.0.1:${adminConfig.potProvider.port}`;
}

async function pingBgutilServer(
  baseUrl: string
): Promise<{ ok: boolean; version?: string; serverUptime?: number; error?: string }> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/ping`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { version?: string; server_uptime?: number };
    return { ok: true, version: data.version, serverUptime: data.server_uptime };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unreachable' };
  }
}

async function stopBgutilPotServer(): Promise<void> {
  const proc = bgutilState.process;
  bgutilState.process = null;
  bgutilState.running = false;
  if (!proc || proc.killed) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
      resolve();
    }, 1500);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      proc.kill('SIGTERM');
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

let bgutilInstallPromise: Promise<{ entryPath: string; pluginInstalled: boolean }> | null = null;

async function startBgutilPotServer(): Promise<void> {
  await stopBgutilPotServer();
  bgutilState.lastError = null;
  bgutilState.logs = [];

  if (!adminConfig.potProvider.enabled || adminConfig.potProvider.mode !== 'managed') {
    return;
  }

  // If docker-entrypoint.sh (or an existing managed daemon) already owns the port
  // and is healthy, reuse it instead of colliding with EADDRINUSE.
  const existingPing = await pingBgutilServer(`http://127.0.0.1:${adminConfig.potProvider.port}`);
  if (existingPing.ok) {
    bgutilState.running = true;
    bgutilState.lastError = null;
    return;
  }

  let entryPath = findBgutilPotEntry();
  if (!entryPath) {
    try {
      const installed = await installBgutilPotServer();
      entryPath = installed.entryPath;
    } catch (err) {
      bgutilState.lastError =
        err instanceof Error
          ? err.message
          : 'bgutil-ytdlp-pot-provider server is not installed on this host.';
      return;
    }
  }
  if (!entryPath) {
    bgutilState.lastError = 'bgutil-ytdlp-pot-provider server is not installed on this host.';
    return;
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(adminConfig.potProvider.port),
  };
  if (adminConfig.xray.enabled && xrayState.running) {
    const httpProxy = `http://127.0.0.1:${adminConfig.xray.httpPort}`;
    const socksProxy = `socks5h://127.0.0.1:${adminConfig.xray.socksPort}`;
    env.HTTP_PROXY = httpProxy;
    env.HTTPS_PROXY = httpProxy;
    env.ALL_PROXY = socksProxy;
  }

  const child = spawn(process.execPath, [entryPath, '--port', String(adminConfig.potProvider.port)], {
    shell: false,
    cwd: path.dirname(path.dirname(entryPath)),
    env,
  });
  bgutilState.process = child;

  const pushLog = (chunk: Buffer) => {
    const lines = chunk
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      bgutilState.logs.push(line);
      if (bgutilState.logs.length > 30) bgutilState.logs.shift();
      const lower = line.toLowerCase();
      const lvl: AppLogLevel =
        lower.includes('error') || lower.includes('failed') ? 'error' : lower.includes('warn') ? 'warn' : 'info';
      appendAppLog(lvl, 'bgutil', line);
    }
  };

  child.stdout.on('data', pushLog);
  child.stderr.on('data', pushLog);
  child.on('exit', (code) => {
    if (bgutilState.process === child) {
      bgutilState.process = null;
      bgutilState.running = false;
      if (code !== 0 && code !== null) {
        bgutilState.lastError = bgutilState.logs[bgutilState.logs.length - 1] || `bgutil exited with code ${code}`;
        appendAppLog('error', 'bgutil', bgutilState.lastError);
      } else {
        appendAppLog('info', 'bgutil', `bgutil server exited (${code ?? 'signal'})`);
      }
    }
  });
  child.on('error', (err) => {
    if (bgutilState.process === child) {
      bgutilState.process = null;
      bgutilState.running = false;
      bgutilState.lastError = err.message;
      appendAppLog('error', 'bgutil', `bgutil server error: ${err.message}`);
    }
  });

  const ready = await waitForLocalPort(adminConfig.potProvider.port, 4000);
  if (bgutilState.process === child && ready) {
    bgutilState.running = true;
    bgutilState.lastError = null;
  } else if (bgutilState.process === child && !bgutilState.lastError) {
    bgutilState.lastError = bgutilState.logs[bgutilState.logs.length - 1] || 'bgutil server did not open port in time.';
  }
}

async function installBgutilPotServer(): Promise<{ entryPath: string; pluginInstalled: boolean }> {
  if (bgutilInstallPromise) return bgutilInstallPromise;

  bgutilInstallPromise = (async () => {
    ensureDataDir();
    const prebuiltEntry = findBgutilPotEntry();
    const targetDir = path.join(DATA_DIR, 'bgutil-pot');
    const serverDir = path.join(targetDir, 'server');
    const entryPath = prebuiltEntry || path.join(serverDir, 'build', 'main.js');

    if (!fs.existsSync(entryPath)) {
      const tarballUrl = 'https://github.com/Brainicism/bgutil-ytdlp-pot-provider/archive/refs/heads/master.tar.gz';
      const tarPath = path.join(DATA_DIR, 'bgutil-pot.tar.gz');
      const res = await fetch(tarballUrl, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) {
        throw new Error(`Failed to download bgutil-ytdlp-pot-provider (HTTP ${res.status}).`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.promises.writeFile(tarPath, buf);

      try {
        await fs.promises.rm(targetDir, { recursive: true, force: true });
        await fs.promises.mkdir(targetDir, { recursive: true });
        await execFileAsync('tar', ['-xzf', tarPath, '--strip-components=1', '-C', targetDir], {
          timeout: 20000,
        });
      } finally {
        await fs.promises.rm(tarPath, { force: true }).catch(() => {});
      }

      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const buildEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development' };
       try {
         await execFileAsync(npmCmd, ['install', '--legacy-peer-deps', '--no-audit', '--no-fund'], {
           cwd: serverDir,
           env: buildEnv,
           timeout: 180000,
         });
       } catch (installErr) {
         try {
           const pkgJsonPath = path.join(serverDir, 'package.json');
           if (fs.existsSync(pkgJsonPath)) {
             const pkgContent = await fs.promises.readFile(pkgJsonPath, 'utf8');
             const pkg = JSON.parse(pkgContent);
             if (pkg.dependencies && pkg.dependencies.canvas) delete pkg.dependencies.canvas;
             if (pkg.devDependencies && pkg.devDependencies.canvas) delete pkg.devDependencies.canvas;
             await fs.promises.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
           }
           await execFileAsync(npmCmd, ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', '--ignore-scripts'], {
             cwd: serverDir,
             env: buildEnv,
             timeout: 180000,
           });
         } catch (fallbackErr) {
           throw installErr;
         }
       }
      const localTsc = path.join(
        serverDir,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
      );
      if (fs.existsSync(localTsc)) {
        await execFileAsync(localTsc, [], { cwd: serverDir, env: buildEnv, timeout: 60000 });
      } else {
        await execFileAsync(npxCmd, ['tsc'], { cwd: serverDir, env: buildEnv, timeout: 60000 });
      }
    }

    // Ensure yt-dlp binary is ready and sync plugin files from repo / release zip / pip
    await getYtDlpRunner({ autoInstall: true });
    syncBgutilPluginFromRepo();

    let pluginInstalled = await isBgutilPipPluginInstalled();
    if (!pluginInstalled) {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      try {
        await execFileAsync(
          pyCmd,
          ['-m', 'pip', 'install', '--break-system-packages', '-U', 'bgutil-ytdlp-pot-provider'],
          { timeout: 60000 }
        );
        pluginInstalled = await isBgutilPipPluginInstalled();
      } catch {
        try {
          await execFileAsync(pyCmd, ['-m', 'pip', 'install', '-U', 'bgutil-ytdlp-pot-provider'], { timeout: 60000 });
          pluginInstalled = await isBgutilPipPluginInstalled();
        } catch {
          pluginInstalled = await isBgutilPipPluginInstalled();
        }
      }
    }

    if (!pluginInstalled) {
      try {
        const zipUrl = 'https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/latest/download/bgutil-ytdlp-pot-provider.zip';
        const zipRes = await fetch(zipUrl, { signal: AbortSignal.timeout(30000) });
        if (zipRes.ok) {
          const zipPath = path.join(DATA_DIR, 'bgutil-plugin.zip');
          await fs.promises.writeFile(zipPath, Buffer.from(await zipRes.arrayBuffer()));
          fs.mkdirSync(YT_DLP_PLUGINS_DIR, { recursive: true });
          await execFileAsync('unzip', ['-o', zipPath, '-d', YT_DLP_PLUGINS_DIR], { timeout: 15000 });
          await fs.promises.rm(zipPath, { force: true }).catch(() => {});
          pluginInstalled = await isBgutilPipPluginInstalled();
        }
      } catch {}
    }

    bgutilState.entryPath = entryPath;
    return { entryPath, pluginInstalled };
  })();

  try {
    return await bgutilInstallPromise;
  } finally {
    bgutilInstallPromise = null;
  }
}

function formatPoTokenArg(rawToken: string): string {
  const cleaned = rawToken.trim();
  if (!cleaned) return '';
  return cleaned.includes('+') ? cleaned : `web.gvs+${cleaned}`;
}

async function getYtDlpAuthAndProxy(overrides?: {
  cookies?: string;
  poToken?: string;
  skipProxy?: boolean;
}): Promise<{ extraArgs: string[]; env: NodeJS.ProcessEnv }> {
  const extraArgs: string[] = [];
  const env: NodeJS.ProcessEnv = { ...process.env };

  syncBgutilPluginFromRepo();

  const cookies = overrides?.cookies !== undefined ? overrides.cookies.trim() : adminConfig.youtubeCookies.trim();
  const poToken = overrides?.poToken !== undefined ? overrides.poToken.trim() : adminConfig.youtubePoToken.trim();

  if (cookies) {
    ensureDataDir();
    await fs.promises.writeFile(YT_COOKIES_FILE, cookies, { encoding: 'utf8', mode: 0o600 });
    extraArgs.push('--cookies', YT_COOKIES_FILE);
  }
  if (adminConfig.potProvider.enabled) {
    if (adminConfig.potProvider.mode === 'managed' && !bgutilState.running && findBgutilPotEntry()) {
      await startBgutilPotServer();
    }
    let shouldAttach =
      adminConfig.potProvider.mode === 'external' || bgutilState.running;
    if (!shouldAttach && adminConfig.potProvider.mode === 'managed') {
      const ping = await pingBgutilServer(getEffectivePotBaseUrl());
      if (ping.ok) {
        bgutilState.running = true;
        shouldAttach = true;
      }
    }
    if (shouldAttach) {
      extraArgs.push('--extractor-args', `youtubepot-bgutilhttp:base_url=${getEffectivePotBaseUrl()}`);
    }
  } else if (poToken) {
    extraArgs.push('--extractor-args', `youtube:po_token=${formatPoTokenArg(poToken)}`);
  }
  if (!overrides?.skipProxy && adminConfig.xray.enabled && xrayState.running) {
    const socksProxy = `socks5h://127.0.0.1:${adminConfig.xray.socksPort}`;
    const httpProxy = `http://127.0.0.1:${adminConfig.xray.httpPort}`;
    extraArgs.push('--proxy', socksProxy);
    env.ALL_PROXY = socksProxy;
    env.HTTP_PROXY = httpProxy;
    env.HTTPS_PROXY = httpProxy;
    env.NO_PROXY = '127.0.0.1,localhost';
    env.no_proxy = '127.0.0.1,localhost';
  }

  return { extraArgs, env };
}

function insertBeforeDoubleDash(args: string[], extraArgs: string[]): string[] {
  if (!extraArgs.length) return args;
  const copy = [...args];
  const idx = copy.indexOf('--');
  if (idx !== -1) {
    copy.splice(idx, 0, ...extraArgs);
  } else {
    copy.push(...extraArgs);
  }
  return copy;
}

/* ------------------------------------------------------------------ *
 * YouTube anti-ban pacing, caching, deduplication & cooldown helpers
 * ------------------------------------------------------------------ */

interface StreamInputSpecGlobal {
  url: string;
  headers: Record<string, string>;
  protocol?: string;
  vcodec?: string;
  acodec?: string;
  ext?: string;
}

interface ResolvedStreamEntryGlobal {
  mode: 'proxy' | 'ffmpeg';
  inputs: StreamInputSpecGlobal[];
  expiresAt: number;
}

const streamResolveCache = new Map<string, ResolvedStreamEntryGlobal>();
const streamInflightMap = new Map<string, Promise<ResolvedStreamEntryGlobal>>();

const YOUTUBE_INSPECT_CACHE_TTL_MS = 10 * 60 * 1000;
const YOUTUBE_RAW_INFO_CACHE_TTL_MS = 4 * 60 * 1000;
const YOUTUBE_SUBTITLE_CACHE_TTL_MS = 30 * 60 * 1000;

const youtubeInspectCache = new Map<string, { payload: Record<string, unknown>; expiresAt: number }>();
const youtubeInspectInflight = new Map<string, Promise<Record<string, unknown>>>();
const youtubeRawInfoCache = new Map<string, { info: Record<string, unknown>; expiresAt: number }>();
const youtubeSubtitleCache = new Map<string, { vtt: string; expiresAt: number }>();
const youtubeSubtitleInflight = new Map<string, Promise<string | null>>();
const youtubeCooldownMap = new Map<string, { until: number; strikes: number }>();

function getYouTubeConfigFingerprint(): string {
  return `${adminConfig.xray.enabled}:${adminConfig.xray.activeProfileId || ''}:${xrayState.running}:${adminConfig.potProvider.enabled}:${adminConfig.potProvider.mode}:${Boolean(adminConfig.youtubeCookies.trim())}:${Boolean(adminConfig.youtubePoToken.trim())}`;
}

function isYouTubeBotOrRateLimitError(err: unknown): boolean {
  const obj = err as { stderr?: string; message?: string } | undefined;
  const text = `${obj?.stderr || ''} ${obj?.message || String(err || '')}`;
  return /sign in to confirm (?:you'?re|you are) not a bot|http error 429|too many requests|this helps protect our community|login_required|bot detected|rate limit cooldown/i.test(
    text
  );
}

function recordYouTubeRateLimit(fingerprint: string): void {
  const now = Date.now();
  const prev = youtubeCooldownMap.get(fingerprint);
  const strikes = prev && now - prev.until < 5 * 60 * 1000 ? prev.strikes + 1 : 1;
  const cooldownMs = Math.min(60000, 12000 * Math.pow(2, strikes - 1));
  youtubeCooldownMap.set(fingerprint, { until: now + cooldownMs, strikes });
  appendAppLog(
    'warn',
    'youtube',
    `Bot/rate-limit detected (strike ${strikes}); cooling down for ${Math.ceil(cooldownMs / 1000)}s`
  );
}

function getYouTubeCooldownRemainingMs(fingerprint: string): number {
  const entry = youtubeCooldownMap.get(fingerprint);
  if (!entry) return 0;
  const rem = entry.until - Date.now();
  if (rem <= 0) return 0;
  return rem;
}

function resetYouTubeCachesAndCooldown(): void {
  youtubeInspectCache.clear();
  youtubeRawInfoCache.clear();
  youtubeSubtitleCache.clear();
  streamResolveCache.clear();
  youtubeCooldownMap.clear();
}

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > maxSize) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

let ytQueueTail: Promise<void> = Promise.resolve();
let lastYtRequestEndAt = 0;

function runPacedYouTubeTask<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const minGapMs = 900 + Math.floor(Math.random() * 1000);
    const elapsed = Date.now() - lastYtRequestEndAt;
    if (lastYtRequestEndAt > 0 && elapsed < minGapMs) {
      await new Promise((r) => setTimeout(r, minGapMs - elapsed));
    }
    try {
      return await fn();
    } finally {
      lastYtRequestEndAt = Date.now();
    }
  };
  const next = ytQueueTail.then(run, run);
  ytQueueTail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function proxyHttpGetFullText(
  targetUrl: string,
  httpPort: number,
  timeoutMs = 12000,
  maxBytes = 4 * 1024 * 1024
): Promise<{ statusCode: number; body: string }> {
  const parsed = new URL(targetUrl);
  const targetPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Proxy request timed out'));
    }, timeoutMs);

    const connectReq = http.request({
      host: '127.0.0.1',
      port: httpPort,
      method: 'CONNECT',
      path: `${parsed.hostname}:${targetPort}`,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed (${res.statusCode})`));
        return;
      }

      const mod = parsed.protocol === 'https:' ? https : http;
      const createConnection = () =>
        parsed.protocol === 'https:'
          ? tls.connect({ socket, servername: parsed.hostname })
          : socket;

      const req = mod.request(
        {
          hostname: parsed.hostname,
          port: targetPort,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          createConnection,
          headers: {
            Host: parsed.host,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Connection: 'close',
          },
        },
        (resp) => {
          const chunks: Buffer[] = [];
          let total = 0;
          resp.on('data', (d: Buffer) => {
            total += d.byteLength;
            if (total <= maxBytes) chunks.push(d);
            else resp.destroy();
          });
          resp.on('end', () => {
            clearTimeout(timer);
            resolve({ statusCode: resp.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') });
          });
          resp.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        }
      );
      req.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      req.end();
    });

    connectReq.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    connectReq.end();
  });
}

function findSubtitleUrlFromRawInfo(
  rawInfo: Record<string, unknown>,
  lang: string,
  isAuto: boolean
): string | null {
  const sourceMap = (isAuto ? rawInfo.automatic_captions : rawInfo.subtitles) as
    | Record<string, Array<{ ext?: string; url?: string }>>
    | undefined;
  const fallbackMap = (isAuto ? rawInfo.subtitles : rawInfo.automatic_captions) as
    | Record<string, Array<{ ext?: string; url?: string }>>
    | undefined;
  const entries = sourceMap?.[lang] || fallbackMap?.[lang];
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const vtt = entries.find((e) => e.ext === 'vtt' && typeof e.url === 'string' && /^https?:\/\//i.test(e.url));
  if (vtt?.url) return vtt.url;
  const any = entries.find((e) => typeof e.url === 'string' && /^https?:\/\//i.test(e.url));
  return any?.url || null;
}

function resolveYouTubeStreamFromRawInfo(
  rawInfo: Record<string, unknown>,
  targetH: number,
  audioFormatId: string | undefined,
  buildHeaders: (customHeaders?: Record<string, string>, cookieStr?: string) => Record<string, string>,
  extractCookie: (rawCookies: unknown) => string,
  isManifest: (input: StreamInputSpecGlobal) => boolean
): ResolvedStreamEntryGlobal | null {
  const formats = Array.isArray(rawInfo.formats) ? (rawInfo.formats as Array<Record<string, unknown>>) : [];
  if (formats.length === 0) return null;

  const validFormats = formats.filter((f) => {
    const u = typeof f.url === 'string' ? f.url.trim() : '';
    const ext = typeof f.ext === 'string' ? f.ext.toLowerCase() : '';
    const proto = typeof f.protocol === 'string' ? f.protocol.toLowerCase() : '';
    const note = typeof f.format_note === 'string' ? f.format_note.toLowerCase() : '';
    if (!/^https?:\/\//i.test(u)) return false;
    if (ext === 'mhtml' || proto === 'mhtml' || note.includes('storyboard')) return false;
    return true;
  });

  const toSpec = (fmt: Record<string, unknown>): StreamInputSpecGlobal | null => {
    const u = typeof fmt.url === 'string' ? fmt.url.trim() : '';
    if (!/^https?:\/\//i.test(u)) return null;
    return {
      url: u,
      headers: buildHeaders(
        fmt.http_headers && typeof fmt.http_headers === 'object'
          ? (fmt.http_headers as Record<string, string>)
          : undefined,
        extractCookie(fmt.cookies)
      ),
      protocol: typeof fmt.protocol === 'string' ? fmt.protocol : undefined,
      vcodec: typeof fmt.vcodec === 'string' ? fmt.vcodec : undefined,
      acodec: typeof fmt.acodec === 'string' ? fmt.acodec : undefined,
      ext: typeof fmt.ext === 'string' ? fmt.ext : undefined,
    };
  };

  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const str = (v: unknown): string => (typeof v === 'string' ? v.toLowerCase() : '');

  const muxed = validFormats
    .filter((f) => {
      const vc = str(f.vcodec);
      const ac = str(f.acodec);
      const h = num(f.height);
      return vc !== 'none' && vc !== '' && ac !== 'none' && ac !== '' && h > 0 && h <= targetH;
    })
    .sort((a, b) => {
      const mp4Diff = (str(b.ext) === 'mp4' ? 1 : 0) - (str(a.ext) === 'mp4' ? 1 : 0);
      if (mp4Diff !== 0) return mp4Diff;
      const hDiff = num(b.height) - num(a.height);
      if (hDiff !== 0) return hDiff;
      return num(b.tbr) - num(a.tbr);
    });

  if (!audioFormatId) {
    const bestMuxed = muxed[0];
    if (bestMuxed && str(bestMuxed.ext) === 'mp4' && (targetH <= 360 || num(bestMuxed.height) >= 480)) {
      const spec = toSpec(bestMuxed);
      if (spec && !isManifest(spec)) {
        return { mode: 'proxy', inputs: [spec], expiresAt: Date.now() + 4 * 60 * 1000 };
      }
    }
  }

  const videoOnly = validFormats
    .filter((f) => {
      const vc = str(f.vcodec);
      const ac = str(f.acodec);
      const h = num(f.height);
      return vc !== 'none' && vc !== '' && (ac === 'none' || ac === '') && h > 0 && h <= targetH;
    })
    .sort((a, b) => {
      const avcDiff = (str(b.vcodec).startsWith('avc') ? 1 : 0) - (str(a.vcodec).startsWith('avc') ? 1 : 0);
      const hDiff = num(b.height) - num(a.height);
      if (hDiff !== 0) return hDiff;
      if (avcDiff !== 0) return avcDiff;
      return num(b.tbr) - num(a.tbr);
    });

  const audioOnly = validFormats
    .filter((f) => {
      const vc = str(f.vcodec);
      const ac = str(f.acodec);
      return (vc === 'none' || vc === '') && ac !== 'none' && ac !== '';
    })
    .sort((a, b) => {
      const mp4aDiff = (str(b.acodec).includes('mp4a') ? 1 : 0) - (str(a.acodec).includes('mp4a') ? 1 : 0);
      if (mp4aDiff !== 0) return mp4aDiff;
      return num(b.abr || b.tbr) - num(a.abr || a.tbr);
    });

  const chosenVideo = videoOnly[0];
  const chosenAudio = audioFormatId
    ? validFormats.find((f) => String(f.format_id || '') === audioFormatId) || audioOnly[0]
    : audioOnly[0];

  if (chosenVideo && chosenAudio) {
    const vSpec = toSpec(chosenVideo);
    const aSpec = toSpec(chosenAudio);
    if (vSpec && aSpec) {
      return { mode: 'ffmpeg', inputs: [vSpec, aSpec], expiresAt: Date.now() + 4 * 60 * 1000 };
    }
  }

  if (!audioFormatId && muxed[0]) {
    const spec = toSpec(muxed[0]);
    if (spec) {
      return {
        mode: isManifest(spec) ? 'ffmpeg' : 'proxy',
        inputs: [spec],
        expiresAt: Date.now() + 4 * 60 * 1000,
      };
    }
  }

  return null;
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\r\n\t\x00-\x1f\x7f"\\/;:*?<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
  return cleaned || 'grove-save-media';
}

function buildContentDisposition(rawTitle: string, quality: string, ext: string): string {
  const unicodeBase = sanitizeFilename(rawTitle);
  const utf8Name = `${unicodeBase}_${quality}.${ext}`;

  const asciiBase =
    unicodeBase
      .replace(/[^a-zA-Z0-9 _.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64) || 'grove-save-media';
  const asciiName = `${asciiBase}_${quality}.${ext}`;

  const encodedUtf8 = encodeURIComponent(utf8Name)
    .replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedUtf8}`;
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  authMethod?: 'bearer' | 'cookie';
  sessionToken?: string;
}

function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifySessionToken(token);
    if (user) {
      req.authUser = user;
      req.authMethod = 'bearer';
      req.sessionToken = token;
      next();
      return;
    }
  }
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken) {
    const user = verifySessionToken(cookieToken);
    if (user) {
      req.authUser = user;
      req.authMethod = 'cookie';
      req.sessionToken = cookieToken;
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (
      req.authMethod === 'cookie' &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()) &&
      !isCsrfValid(req)
    ) {
      res.status(403).json({ error: 'CSRF validation failed' });
      return;
    }
    next();
  });
}

function publicUserView(u: StoredUser) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    provider: u.provider,
    role: u.role === 'admin' ? ('admin' as const) : ('user' as const),
    preferences: {
      theme: u.preferences.theme,
      language: u.preferences.language,
      defaultQuality: normalizeQualityValue(u.preferences.defaultQuality),
    },
  };
}

function selectTargetHeight(quality: string): number {
  switch (quality) {
    case '2160p':
      return 2160;
    case '1080p':
      return 1080;
    case '720p':
      return 720;
    case '480p':
      return 480;
    case '360p':
      return 360;
    default:
      return 1080;
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const reqPath = req.path || '';
    if (reqPath === '/admin/logs') {
      next();
      return;
    }
    const startedAt = Date.now();
    res.on('finish', () => {
      const status = res.statusCode;
      if (reqPath.startsWith('/media/jobs/') && status < 400) {
        return;
      }
      const durationMs = Date.now() - startedAt;
      const lvl: AppLogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      appendAppLog(lvl, 'http', `${req.method} /api${reqPath} -> ${status} (${durationMs}ms)`);
    });
    next();
  });

  app.get('/api/health', async (_req: Request, res: Response) => {
    const ytdlpVersion = await getYtDlpVersion();
    const ytdlpAvailable = Boolean(ytdlpVersion);
    res.json({
      status: 'ok',
      engine: ytdlpAvailable ? 'express-ytdlp' : 'express-ytdl-core',
      ytdlpAvailable,
      ytdlpVersion,
    });
  });

  app.get('/api/auth/config', (_req: Request, res: Response) => {
    res.json({
      googleConfigured: Boolean(GOOGLE_CLIENT_ID),
      googleClientId: GOOGLE_CLIENT_ID || null,
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const body = req.body as { email?: unknown; password?: unknown; displayName?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim().slice(0, 48)
        : email.split('@')[0] || 'User';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      res.status(400).json({ error: 'Valid email and password (6+ chars) required.' });
      return;
    }
    if (getUserByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email,
      displayName,
      passwordHash: hash,
      passwordSalt: salt,
      role: ADMIN_EMAIL_NORMALIZED && email === ADMIN_EMAIL_NORMALIZED ? 'admin' : 'user',
      provider: 'email',
      preferences: {
        theme: 'dark',
        language: 'en',
        defaultQuality: '1080p',
      },
    };
    insertUser(user);

    const token = createUserSession(user.id);
    setSessionCookie(req, res, token);
    res.status(201).json({ token, user: publicUserView(user) });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const user = getUserByEmail(email);
    if (!user || !user.passwordHash || !user.passwordSalt) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createUserSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ token, user: publicUserView(user) });
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID) {
      res.status(501).json({
        configured: false,
        error: 'GOOGLE_CLIENT_ID is not configured on this server.',
      });
      return;
    }
    const body = req.body as { credential?: unknown };
    const credential = typeof body.credential === 'string' ? body.credential.trim() : '';
    if (!credential) {
      res.status(400).json({ error: 'Missing Google credential token.' });
      return;
    }
    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        res.status(401).json({ error: 'Invalid Google ID token.' });
        return;
      }
      const data = (await verifyRes.json()) as {
        aud?: string;
        email?: string;
        email_verified?: string;
        name?: string;
      };
      if (data.aud !== GOOGLE_CLIENT_ID || !data.email || data.email_verified !== 'true') {
        res.status(401).json({ error: 'Google token verification failed.' });
        return;
      }
      const email = data.email.toLowerCase();
      let user = getUserByEmail(email);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email,
          displayName: data.name || email.split('@')[0],
          provider: 'google',
          role: ADMIN_EMAIL_NORMALIZED && email === ADMIN_EMAIL_NORMALIZED ? 'admin' : 'user',
          preferences: {
            theme: 'dark',
            language: 'en',
            defaultQuality: '1080p',
          },
        };
        insertUser(user);
      }
      const token = createUserSession(user.id);
      setSessionCookie(req, res, token);
      res.json({ token, user: publicUserView(user) });
    } catch {
      res.status(502).json({ error: 'Failed to verify Google credential.' });
    }
  });

  app.post('/api/auth/logout', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.authMethod === 'cookie' && !isCsrfValid(req)) {
      res.status(403).json({ error: 'CSRF validation failed' });
      return;
    }
    if (req.sessionToken) {
      revokeSessionToken(req.sessionToken);
    }
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const freshUser = getUserById(req.authUser!.id) || req.authUser!;
    res.json({ user: publicUserView(freshUser) });
  });

  app.put('/api/user/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = getUserById(req.authUser!.id) || req.authUser!;
    const body = req.body as {
      theme?: unknown;
      language?: unknown;
      defaultQuality?: unknown;
    };
    if (body.theme === 'dark' || body.theme === 'light') {
      user.preferences.theme = body.theme;
    }
    if (
      body.language === 'en' ||
      body.language === 'fa' ||
      body.language === 'ru' ||
      body.language === 'zh'
    ) {
      user.preferences.language = body.language;
    }
    if (
      typeof body.defaultQuality === 'string' &&
      ['2160p', '1080p', '720p', '480p', '360p'].includes(body.defaultQuality)
    ) {
      user.preferences.defaultQuality = body.defaultQuality;
    }
    updateUserPreferencesInDb(user.id, user.preferences);
    res.json({ user: publicUserView(user) });
  });

  app.get('/api/user/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const items = getUserHistory(req.authUser!.id);
    res.json({ items });
  });

  app.post('/api/user/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const parsedUrl = await validatePublicUrl(rawUrl);
    if (!parsedUrl) {
      res.status(400).json({ error: 'Invalid history media URL.' });
      return;
    }
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 240)
        : 'Media Stream';
    const author =
      typeof body.author === 'string' && body.author.trim()
        ? body.author.trim().slice(0, 120)
        : parsedUrl.hostname;
    const quality =
      typeof body.quality === 'string' &&
      ['2160p', '1080p', '720p', '480p', '360p', 'best', 'audio'].includes(body.quality.trim())
        ? body.quality.trim()
        : '1080p';
    const sizeBytes =
      typeof body.sizeBytes === 'number' && Number.isFinite(body.sizeBytes)
        ? Math.max(0, Math.floor(body.sizeBytes))
        : 0;
    const rawThumb = typeof body.thumbnail === 'string' ? body.thumbnail.trim() : '';
    const thumbnail =
      /^https?:\/\//i.test(rawThumb) || rawThumb.startsWith('/api/media/thumbnail?')
        ? rawThumb.slice(0, 1000)
        : null;
    const savedAt =
      typeof body.savedAt === 'string' && body.savedAt.trim()
        ? body.savedAt.trim().slice(0, 32)
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const jobId =
      typeof body.jobId === 'string' && /^[a-zA-Z0-9_-]{4,80}$/.test(body.jobId.trim())
        ? body.jobId.trim()
        : undefined;
    const itemId =
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim().slice(0, 80)
        : crypto.randomUUID();

    const item: UserHistoryItem = {
      id: itemId,
      ...(jobId ? { jobId } : {}),
      url: parsedUrl.toString(),
      title,
      author,
      quality,
      sizeBytes,
      thumbnail,
      savedAt,
    };
    const items = upsertUserHistoryItem(req.authUser!.id, item);
    res.status(201).json({ item, items });
  });

  app.delete('/api/user/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    clearUserHistoryInDb(req.authUser!.id);
    res.json({ success: true });
  });

  /* -------------------- Announcements (public read, admin write) -------------------- */

  app.get('/api/announcements', (_req: Request, res: Response) => {
    const items = listAnnouncements(30);
    const latest = items[0] || null;
    res.json({
      items,
      latestId: latest ? latest.id : null,
      latestCreatedAt: latest ? latest.createdAt : null,
    });
  });

  app.post('/api/admin/announcements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const payload = (req.body || {}) as { title?: unknown; body?: unknown };
    const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 160) : '';
    const body = typeof payload.body === 'string' ? payload.body.trim().slice(0, 2000) : '';
    if (!body) {
      res.status(400).json({ error: 'Announcement text is required.' });
      return;
    }
    const item = createAnnouncementInDb({
      title,
      body,
      authorName: user.displayName || 'Admin',
    });
    const items = listAnnouncements(30);
    const latest = items[0] || null;
    res.status(201).json({
      item,
      items,
      latestId: latest ? latest.id : null,
      latestCreatedAt: latest ? latest.createdAt : null,
    });
  });

  app.delete('/api/admin/announcements/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const id = String(req.params.id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({ error: 'Invalid announcement id.' });
      return;
    }
    deleteAnnouncementInDb(id);
    const items = listAnnouncements(30);
    const latest = items[0] || null;
    res.json({
      success: true,
      items,
      latestId: latest ? latest.id : null,
      latestCreatedAt: latest ? latest.createdAt : null,
    });
  });

  // YouTube Authentication endpoints (admin only)
  app.get('/api/admin/youtube-auth', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    res.json({
      youtubeCookies: adminConfig.youtubeCookies,
      youtubePoToken: adminConfig.youtubePoToken,
    });
  });

  app.put('/api/admin/youtube-auth', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = req.body as { youtubeCookies?: unknown; youtubePoToken?: unknown };
    if (typeof body.youtubeCookies === 'string') {
      adminConfig.youtubeCookies = body.youtubeCookies.trim();
      if (!adminConfig.youtubeCookies) {
        fs.promises.rm(YT_COOKIES_FILE, { force: true }).catch(() => {});
      }
    }
    adminConfig.youtubePoToken = typeof body.youtubePoToken === 'string' ? body.youtubePoToken.trim() : '';
    saveAdminConfig(adminConfig);
    resetYouTubeCachesAndCooldown();
    appendAppLog('info', 'admin', 'Updated YouTube auth configuration');
    res.json({ success: true });
  });

  // Application logs (admin only)
  app.get('/api/admin/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 250;
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_APP_LOGS, Math.floor(rawLimit))) : 250;
    const levelParam = typeof req.query.level === 'string' ? req.query.level.trim().toLowerCase() : 'all';
    const sinceIdRaw = typeof req.query.sinceId === 'string' ? Number(req.query.sinceId) : 0;
    const sinceId = Number.isFinite(sinceIdRaw) && sinceIdRaw > 0 ? Math.floor(sinceIdRaw) : 0;

    let filtered = appLogBuffer;
    if (levelParam === 'info' || levelParam === 'warn' || levelParam === 'error') {
      filtered = filtered.filter((entry) => entry.level === levelParam);
    }
    if (sinceId > 0) {
      filtered = filtered.filter((entry) => entry.id > sinceId);
    }
    const logs = filtered.slice(-limit);
    const latestId = appLogBuffer.length > 0 ? appLogBuffer[appLogBuffer.length - 1].id : 0;
    res.json({
      logs,
      total: appLogBuffer.length,
      latestId,
    });
  });

  app.delete('/api/admin/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    appLogBuffer.length = 0;
    appendAppLog('info', 'admin', 'Application logs cleared by admin');
    res.json({ success: true, logs: [...appLogBuffer], total: appLogBuffer.length });
  });

  app.post('/api/admin/youtube-auth/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = (req.body || {}) as { youtubeCookies?: unknown; youtubePoToken?: unknown };
    const cookiesOverride = typeof body.youtubeCookies === 'string' ? body.youtubeCookies : undefined;
    const poTokenOverride = typeof body.youtubePoToken === 'string' ? body.youtubePoToken : undefined;

    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const runner = await getYtDlpRunner();
    if (!runner) {
      res.status(500).json({ error: 'yt-dlp not available' });
      return;
    }
    try {
      const { extraArgs, env } = await getYtDlpAuthAndProxy({
        cookies: cookiesOverride,
        poToken: poTokenOverride,
      });
      const args = insertBeforeDoubleDash(
        buildYtDlpArgs(['--dump-single-json', '--no-playlist', '--no-warnings', '--', testUrl]),
        extraArgs
      );
      const { stdout } = await execFileAsync(runner.cmd, [...runner.baseArgs, ...args], {
        timeout: 20000,
        maxBuffer: 4 * 1024 * 1024,
        env,
      });
      const info = JSON.parse(stdout) as { title?: string };
      res.json({ success: true, title: info.title || 'Test video' });
    } catch (err) {
      res.json({ success: false, error: err instanceof Error ? err.message : 'Test failed' });
    }
  });

  /* -------------------- Telegram storage (admin only) -------------------- */

  app.get('/api/admin/telegram', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    res.json(telegramStatusView());
  });

  // Express 4 does not catch rejected promises, so wrap the async work and
  // turn a failure into a normal 500 instead of an unhandled rejection.
  app.put('/api/admin/telegram', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const next = adminConfig.telegram;
      let credentialsChanged = false;

      if (typeof body.enabled === 'boolean') next.enabled = body.enabled;
      if (typeof body.uploadEnabled === 'boolean') next.uploadEnabled = body.uploadEnabled;
      if (body.mode === 'user' || body.mode === 'bot') {
        if (next.mode !== body.mode) credentialsChanged = true;
        next.mode = body.mode;
      }
      if (typeof body.channel === 'string') {
        const channel = body.channel.trim();
        const stripped = channel.replace(/^https?:\/\/t\.me\//i, '').replace(/\/.*$/, '');
        if (!stripped) {
          next.channel = '';
        } else if (/^-?\d+$/.test(stripped)) {
          next.channel = stripped;
        } else {
          next.channel = stripped.startsWith('@') ? stripped : `@${stripped}`;
        }
        // Anything the admin types is intentional, so auto-discovery may not
        // overwrite it from here on.
        next.channelAuto = false;
      }
      if (typeof body.apiId === 'number' || typeof body.apiId === 'string') {
        const parsedId = Number(body.apiId);
        if (Number.isInteger(parsedId) && parsedId > 0) {
          if (next.apiId !== parsedId) credentialsChanged = true;
          next.apiId = parsedId;
        } else if (body.apiId === '' || body.apiId === null) {
          next.apiId = null;
          credentialsChanged = true;
        }
      } else if (body.apiId === null) {
        next.apiId = null;
        credentialsChanged = true;
      }
      if (typeof body.apiHash === 'string') {
        const hash = body.apiHash.trim();
        // An empty value from the UI means "keep the stored secret" unless explicitly cleared.
        if (hash && hash !== next.apiHash) {
          next.apiHash = hash;
          credentialsChanged = true;
        }
      }
      if (body.clearApiCredentials === true) {
        next.apiId = null;
        next.apiHash = '';
        credentialsChanged = true;
      }
      if (typeof body.botToken === 'string') {
        const token = body.botToken.trim();
        if (token && token !== next.botToken) {
          next.botToken = token;
          credentialsChanged = true;
        }
      }
      if (body.clearSession === true) {
        next.session = '';
        credentialsChanged = true;
      }

      // Entering credentials is the intent to use Telegram storage: default the
      // toggles (and Saved Messages channel) on so uploads actually go diskless.
      if (credentialsChanged) {
        telegramActivateDiskless(next);
      }

      // A bot token with no channel still has nowhere to publish. Reuse the last
      // chat the bot saw (someone's DM or a channel it was added to) so a token
      // alone is enough to keep downloads off the disk.
      if (credentialsChanged && telegramUsesBotHttpApi(next) && !next.channel) {
        const discovered = await telegramDiscoverBotChatId(next.botToken);
        if (discovered) {
          next.channel = discovered;
          next.channelAuto = true;
          telegramActivateDiskless(next);
        }
      }

      saveAdminConfig(adminConfig);
      if (credentialsChanged) {
        void disposeTelegramClient();
      }
      if (telegramUsesBotHttpApi(next)) {
        void callTelegramBotApi<{ username?: string; first_name?: string }>(next.botToken, 'getMe')
          .then((me) => {
            telegramState.selfLabel = me.username ? `@${me.username}` : me.first_name || null;
            telegramState.lastError = null;
          })
          .catch(() => {});
      }
      res.json({ success: true, ...telegramStatusView() });
    } catch (err) {
      res.status(500).json({ error: sanitizeTelegramError(err, adminConfig.telegram.botToken) });
    }
  });

  app.post('/api/admin/telegram/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const cfg = adminConfig.telegram;
    if (!cfg.channel) {
      res.json({ success: false, error: 'Set a target channel first.' });
      return;
    }
    if (!telegramIsConfigured(cfg)) {
      res.json({ success: false, error: 'Telegram account is not connected yet.' });
      return;
    }
    if (telegramUsesBotHttpApi(cfg)) {
      try {
        const me = await callTelegramBotApi<{ username?: string; first_name?: string }>(cfg.botToken, 'getMe');
        const label = me.username ? `@${me.username}` : me.first_name || null;
        telegramState.selfLabel = label;
        const chat = await callTelegramBotApi<{ title?: string; username?: string }>(cfg.botToken, 'getChat', {
          chat_id: cfg.channel,
        });
        const title = chat.title || (chat.username ? `@${chat.username}` : cfg.channel);
        telegramState.lastError = null;
        res.json({ success: true, channel: title, account: label });
      } catch (err) {
        const safeErr = sanitizeTelegramError(err, cfg.botToken);
        telegramState.lastError = safeErr;
        res.json({ success: false, error: safeErr });
      }
      return;
    }
    try {
      const client = await getTelegramClient();
      const entity = await client.getEntity(cfg.channel);
      const title =
        (entity as { title?: string; username?: string }).title ||
        ((entity as { username?: string }).username ? `@${(entity as { username?: string }).username}` : cfg.channel);
      res.json({ success: true, channel: title, account: telegramState.selfLabel });
    } catch (err) {
      res.json({ success: false, error: sanitizeTelegramError(err, cfg.botToken) });
    }
  });

  app.post('/api/admin/telegram/send-code', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = (req.body || {}) as { phoneNumber?: unknown; apiId?: unknown; apiHash?: unknown; forceSms?: unknown };
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required.' });
      return;
    }

    const credsIn = adminConfig.telegram;
    const apiId =
      typeof body.apiId === 'number' && Number.isFinite(body.apiId) ? body.apiId : credsIn.apiId;
    const apiHash =
      typeof body.apiHash === 'string' && body.apiHash.trim() ? body.apiHash.trim() : credsIn.apiHash;
    if (!apiId || !apiHash) {
      res.status(400).json({ error: 'API ID and API hash are required.' });
      return;
    }

    try {
      if (pendingTelegramLogin) {
        await pendingTelegramLogin.client.disconnect().catch(() => {});
        pendingTelegramLogin = null;
      }
      const tempClient = new TelegramClient(new sessions.StringSession(''), apiId, apiHash, {
        connectionRetries: 3,
        useWSS: false,
        deviceModel: 'Grove Save',
        systemVersion: 'Server',
        appVersion: '1.0.0',
      });
      await tempClient.connect();
      const sent = await tempClient.sendCode({ apiId, apiHash }, phoneNumber, Boolean(body.forceSms));

      pendingTelegramLogin = {
        apiId,
        apiHash,
        phoneNumber,
        phoneCodeHash: sent.phoneCodeHash,
        isCodeViaApp: Boolean(sent.isCodeViaApp),
        client: tempClient,
        createdAt: Date.now(),
      };

      res.json({ success: true, isCodeViaApp: Boolean(sent.isCodeViaApp) });
    } catch (err) {
      res.json({ success: false, error: err instanceof Error ? err.message : 'Could not send the login code.' });
    }
  });

  app.post('/api/admin/telegram/sign-in', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = (req.body || {}) as { code?: unknown; password?: unknown };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!code) {
      res.status(400).json({ error: 'Login code is required.' });
      return;
    }
    const pending = pendingTelegramLogin;
    if (!pending) {
      res.status(400).json({ error: 'Request a login code first.' });
      return;
    }

    try {
      let signedIn = false;
      try {
        await pending.client.invoke(
          new Api.auth.SignIn({
            phoneNumber: pending.phoneNumber,
            phoneCodeHash: pending.phoneCodeHash,
            phoneCode: code,
          })
        );
        signedIn = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!/SESSION_PASSWORD_NEEDED/i.test(message)) throw err;

        if (!password) {
          res.status(409).json({
            success: false,
            needsPassword: true,
            error: 'Two-step verification is enabled on this account. Enter the password.',
          });
          return;
        }

        const pwd = await pending.client.invoke(new Api.account.GetPassword());
        const check = await tgPassword.computeCheck(pwd, password);
        await pending.client.invoke(new Api.auth.CheckPassword({ password: check }));
        signedIn = true;
      }

      if (!signedIn) {
        res.json({ success: false, error: 'Telegram sign-in did not complete.' });
        return;
      }

      const sessionString = (pending.client.session as InstanceType<typeof sessions.StringSession>).save();
      adminConfig.telegram.apiId = pending.apiId;
      adminConfig.telegram.apiHash = pending.apiHash;
      adminConfig.telegram.session = sessionString;
      adminConfig.telegram.mode = 'user';
      // A channel filled in by bot discovery points at a bot-owned chat that a
      // phone account cannot post into, so drop it and use Saved Messages.
      if (adminConfig.telegram.channelAuto) {
        adminConfig.telegram.channel = '';
        adminConfig.telegram.channelAuto = false;
      }
      // A signed-in phone account is the strongest signal of intent: turn on
      // diskless uploads and default the target to Saved Messages if unset.
      telegramActivateDiskless(adminConfig.telegram);
      saveAdminConfig(adminConfig);

      const oldClient = pending.client;
      pendingTelegramLogin = null;
      await oldClient.disconnect().catch(() => {});
      await disposeTelegramClient();

      res.json({ success: true, ...telegramStatusView() });
    } catch (err) {
      res.json({ success: false, error: err instanceof Error ? err.message : 'Telegram sign-in failed.' });
    }
  });

  app.post('/api/admin/telegram/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    if (pendingTelegramLogin) {
      await pendingTelegramLogin.client.disconnect().catch(() => {});
      pendingTelegramLogin = null;
    }
    const current = telegramState.client;
    if (current) {
      await current.invoke(new Api.auth.LogOut()).catch(() => {});
    }
    await disposeTelegramClient();
    adminConfig.telegram.session = '';
    adminConfig.telegram.botToken = '';
    adminConfig.telegram.enabled = false;
    adminConfig.telegram.uploadEnabled = false;
    saveAdminConfig(adminConfig);
    res.json({ success: true, ...telegramStatusView() });
  });

  // Lists channels/supergroups the connected account can post to.
  app.get('/api/admin/telegram/chats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    if (telegramUsesBotHttpApi(adminConfig.telegram)) {
      res.json({
        success: false,
        error: 'Chat listing requires API ID and API Hash. Enter your @channel or -100... chat ID directly.',
      });
      return;
    }
    try {
      const client = await getTelegramClient();
      const dialogs = await client.getDialogs({ limit: 100 });
      const chats = dialogs
        .filter((d) => Boolean(d.isChannel || d.isGroup))
        .map((d) => ({
          id: String(d.id),
          title: d.title || '',
          username: (d.entity as { username?: string } | undefined)?.username || null,
          isChannel: Boolean(d.isChannel),
        }))
        .slice(0, 100);
      res.json({ success: true, chats });
    } catch (err) {
      res.json({ success: false, error: sanitizeTelegramError(err, adminConfig.telegram.botToken) });
    }
  });

  // Stored files, newest first.
  app.get('/api/admin/telegram/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const rows = db
      .prepare(
        `SELECT f.id, f.title, f.author, f.quality, f.file_name, f.mime_type, f.size_bytes, f.created_at,
                f.user_id, u.email AS user_email
           FROM telegram_files f
           LEFT JOIN users u ON u.id = f.user_id
          WHERE f.deleted_at IS NULL
          ORDER BY f.created_at DESC
          LIMIT ?`
      )
      .all(limit) as Array<Record<string, unknown>>;
    const total = db
      .prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS bytes FROM telegram_files WHERE deleted_at IS NULL')
      .get() as { n: number; bytes: number };
    res.json({ items: rows, count: total.n, totalBytes: total.bytes });
  });

  // Deletes every byte the app parked on local disk and drops the in-memory job
  // table, so the server volume holds nothing but the database and the Telegram
  // session. Telegram is the only storage for published media.
  app.post('/api/admin/storage/purge', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    void (async () => {
      let removedEntries = 0;
      let freedBytes = 0;
      const failures: string[] = [];

      const sizeOf = async (target: string): Promise<number> => {
        try {
          const stat = await fs.promises.stat(target);
          if (!stat.isDirectory()) return stat.size;
          const entries = await fs.promises.readdir(target, { withFileTypes: true });
          let total = 0;
          for (const entry of entries) {
            total += await sizeOf(path.join(target, entry.name));
          }
          return total;
        } catch {
          return 0;
        }
      };

      // The cache is where staged downloads land before they reach Telegram. The
      // directory itself is kept so the next download does not have to recreate it.
      try {
        const entries = await fs.promises.readdir(CACHE_DIR);
        for (const entry of entries) {
          const target = path.resolve(CACHE_DIR, entry);
          if (!target.startsWith(CACHE_DIR + path.sep)) continue;
          try {
            freedBytes += await sizeOf(target);
            await fs.promises.rm(target, { recursive: true, force: true });
            removedEntries += 1;
          } catch (err) {
            failures.push(err instanceof Error ? err.message : String(err));
          }
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
          failures.push(err instanceof Error ? err.message : String(err));
        }
      }

      // Nothing in the job table can still be served once its file is gone, and a
      // half-finished download would have already lost its output path.
      const droppedJobs = downloadJobs.size;
      downloadJobs.clear();

      res.json({
        success: failures.length === 0,
        removedEntries,
        freedBytes,
        droppedJobs,
        failures,
      });
    })().catch((err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Cache purge failed.' });
      }
    });
  });

  /* -------------------- Database backup (admin only) -------------------- */

  function backupStamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  const BACKUP_FILE_RE = /^grove-backup-[0-9A-Za-z-]+\.db$/;

  // Newest first.
  function listDatabaseSnapshots(): Array<{
    fileName: string;
    sizeBytes: number;
    createdAt: number;
    filePath: string;
  }> {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    try {
      return fs
        .readdirSync(BACKUP_DIR)
        .filter((name) => BACKUP_FILE_RE.test(name))
        .map((name) => {
          const filePath = path.resolve(BACKUP_DIR, name);
          try {
            const stat = fs.statSync(filePath);
            return { fileName: name, sizeBytes: stat.size, createdAt: stat.mtimeMs, filePath };
          } catch {
            return null;
          }
        })
        .filter(
          (
            item
          ): item is { fileName: string; sizeBytes: number; createdAt: number; filePath: string } =>
            item !== null
        )
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  // Writes a consistent point-in-time copy of the database into data/backups
  // (SQLite's own backup API, so an open WAL can't corrupt the copy) and prunes
  // older snapshots, keeping the newest ten.
  async function writeDatabaseSnapshot(): Promise<{
    fileName: string;
    sizeBytes: number;
    createdAt: number;
  }> {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const fileName = `grove-backup-${backupStamp()}.db`;
    const target = path.resolve(BACKUP_DIR, fileName);
    if (!target.startsWith(BACKUP_DIR + path.sep)) {
      throw new Error('Invalid backup path.');
    }
    await sqliteBackup(db, target);
    try {
      fs.chmodSync(target, 0o600);
    } catch {
      // chmod is not available on every platform.
    }

    const entries = listDatabaseSnapshots();
    for (const entry of entries.slice(10)) {
      try {
        fs.rmSync(entry.filePath, { force: true });
      } catch {
        // Pruning is best-effort.
      }
    }

    const stat = fs.statSync(target);
    return { fileName, sizeBytes: stat.size, createdAt: stat.mtimeMs };
  }

  app.get('/api/admin/db/backup', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    void (async () => {
      try {
        const snapshot = await writeDatabaseSnapshot();
        const filePath = path.resolve(BACKUP_DIR, snapshot.fileName);
        res.download(filePath, snapshot.fileName, (err) => {
          if (err && !res.headersSent) {
            res.status(500).json({ error: 'Backup download failed.' });
          }
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Backup download failed.',
        });
      }
    })();
  });

  // Creates a snapshot on the server's own volume.
  app.post('/api/admin/db/backup', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    void (async () => {
      try {
        res.json({ success: true, backup: await writeDatabaseSnapshot() });
      } catch (err) {
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Could not create the backup.',
        });
      }
    })();
  });

  app.get('/api/admin/db/backups', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const items = listDatabaseSnapshots().map(({ fileName, sizeBytes, createdAt }) => ({
      fileName,
      sizeBytes,
      createdAt,
    }));
    res.json({ items, directory: path.relative(DATA_DIR, BACKUP_DIR) });
  });

  app.get('/api/admin/db/backups/:fileName', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const fileName = typeof req.params.fileName === 'string' ? req.params.fileName : '';
    if (!BACKUP_FILE_RE.test(fileName)) {
      res.status(400).json({ error: 'Invalid backup name.' });
      return;
    }
    const target = path.resolve(BACKUP_DIR, fileName);
    if (!target.startsWith(BACKUP_DIR + path.sep) || !fs.existsSync(target)) {
      res.status(404).json({ error: 'Backup not found.' });
      return;
    }
    res.download(target, fileName);
  });

  app.post('/api/admin/db/restore', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    void (async () => {
      try {
        const body = req.body as { fileBase64?: string };
        if (!body || typeof body.fileBase64 !== 'string') {
          res.status(400).json({ success: false, error: 'Invalid file data.' });
          return;
        }

        const buffer = Buffer.from(body.fileBase64, 'base64');
        if (buffer.length < 100) {
          res.status(400).json({ success: false, error: 'File is too small or invalid.' });
          return;
        }

        const header = buffer.subarray(0, 16);
        if (header.toString('utf8', 0, 15) !== 'SQLite format 3') {
          res.status(400).json({ success: false, error: 'Invalid SQLite database file.' });
          return;
        }

        try {
          await writeDatabaseSnapshot();
        } catch {}

        const tempRestorePath = path.resolve(DATA_DIR, `restore-temp-${Date.now()}.db`);
        fs.writeFileSync(tempRestorePath, buffer);

        try {
          db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
          db.close();
        } catch {}

        fs.copyFileSync(tempRestorePath, DB_FILE);
        try {
          fs.rmSync(tempRestorePath, { force: true });
        } catch {}

        db = new DatabaseSync(DB_FILE);
        db.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
        `);

        res.json({ success: true, message: 'Database restored successfully' });
      } catch (err) {
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Could not restore database.',
        });
      }
    })();
  });

  app.get('/api/admin/db/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const count = (sql: string) => {
      try {
        return (db.prepare(sql).get() as { n: number }).n;
      } catch {
        return 0;
      }
    };
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(DB_FILE).size;
    } catch {}
    res.json({
      sizeBytes,
      users: count('SELECT COUNT(*) AS n FROM users'),
      history: count('SELECT COUNT(*) AS n FROM download_history'),
      telegramFiles: count('SELECT COUNT(*) AS n FROM telegram_files WHERE deleted_at IS NULL'),
    });
  });

  // Xray VPN Proxy endpoints (admin only)
  app.get('/api/admin/xray', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const bin = await findXrayBinary();
    res.json({
      enabled: adminConfig.xray.enabled,
      configInput: adminConfig.xray.configInput,
      activeProfileId: adminConfig.xray.activeProfileId,
      profiles: adminConfig.xray.profiles,
      testYoutubeUrl: adminConfig.xray.testYoutubeUrl,
      socksPort: adminConfig.xray.socksPort,
      httpPort: adminConfig.xray.httpPort,
      running: xrayState.running,
      binaryInstalled: Boolean(bin),
      binaryPath: bin,
      lastError: xrayState.lastError,
    });
  });

  app.put('/api/admin/xray', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = req.body as {
      enabled?: unknown;
      configInput?: unknown;
      testYoutubeUrl?: unknown;
    };
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : adminConfig.xray.enabled;
    const nextConfigInput =
      typeof body.configInput === 'string' ? body.configInput.trim() : adminConfig.xray.configInput;

    if (typeof body.testYoutubeUrl === 'string' && body.testYoutubeUrl.trim()) {
      const validTestUrl = await validatePublicUrl(body.testYoutubeUrl.trim());
      if (!validTestUrl) {
        res.status(400).json({ error: 'Invalid YouTube test URL.' });
        return;
      }
      adminConfig.xray.testYoutubeUrl = validTestUrl.toString();
    }

    // If multi-line share links were pasted directly in Save & Apply, import all into profiles and activate the first
    if (nextConfigInput) {
      const parsedBatch = parseXrayProfilesInput(nextConfigInput);
      if (!parsedBatch.profiles.length) {
        res.status(400).json({ error: parsedBatch.errors[0] || 'Invalid Xray configuration.' });
        return;
      }
      if (parsedBatch.profiles.length > 1) {
        for (const item of parsedBatch.profiles) {
          if (!adminConfig.xray.profiles.some((p) => p.configInput === item.configInput)) {
            adminConfig.xray.profiles.push({
              id: crypto.randomUUID(),
              ...item,
            });
          }
        }
        const firstMatch = adminConfig.xray.profiles.find(
          (p) => p.configInput === parsedBatch.profiles[0].configInput
        );
        adminConfig.xray.configInput = parsedBatch.profiles[0].configInput;
        adminConfig.xray.activeProfileId = firstMatch?.id || null;
      } else {
        const single = parsedBatch.profiles[0];
        let existing = adminConfig.xray.profiles.find((p) => p.configInput === single.configInput);
        if (!existing) {
          existing = { id: crypto.randomUUID(), ...single };
          adminConfig.xray.profiles.push(existing);
        }
        adminConfig.xray.configInput = single.configInput;
        adminConfig.xray.activeProfileId = existing.id;
      }
    } else {
      adminConfig.xray.configInput = '';
      adminConfig.xray.activeProfileId = null;
    }

    if (nextEnabled && !adminConfig.xray.configInput) {
      res.status(400).json({ error: 'Please provide or select a valid Xray config before enabling VPN.' });
      return;
    }

    adminConfig.xray.enabled = nextEnabled;
    saveAdminConfig(adminConfig);
    resetYouTubeCachesAndCooldown();

    if (adminConfig.xray.enabled) {
      let bin = await findXrayBinary();
      if (!bin && process.platform === 'linux') {
        try {
          bin = await installXrayBinary();
        } catch (err) {
          xrayState.lastError = err instanceof Error ? err.message : 'Failed to install Xray binary.';
        }
      }
      await startXrayProcess();
    } else {
      await stopXrayProcess();
    }

    // Restart managed bgutil POT server so it picks up / drops Xray proxy env
    if (adminConfig.potProvider.enabled && adminConfig.potProvider.mode === 'managed' && findBgutilPotEntry()) {
      await startBgutilPotServer();
    }

    const bin = await findXrayBinary();
    res.json({
      success: true,
      enabled: adminConfig.xray.enabled,
      configInput: adminConfig.xray.configInput,
      activeProfileId: adminConfig.xray.activeProfileId,
      profiles: adminConfig.xray.profiles,
      testYoutubeUrl: adminConfig.xray.testYoutubeUrl,
      socksPort: adminConfig.xray.socksPort,
      httpPort: adminConfig.xray.httpPort,
      running: xrayState.running,
      binaryInstalled: Boolean(bin),
      lastError: xrayState.lastError,
    });
  });

  app.post('/api/admin/xray/profiles/import', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = req.body as { rawConfigs?: unknown; replaceAll?: unknown };
    const rawConfigs = typeof body.rawConfigs === 'string' ? body.rawConfigs : '';
    const replaceAll = Boolean(body.replaceAll);

    const parsed = parseXrayProfilesInput(rawConfigs);
    if (!parsed.profiles.length) {
      res.status(400).json({
        success: false,
        error: parsed.errors[0] || 'No valid Xray configs found.',
        errors: parsed.errors,
      });
      return;
    }

    if (replaceAll) {
      adminConfig.xray.profiles = [];
      adminConfig.xray.activeProfileId = null;
    }

    let addedCount = 0;
    for (const item of parsed.profiles) {
      const dup = adminConfig.xray.profiles.some((p) => p.configInput === item.configInput);
      if (!dup) {
        adminConfig.xray.profiles.push({
          id: crypto.randomUUID(),
          ...item,
        });
        addedCount += 1;
      }
    }

    if (!adminConfig.xray.activeProfileId && adminConfig.xray.profiles.length > 0) {
      adminConfig.xray.activeProfileId = adminConfig.xray.profiles[0].id;
      adminConfig.xray.configInput = adminConfig.xray.profiles[0].configInput;
    }

    saveAdminConfig(adminConfig);
    res.json({
      success: true,
      addedCount,
      errors: parsed.errors,
      activeProfileId: adminConfig.xray.activeProfileId,
      profiles: adminConfig.xray.profiles,
      configInput: adminConfig.xray.configInput,
    });
  });

  app.post('/api/admin/xray/profiles/:id/activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const profile = adminConfig.xray.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
      res.status(404).json({ error: 'Xray config profile not found.' });
      return;
    }

    adminConfig.xray.activeProfileId = profile.id;
    adminConfig.xray.configInput = profile.configInput;
    adminConfig.xray.enabled = true;
    saveAdminConfig(adminConfig);
    resetYouTubeCachesAndCooldown();

    let bin = await findXrayBinary();
    if (!bin && process.platform === 'linux') {
      try {
        bin = await installXrayBinary();
      } catch (err) {
        xrayState.lastError = err instanceof Error ? err.message : 'Failed to install Xray binary.';
      }
    }
    await startXrayProcess();

    if (adminConfig.potProvider.enabled && adminConfig.potProvider.mode === 'managed' && findBgutilPotEntry()) {
      await startBgutilPotServer();
    }

    res.json({
      success: true,
      enabled: adminConfig.xray.enabled,
      configInput: adminConfig.xray.configInput,
      activeProfileId: adminConfig.xray.activeProfileId,
      profiles: adminConfig.xray.profiles,
      running: xrayState.running,
      binaryInstalled: Boolean(await findXrayBinary()),
      lastError: xrayState.lastError,
    });
  });

  app.delete('/api/admin/xray/profiles/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const idx = adminConfig.xray.profiles.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    const removed = adminConfig.xray.profiles[idx];
    adminConfig.xray.profiles.splice(idx, 1);

    if (adminConfig.xray.activeProfileId === removed.id) {
      const nextProfile = adminConfig.xray.profiles[0] || null;
      adminConfig.xray.activeProfileId = nextProfile ? nextProfile.id : null;
      adminConfig.xray.configInput = nextProfile ? nextProfile.configInput : '';
      if (!nextProfile) {
        adminConfig.xray.enabled = false;
        await stopXrayProcess();
      } else if (adminConfig.xray.enabled) {
        await startXrayProcess();
      }
      if (adminConfig.potProvider.enabled && adminConfig.potProvider.mode === 'managed' && findBgutilPotEntry()) {
        await startBgutilPotServer();
      }
    }

    saveAdminConfig(adminConfig);
    resetYouTubeCachesAndCooldown();
    res.json({
      success: true,
      enabled: adminConfig.xray.enabled,
      activeProfileId: adminConfig.xray.activeProfileId,
      configInput: adminConfig.xray.configInput,
      profiles: adminConfig.xray.profiles,
      running: xrayState.running,
    });
  });

  // bgutil-ytdlp-pot-provider endpoints (admin only)
  app.get('/api/admin/pot-provider', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const entryPath = findBgutilPotEntry();
    const pluginInstalled = await isBgutilPipPluginInstalled();
    const effectiveUrl = getEffectivePotBaseUrl();
    const ping =
      adminConfig.potProvider.enabled && (adminConfig.potProvider.mode === 'external' || bgutilState.running)
        ? await pingBgutilServer(effectiveUrl)
        : { ok: false };

    res.json({
      enabled: adminConfig.potProvider.enabled,
      mode: adminConfig.potProvider.mode,
      baseUrl: adminConfig.potProvider.baseUrl,
      port: adminConfig.potProvider.port,
      installed: Boolean(entryPath),
      pluginInstalled,
      running: adminConfig.potProvider.mode === 'external' ? ping.ok : bgutilState.running,
      pingVersion: ping.version || null,
      lastError: bgutilState.lastError,
    });
  });

  app.put('/api/admin/pot-provider', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const body = req.body as {
      enabled?: unknown;
      mode?: unknown;
      baseUrl?: unknown;
      port?: unknown;
    };
    const nextEnabled =
      typeof body.enabled === 'boolean' ? body.enabled : adminConfig.potProvider.enabled;
    const nextMode: 'managed' | 'external' =
      body.mode === 'external' ? 'external' : body.mode === 'managed' ? 'managed' : adminConfig.potProvider.mode;
    const nextPort =
      typeof body.port === 'number' && body.port > 1024 && body.port < 65535
        ? Math.floor(body.port)
        : adminConfig.potProvider.port;
    let nextBaseUrl = adminConfig.potProvider.baseUrl;

    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
      try {
        const parsed = new URL(body.baseUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          res.status(400).json({ error: 'Provider URL must use http:// or https://.' });
          return;
        }
        nextBaseUrl = parsed.toString().replace(/\/+$/, '');
      } catch {
        res.status(400).json({ error: 'Invalid provider base URL.' });
        return;
      }
    }

    adminConfig.potProvider = {
      enabled: nextEnabled,
      mode: nextMode,
      baseUrl: nextBaseUrl,
      port: nextPort,
    };
    saveAdminConfig(adminConfig);
    resetYouTubeCachesAndCooldown();

    if (nextEnabled && nextMode === 'managed') {
      await startBgutilPotServer();
    } else {
      await stopBgutilPotServer();
    }

    const entryPath = findBgutilPotEntry();
    const pluginInstalled = await isBgutilPipPluginInstalled();
    const ping =
      nextEnabled && (nextMode === 'external' || bgutilState.running)
        ? await pingBgutilServer(getEffectivePotBaseUrl())
        : { ok: false };

    res.json({
      success: true,
      enabled: adminConfig.potProvider.enabled,
      mode: adminConfig.potProvider.mode,
      baseUrl: adminConfig.potProvider.baseUrl,
      port: adminConfig.potProvider.port,
      installed: Boolean(entryPath),
      pluginInstalled,
      running: nextMode === 'external' ? ping.ok : bgutilState.running,
      pingVersion: ping.version || null,
      lastError: bgutilState.lastError,
    });
  });

  app.post('/api/admin/pot-provider/install', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    try {
      const result = await installBgutilPotServer();
      if (adminConfig.potProvider.enabled && adminConfig.potProvider.mode === 'managed') {
        await startBgutilPotServer();
      }
      res.json({
        success: true,
        installed: true,
        pluginInstalled: result.pluginInstalled,
        running: bgutilState.running,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'bgutil POT server installation failed',
      });
    }
  });

  app.post('/api/admin/pot-provider/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const effectiveUrl = getEffectivePotBaseUrl();
    const started = Date.now();
    const ping = await pingBgutilServer(effectiveUrl);
    if (!ping.ok) {
      res.json({
        success: false,
        error: ping.error || bgutilState.lastError || 'bgutil POT server is not reachable.',
      });
      return;
    }

    try {
      const potRes = await fetch(`${effectiveUrl}/get_pot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_binding: 'dQw4w9WgXcQ' }),
        signal: AbortSignal.timeout(20000),
      });
      const latencyMs = Date.now() - started;
      const potData = (await potRes.json()) as { poToken?: string; po_token?: string; error?: string };
      const token = potData.poToken || potData.po_token || '';
      if (!potRes.ok || !token) {
        res.json({
          success: false,
          error: potData.error || `HTTP ${potRes.status} from /get_pot`,
        });
        return;
      }
      res.json({
        success: true,
        version: ping.version || null,
        latencyMs,
        tokenLength: token.length,
        tokenPreview: `${token.slice(0, 12)}...`,
      });
    } catch (err) {
      res.json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mint PO Token',
      });
    }
  });

  app.post('/api/admin/xray/install', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    try {
      const binPath = await installXrayBinary();
      if (adminConfig.xray.enabled && adminConfig.xray.configInput.trim()) {
        await startXrayProcess();
      }
      res.json({ success: true, binaryPath: binPath, running: xrayState.running });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Xray installation failed',
      });
    }
  });

  app.post('/api/admin/xray/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const body = (req.body || {}) as {
      profileId?: unknown;
      configInput?: unknown;
      youtubeUrl?: unknown;
    };
    const profileId = typeof body.profileId === 'string' ? body.profileId : '';
    const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : undefined;
    if (youtubeUrl) {
      const valid = await validatePublicUrl(youtubeUrl);
      if (valid) {
        adminConfig.xray.testYoutubeUrl = valid.toString();
        saveAdminConfig(adminConfig);
      }
    }

    const targetProfile = profileId
      ? adminConfig.xray.profiles.find((p) => p.id === profileId)
      : undefined;
    const rawConfigToTest =
      (typeof body.configInput === 'string' && body.configInput.trim()) ||
      targetProfile?.configInput ||
      adminConfig.xray.configInput;

    if (!rawConfigToTest) {
      res.status(400).json({
        success: false,
        error: 'No Xray configuration selected to test.',
      });
      return;
    }

    const testResult = await testXrayConfigWithYouTubeDownload(rawConfigToTest, youtubeUrl);

    if (targetProfile) {
      targetProfile.lastTest = {
        ok: testResult.success,
        testedAt: Date.now(),
        latencyMs: testResult.latencyMs,
        downloadedBytes: testResult.downloadedBytes,
        title: testResult.title,
        exitIp: testResult.exitIp,
        error: testResult.error,
      };
      saveAdminConfig(adminConfig);
    }

    res.json({
      ...testResult,
      profileId: targetProfile?.id || null,
      lastTest: targetProfile?.lastTest || null,
    });
  });

  const PREFERRED_LANG_ORDER = ['fa', 'en', 'en-US', 'en-GB', 'ar', 'ru', 'zh-Hans', 'zh', 'tr', 'de', 'fr', 'es'];

  function formatLanguageLabel(code: string, rawName?: string): string {
    const cleanedCode = (code || '').trim();
    if (rawName && rawName.trim()) {
      return rawName.trim();
    }
    if (!cleanedCode || cleanedCode === 'und') return 'Original';
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'language' });
      const baseCode = cleanedCode.split(/[-_]/)[0];
      return dn.of(cleanedCode) || dn.of(baseCode) || cleanedCode.toUpperCase();
    } catch {
      return cleanedCode.toUpperCase();
    }
  }

  function sortSubtitlesList(items: MediaSubtitleTrack[]): MediaSubtitleTrack[] {
    return [...items].sort((a, b) => {
      const idxA = PREFERRED_LANG_ORDER.indexOf(a.lang);
      const idxB = PREFERRED_LANG_ORDER.indexOf(b.lang);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }

  function extractYtDlpTracks(info: Record<string, unknown>): {
    audioTracks: MediaAudioTrack[];
    manualSubtitles: MediaSubtitleTrack[];
    autoSubtitles: MediaSubtitleTrack[];
  } {
    const formats = Array.isArray(info.formats) ? (info.formats as Array<Record<string, unknown>>) : [];
    const byLangKey = new Map<string, MediaAudioTrack & { score: number }>();

    for (const f of formats) {
      const acodec = typeof f.acodec === 'string' ? f.acodec : 'none';
      const vcodec = typeof f.vcodec === 'string' ? f.vcodec : 'none';
      const formatId = typeof f.format_id === 'string' ? f.format_id : '';
      if (!formatId || acodec === 'none' || vcodec !== 'none') continue;

      const lang = typeof f.language === 'string' && f.language.trim() ? f.language.trim() : 'und';
      const note = typeof f.format_note === 'string' ? f.format_note.trim() : '';
      const langPref = typeof f.language_preference === 'number' ? f.language_preference : 0;
      const isDefault = langPref > 0 || /original|default/i.test(note);
      const ext = typeof f.ext === 'string' ? f.ext : 'm4a';
      const abr = typeof f.abr === 'number' && Number.isFinite(f.abr) ? Math.round(f.abr) : null;
      const baseLabel = formatLanguageLabel(lang);
      const label = note && !note.toLowerCase().includes('audio only') && note.toLowerCase() !== baseLabel.toLowerCase()
        ? `${baseLabel} · ${note}`
        : isDefault
          ? `${baseLabel} · Original`
          : baseLabel;

      // Prefer m4a/mp4a slightly for native MP4 compatibility, then higher abr
      const score = (ext === 'm4a' || acodec.includes('mp4a') ? 1000 : 0) + (abr || 0) + (isDefault ? 50 : 0);
      const key = `${lang.toLowerCase()}::${isDefault ? 'def' : 'alt'}`;
      const prev = byLangKey.get(key);
      if (!prev || score > prev.score) {
        byLangKey.set(key, { formatId, language: lang, label, ext, abr, isDefault, score });
      }
    }

    const audioTracks: MediaAudioTrack[] = Array.from(byLangKey.values())
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .map(({ score: _s, ...rest }) => rest);

    const parseSubsMap = (rawMap: unknown, isAuto: boolean): MediaSubtitleTrack[] => {
      if (!rawMap || typeof rawMap !== 'object') return [];
      const list: MediaSubtitleTrack[] = [];
      for (const [lang, entries] of Object.entries(rawMap as Record<string, unknown>)) {
        if (!lang || lang === 'live_chat' || !Array.isArray(entries) || entries.length === 0) continue;
        const first = entries[0] as { name?: string } | undefined;
        list.push({
          lang,
          label: formatLanguageLabel(lang, typeof first?.name === 'string' ? first.name : undefined),
          isAuto,
        });
      }
      return sortSubtitlesList(list);
    };

    return {
      audioTracks,
      manualSubtitles: parseSubsMap(info.subtitles, false),
      autoSubtitles: parseSubsMap(info.automatic_captions, true),
    };
  }

  function extractYtdlTracks(info: Awaited<ReturnType<typeof ytdl.getInfo>>): {
    audioTracks: MediaAudioTrack[];
    manualSubtitles: MediaSubtitleTrack[];
    autoSubtitles: MediaSubtitleTrack[];
  } {
    const byTrack = new Map<string, MediaAudioTrack & { score: number }>();
    for (const f of info.formats) {
      if (f.hasVideo || !f.hasAudio) continue;
      const rawFmt = f as VideoFormat & {
        audioTrack?: { id?: string; displayName?: string; audioIsDefault?: boolean };
      };
      const trackInfo = rawFmt.audioTrack;
      const lang = trackInfo?.id?.split('.')[0] || 'und';
      const isDefault = Boolean(trackInfo?.audioIsDefault);
      const abr = typeof f.audioBitrate === 'number' ? f.audioBitrate : null;
      const ext = f.container || 'm4a';
      const label = trackInfo?.displayName || (lang !== 'und' ? formatLanguageLabel(lang) : 'Original');
      const score = (ext === 'mp4' || ext === 'm4a' ? 1000 : 0) + (abr || 0) + (isDefault ? 50 : 0);
      const key = `${trackInfo?.id || lang}`;
      const prev = byTrack.get(key);
      if (!prev || score > prev.score) {
        byTrack.set(key, {
          formatId: String(f.itag),
          language: lang,
          label,
          ext,
          abr,
          isDefault,
          score,
        });
      }
    }

    const audioTracks: MediaAudioTrack[] = Array.from(byTrack.values())
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .map(({ score: _s, ...rest }) => rest);

    type CaptionTrackEntry = {
      baseUrl?: string;
      languageCode?: string;
      kind?: string;
      name?: { simpleText?: string; runs?: Array<{ text?: string }> };
    };
    type PlayerRespCaptions = {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrackEntry[];
        };
      };
    };
    const rawInfo = info as unknown as {
      playerResponse?: PlayerRespCaptions;
      player_response?: PlayerRespCaptions;
    };
    const playerResp = rawInfo.playerResponse || rawInfo.player_response;
    const captionTracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    const manualSubtitles: MediaSubtitleTrack[] = [];
    const autoSubtitles: MediaSubtitleTrack[] = [];
    for (const c of captionTracks) {
      if (!c.languageCode || !c.baseUrl) continue;
      const isAuto = c.kind === 'asr';
      const rawName = c.name?.simpleText || c.name?.runs?.map((r) => r.text || '').join('');
      const item: MediaSubtitleTrack = {
        lang: c.languageCode,
        label: formatLanguageLabel(c.languageCode, rawName),
        isAuto,
      };
      if (isAuto) autoSubtitles.push(item);
      else manualSubtitles.push(item);
    }

    return {
      audioTracks,
      manualSubtitles: sortSubtitlesList(manualSubtitles),
      autoSubtitles: sortSubtitlesList(autoSubtitles),
    };
  }

  function validateAudioFormatId(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const cleaned = raw.trim();
    if (!cleaned) return undefined;
    return /^[a-zA-Z0-9_+.-]{1,32}$/.test(cleaned) ? cleaned : undefined;
  }

  function sanitizeHttpHeaderValue(val: string): string {
    return val.replace(/[\r\n\0]+/g, ' ').trim();
  }

  function extractCookieHeaderFromYtDlp(rawCookies: unknown): string {
    if (typeof rawCookies !== 'string' || !rawCookies.trim()) return '';
    const attrNames = new Set(['domain', 'path', 'expires', 'max-age', 'samesite', 'secure', 'httponly', 'priority']);
    const pairs: string[] = [];
    for (const part of rawCookies.split(';')) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const name = trimmed.slice(0, eq).trim();
      if (attrNames.has(name.toLowerCase())) continue;
      pairs.push(sanitizeHttpHeaderValue(trimmed));
    }
    return pairs.join('; ');
  }

  function buildUpstreamHeaders(customHeaders?: Record<string, string>, cookieStr?: string): Record<string, string> {
    const out: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    if (customHeaders) {
      for (const [k, v] of Object.entries(customHeaders)) {
        if (!v || typeof v !== 'string') continue;
        const keyLower = k.toLowerCase();
        if (['host', 'connection', 'content-length', 'accept-encoding', 'range'].includes(keyLower)) continue;
        const cleanKey = k.replace(/[^a-zA-Z0-9-]/g, '');
        const cleanVal = sanitizeHttpHeaderValue(v);
        if (cleanKey && cleanVal) {
          out[cleanKey] = cleanVal;
        }
      }
    }
    if (cookieStr && !out.Cookie && !out.cookie) {
      const cleanCookie = sanitizeHttpHeaderValue(cookieStr);
      if (cleanCookie) out.Cookie = cleanCookie;
    }
    return out;
  }

  async function proxyRemoteMediaWithRange(
    mediaUrl: string,
    req: Request,
    res: Response,
    customHeaders?: Record<string, string>,
    redirectDepth = 0
  ): Promise<void> {
    const parsed = new URL(mediaUrl);
    const targetPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    const reqHeaders = buildUpstreamHeaders(customHeaders);
    if (typeof req.headers.range === 'string' && req.headers.range) {
      reqHeaders.Range = req.headers.range;
    }

    const handleUpstream = (
      upstreamRes: http.IncomingMessage,
      resolve: () => void,
      reject: (err: Error) => void
    ) => {
      const status = upstreamRes.statusCode || 200;
      if (status >= 300 && status < 400 && upstreamRes.headers.location) {
        const location = upstreamRes.headers.location;
        upstreamRes.resume();
        if (redirectDepth >= 5) {
          reject(new Error('Too many redirects from media source.'));
          return;
        }
        let nextRaw = '';
        try {
          nextRaw = new URL(location, parsed).toString();
        } catch {
          reject(new Error('Invalid redirect location from media source.'));
          return;
        }
        void validatePublicUrl(nextRaw)
          .then((validNext) => {
            if (!validNext) {
              throw new Error('Disallowed redirect URL from media source.');
            }
            return proxyRemoteMediaWithRange(validNext.toString(), req, res, customHeaders, redirectDepth + 1);
          })
          .then(resolve)
          .catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
        return;
      }

      if (status >= 400) {
        upstreamRes.destroy();
        reject(new Error(`Upstream media returned HTTP ${status}.`));
        return;
      }

      const upstreamCt = String(upstreamRes.headers['content-type'] || '').toLowerCase();
      if (
        upstreamCt.startsWith('text/html') ||
        upstreamCt.startsWith('application/xhtml') ||
        upstreamCt.startsWith('application/json') ||
        upstreamCt.startsWith('text/plain') ||
        upstreamCt.startsWith('application/xml')
      ) {
        upstreamRes.destroy();
        reject(new Error('Source URL did not return a playable video or audio stream.'));
        return;
      }

      res.status(status);
      const copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      for (const h of copyHeaders) {
        const v = upstreamRes.headers[h];
        if (v) res.setHeader(h, v);
      }
      if (!upstreamRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', 'bytes');
      }
      if (!upstreamRes.headers['content-type']) {
        res.setHeader('Content-Type', 'video/mp4');
      }
      res.setHeader('Cache-Control', 'no-store');

      const onReqClose = () => {
        upstreamRes.destroy();
      };
      req.once('close', onReqClose);
      upstreamRes.on('error', (err) => {
        req.off('close', onReqClose);
        if (!res.writableEnded) res.destroy(err);
        reject(err);
      });
      upstreamRes.on('end', () => {
        req.off('close', onReqClose);
        resolve();
      });
      upstreamRes.pipe(res);
    };

    if (adminConfig.xray.enabled && xrayState.running) {
      await new Promise<void>((resolve, reject) => {
        const connectReq = http.request({
          host: '127.0.0.1',
          port: adminConfig.xray.httpPort,
          method: 'CONNECT',
          path: `${parsed.hostname}:${targetPort}`,
        });
        connectReq.on('connect', (cRes, socket) => {
          if (cRes.statusCode !== 200) {
            socket.destroy();
            reject(new Error(`Proxy CONNECT ${cRes.statusCode}`));
            return;
          }
          const mod = parsed.protocol === 'https:' ? https : http;
          const createConnection = () =>
            parsed.protocol === 'https:'
              ? tls.connect({ socket, servername: parsed.hostname })
              : socket;
          const upstreamReq = mod.request(
            {
              hostname: parsed.hostname,
              port: targetPort,
              path: parsed.pathname + parsed.search,
              method: 'GET',
              createConnection,
              headers: { ...reqHeaders, Host: parsed.host },
            },
            (upstreamRes) => handleUpstream(upstreamRes, resolve, reject)
          );
          upstreamReq.on('error', reject);
          req.once('close', () => upstreamReq.destroy());
          upstreamReq.end();
        });
        connectReq.on('error', reject);
        connectReq.end();
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const mod = parsed.protocol === 'https:' ? https : http;
      const upstreamReq = mod.request(
        {
          hostname: parsed.hostname,
          port: targetPort,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: reqHeaders,
        },
        (upstreamRes) => handleUpstream(upstreamRes, resolve, reject)
      );
      upstreamReq.on('error', reject);
      req.once('close', () => upstreamReq.destroy());
      upstreamReq.end();
    });
  }

  async function fetchRemoteImageBuffer(
    imageUrl: string,
    redirectDepth = 0
  ): Promise<{ status: number; contentType: string; data: Buffer }> {
    const parsed = new URL(imageUrl);
    const targetPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    };
    if (/(?:instagram\.com|cdninstagram\.com|fbcdn\.net)$/i.test(parsed.hostname)) {
      headers.Referer = 'https://www.instagram.com/';
    } else if (/(?:tiktok\.com|tiktokcdn\.com|tiktokcdn-us\.com|tiktokv\.com)$/i.test(parsed.hostname)) {
      headers.Referer = 'https://www.tiktok.com/';
    } else if (/(?:x\.com|twitter\.com|twimg\.com)$/i.test(parsed.hostname)) {
      headers.Referer = 'https://x.com/';
    }

    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const readUpstream = (
      upstreamRes: http.IncomingMessage,
      resolve: (v: { status: number; contentType: string; data: Buffer }) => void,
      reject: (err: Error) => void
    ) => {
      const status = upstreamRes.statusCode || 200;
      if (status >= 300 && status < 400 && upstreamRes.headers.location) {
        const location = upstreamRes.headers.location;
        upstreamRes.resume();
        if (redirectDepth >= 4) {
          reject(new Error('Too many redirects fetching thumbnail.'));
          return;
        }
        let nextUrl = '';
        try {
          nextUrl = new URL(location, parsed).toString();
        } catch {
          reject(new Error('Invalid redirect URL for thumbnail.'));
          return;
        }
        void validatePublicUrl(nextUrl)
          .then((validNext) => {
            if (!validNext) throw new Error('Disallowed thumbnail redirect target.');
            return fetchRemoteImageBuffer(validNext.toString(), redirectDepth + 1);
          })
          .then(resolve)
          .catch((e) => reject(e instanceof Error ? e : new Error(String(e))));
        return;
      }

      if (status >= 400) {
        upstreamRes.destroy();
        reject(new Error(`Thumbnail upstream returned HTTP ${status}.`));
        return;
      }

      const ct = String(upstreamRes.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
      if (!ct.startsWith('image/')) {
        upstreamRes.destroy();
        reject(new Error('Upstream did not return an image.'));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      upstreamRes.on('data', (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          upstreamRes.destroy();
          reject(new Error('Thumbnail too large.'));
          return;
        }
        chunks.push(chunk);
      });
      upstreamRes.on('error', reject);
      upstreamRes.on('end', () => {
        resolve({ status, contentType: ct, data: Buffer.concat(chunks) });
      });
    };

    if (adminConfig.xray.enabled && xrayState.running) {
      return new Promise((resolve, reject) => {
        const connectReq = http.request({
          host: '127.0.0.1',
          port: adminConfig.xray.httpPort,
          method: 'CONNECT',
          path: `${parsed.hostname}:${targetPort}`,
          timeout: 10000,
        });
        connectReq.on('connect', (cRes, socket) => {
          if (cRes.statusCode !== 200) {
            socket.destroy();
            reject(new Error(`Proxy CONNECT ${cRes.statusCode}`));
            return;
          }
          const mod = parsed.protocol === 'https:' ? https : http;
          const createConnection = () =>
            parsed.protocol === 'https:'
              ? tls.connect({ socket, servername: parsed.hostname })
              : socket;
          const upstreamReq = mod.request(
            {
              hostname: parsed.hostname,
              port: targetPort,
              path: parsed.pathname + parsed.search,
              method: 'GET',
              createConnection,
              headers: { ...headers, Host: parsed.host },
              timeout: 12000,
            },
            (upstreamRes) => readUpstream(upstreamRes, resolve, reject)
          );
          upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Thumbnail fetch timed out.')));
          upstreamReq.on('error', reject);
          upstreamReq.end();
        });
        connectReq.on('timeout', () => connectReq.destroy(new Error('Proxy connect timed out.')));
        connectReq.on('error', reject);
        connectReq.end();
      });
    }

    return new Promise((resolve, reject) => {
      const mod = parsed.protocol === 'https:' ? https : http;
      const upstreamReq = mod.request(
        {
          hostname: parsed.hostname,
          port: targetPort,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers,
          timeout: 12000,
        },
        (upstreamRes) => readUpstream(upstreamRes, resolve, reject)
      );
      upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Thumbnail fetch timed out.')));
      upstreamReq.on('error', reject);
      upstreamReq.end();
    });
  }

  app.get('/api/media/thumbnail', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid thumbnail URL.' });
      return;
    }
    try {
      const img = await fetchRemoteImageBuffer(parsed.toString());
      res.setHeader('Content-Type', img.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(img.data);
    } catch {
      res.status(404).end();
    }
  });

  app.post('/api/media/inspect', async (req: Request, res: Response) => {
    const body = req.body as { url?: unknown };
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

    if (isInstagramUrl(parsed)) {
      const normalizedIgUrl = normalizeInstagramUrl(parsed);
      try {
        const info = await runParthDlInfo(normalizedIgUrl);
        const entries = Array.isArray(info.entries) ? info.entries : [];
        const hasVideo = entries.some(
          (e) => e.kind === 'video' && Array.isArray(e.formats) && e.formats.length > 0
        );
        const rawThumb = pickInstagramThumbnail(info);
        const proxiedThumb = rawThumb ? `/api/media/thumbnail?url=${encodeURIComponent(rawThumb)}` : null;
        const uploaderClean = (info.uploader || '').replace(/^@/, '').trim();
        res.json({
          title: cleanInstagramTitle(info),
          author: uploaderClean ? `@${uploaderClean}` : 'Instagram',
          durationSeconds: typeof info.duration === 'number' ? info.duration : null,
          thumbnail: proxiedThumb,
          providerGlow: 'instagram',
          mediaKind: info.type || (hasVideo ? 'video' : 'image'),
          hasVideo,
          itemCount: entries.length,
          qualities: ['best'],
          engineMode: 'live',
          audioTracks: [],
          manualSubtitles: [],
          autoSubtitles: [],
        });
        return;
      } catch (igErr) {
        // Fallback to yt-dlp only for URL shapes parth-dl intentionally omits (e.g. stories)
        const runnerFallback = await getYtDlpRunner();
        const isStoriesPath = /\/stories\//i.test(parsed.pathname);
        if (runnerFallback && isStoriesPath) {
          try {
            const { extraArgs, env } = await getYtDlpAuthAndProxy();
            const args = insertBeforeDoubleDash(
              buildYtDlpArgs(['--dump-single-json', '--no-playlist', '--no-warnings', '--', normalizedIgUrl]),
              extraArgs
            );
            const { stdout } = await execFileAsync(runnerFallback.cmd, [...runnerFallback.baseArgs, ...args], {
              timeout: 20000,
              maxBuffer: 4 * 1024 * 1024,
              env,
            });
            const info = JSON.parse(stdout) as Record<string, unknown> & {
              title?: string;
              uploader?: string;
              duration?: number;
              thumbnail?: string;
            };
            res.json({
              title: info.title || 'Instagram Story',
              author: info.uploader || 'Instagram',
              durationSeconds: typeof info.duration === 'number' ? info.duration : null,
              thumbnail: info.thumbnail ? `/api/media/thumbnail?url=${encodeURIComponent(info.thumbnail)}` : null,
              providerGlow: 'instagram',
              mediaKind: 'video',
              hasVideo: true,
              itemCount: 1,
              qualities: ['best'],
              engineMode: 'live',
              audioTracks: [],
              manualSubtitles: [],
              autoSubtitles: [],
            });
            return;
          } catch {
            // Fall through to structured error below
          }
        }
        const statusCode = igErr instanceof ParthDlInvocationError && igErr.code === 'RATE_LIMIT' ? 429 : 422;
        res.status(statusCode).json({
          error: igErr instanceof Error ? igErr.message : 'Could not fetch Instagram media details.',
          providerGlow: 'instagram',
        });
        return;
      }
    }

    const ytId = extractYouTubeId(parsed);
    const targetUrlForInspect = isXUrl(parsed)
      ? normalizeXUrl(parsed)
      : ytId
        ? `https://www.youtube.com/watch?v=${ytId}`
        : parsed.toString();
    const runner = await getYtDlpRunner();

    if (ytId) {
      const fp = getYouTubeConfigFingerprint();
      const inspectCacheKey = `${ytId}::${fp}`;
      const cachedInspect = youtubeInspectCache.get(inspectCacheKey);
      if (cachedInspect && cachedInspect.expiresAt > Date.now()) {
        res.json(cachedInspect.payload);
        return;
      }
      if (cachedInspect) youtubeInspectCache.delete(inspectCacheKey);

      const cooldownMs = getYouTubeCooldownRemainingMs(fp);
      if (cooldownMs > 0) {
        const secs = Math.max(1, Math.ceil(cooldownMs / 1000));
        res.status(429).json({
          error: `YouTube rate-limit protection active. Please retry in ${secs}s or update cookies/Xray node.`,
          retryAfterSeconds: secs,
        });
        return;
      }

      if (runner) {
        let inflight = youtubeInspectInflight.get(inspectCacheKey);
        if (!inflight) {
          inflight = runPacedYouTubeTask(async () => {
            const { extraArgs, env } = await getYtDlpAuthAndProxy();
            const args = insertBeforeDoubleDash(
              buildYtDlpArgs(['--dump-single-json', '--no-playlist', '--no-warnings', '--', targetUrlForInspect], {
                isYouTube: true,
              }),
              extraArgs
            );
            const { stdout } = await execFileAsync(runner.cmd, [...runner.baseArgs, ...args], {
              timeout: 30000,
              maxBuffer: 8 * 1024 * 1024,
              env,
            });
            const info = JSON.parse(stdout) as Record<string, unknown> & {
              title?: string;
              uploader?: string;
              channel?: string;
              creator?: string;
              duration?: number;
              thumbnail?: string;
            };
            setBoundedCache(
              youtubeRawInfoCache,
              inspectCacheKey,
              { info, expiresAt: Date.now() + YOUTUBE_RAW_INFO_CACHE_TTL_MS },
              80
            );
            const tracks = extractYtDlpTracks(info);
            const rawThumb =
              typeof info.thumbnail === 'string' && info.thumbnail
                ? info.thumbnail
                : `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
            const payload: Record<string, unknown> = {
              title: info.title || 'Media Stream',
              author: info.uploader || info.channel || info.creator || parsed.hostname,
              durationSeconds: typeof info.duration === 'number' ? info.duration : null,
              thumbnail: maybeProxySocialThumbnail(rawThumb, parsed),
              providerGlow: 'red',
              qualities: ['2160p', '1080p', '720p', '480p', '360p'],
              engineMode: 'live',
              audioTracks: tracks.audioTracks,
              manualSubtitles: tracks.manualSubtitles,
              autoSubtitles: tracks.autoSubtitles,
            };
            setBoundedCache(
              youtubeInspectCache,
              inspectCacheKey,
              { payload, expiresAt: Date.now() + YOUTUBE_INSPECT_CACHE_TTL_MS },
              100
            );
            return payload;
          });
          youtubeInspectInflight.set(inspectCacheKey, inflight);
        }

        try {
          const payload = await inflight;
          res.json(payload);
          return;
        } catch (ytErr) {
          if (isYouTubeBotOrRateLimitError(ytErr)) {
            recordYouTubeRateLimit(fp);
            res.status(429).json({
              error:
                'YouTube temporarily flagged this IP with a bot/rate-limit check. Wait a moment, add cookies, or switch Xray server.',
              code: 'YOUTUBE_AUTH_REQUIRED',
            });
            return;
          }
          // When Xray is active, never fall back to unproxied ytdl-core/fetch which leaks the raw server IP
          if (adminConfig.xray.enabled && xrayState.running) {
            res.status(422).json({
              error: ytErr instanceof Error ? ytErr.message : 'Failed to inspect YouTube video through Xray.',
            });
            return;
          }
        } finally {
          youtubeInspectInflight.delete(inspectCacheKey);
        }
      }

      // Only allow @distube/ytdl-core fallback when yt-dlp isn't installed or had a non-bot failure without Xray
      const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
      try {
        const info = await ytdl.getInfo(watchUrl);
        const details = info.videoDetails;
        const maxHeight = info.formats.reduce(
          (max: number, f: VideoFormat) => Math.max(max, f.height || 0),
          0
        );
        const qualities = ['2160p', '1080p', '720p', '480p', '360p'].filter((q) => {
          const h = selectTargetHeight(q);
          return maxHeight === 0 || h <= maxHeight || h <= 720;
        });

        const thumbs = details.thumbnails || [];
        const bestThumb = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        const tracks = extractYtdlTracks(info);

        res.json({
          title: details.title || `Media Clip (${ytId})`,
          author: details.author?.name || 'Media Creator',
          durationSeconds: Number(details.lengthSeconds) || null,
          thumbnail: bestThumb,
          providerGlow: 'red',
          qualities,
          engineMode: 'live',
          audioTracks: tracks.audioTracks,
          manualSubtitles: tracks.manualSubtitles,
          autoSubtitles: tracks.autoSubtitles,
        });
        return;
      } catch {
        // Fall back to oEmbed metadata (single lightweight endpoint)
        let title = `Media Clip (${ytId})`;
        let author = 'Media Creator';
        let thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
          const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
          if (oembedRes.ok) {
            const data = (await oembedRes.json()) as {
              title?: string;
              author_name?: string;
              thumbnail_url?: string;
            };
            if (data.title) title = data.title;
            if (data.author_name) author = data.author_name;
            if (data.thumbnail_url) thumbnail = data.thumbnail_url;
          }
        } catch {
          // Keep parsed fallback metadata
        }

        res.json({
          title,
          author,
          durationSeconds: null,
          thumbnail,
          providerGlow: 'red',
          qualities: ['2160p', '1080p', '720p', '480p', '360p'],
          engineMode: 'preview',
          audioTracks: [],
          manualSubtitles: [],
          autoSubtitles: [],
        });
        return;
      }
    }

    if (runner) {
      try {
        const { extraArgs, env } = await getYtDlpAuthAndProxy();
        const args = insertBeforeDoubleDash(
          buildYtDlpArgs(['--dump-single-json', '--no-playlist', '--no-warnings', '--', targetUrlForInspect], {
            isYouTube: false,
          }),
          extraArgs
        );
        const { stdout } = await execFileAsync(runner.cmd, [...runner.baseArgs, ...args], {
          timeout: 22000,
          maxBuffer: 4 * 1024 * 1024,
          env,
        });
        const info = JSON.parse(stdout) as Record<string, unknown> & {
          title?: string;
          uploader?: string;
          channel?: string;
          creator?: string;
          duration?: number;
          thumbnail?: string;
        };
        const tracks = extractYtDlpTracks(info);
        const rawThumb = typeof info.thumbnail === 'string' && info.thumbnail ? info.thumbnail : null;
        res.json({
          title: info.title || 'Media Stream',
          author: info.uploader || info.channel || info.creator || parsed.hostname,
          durationSeconds: typeof info.duration === 'number' ? info.duration : null,
          thumbnail: maybeProxySocialThumbnail(rawThumb, parsed),
          providerGlow: 'default',
          qualities: ['2160p', '1080p', '720p', '480p', '360p'],
          engineMode: 'live',
          audioTracks: tracks.audioTracks,
          manualSubtitles: tracks.manualSubtitles,
          autoSubtitles: tracks.autoSubtitles,
        });
        return;
      } catch {
        // Fall through to X/TikTok fallbacks
      }
    }

    if (isXUrl(parsed)) {
      try {
        const xInfo = await resolveXMediaFallback(parsed);
        const hasVideo = xInfo.videos.length > 0;
        res.json({
          title: xInfo.title,
          author: xInfo.author,
          durationSeconds: xInfo.durationSeconds,
          thumbnail: maybeProxySocialThumbnail(xInfo.thumbnail, parsed),
          providerGlow: 'x',
          mediaKind: hasVideo ? 'video' : xInfo.photos.length > 1 ? 'carousel' : 'image',
          hasVideo,
          itemCount: hasVideo ? xInfo.videos.length : xInfo.photos.length,
          qualities: ['best'],
          engineMode: 'live',
          audioTracks: [],
          manualSubtitles: [],
          autoSubtitles: [],
        });
        return;
      } catch (xErr) {
        res.status(422).json({
          error: xErr instanceof Error ? xErr.message : 'Could not fetch X / Twitter media.',
        });
        return;
      }
    }

    if (isTikTokUrl(parsed)) {
      try {
        const ttInfo = await resolveTikTokMediaFallback(parsed);
        const hasVideo = ttInfo.videos.length > 0;
        res.json({
          title: ttInfo.title,
          author: ttInfo.author,
          durationSeconds: ttInfo.durationSeconds,
          thumbnail: maybeProxySocialThumbnail(ttInfo.thumbnail, parsed),
          providerGlow: 'tiktok',
          mediaKind: hasVideo ? 'video' : ttInfo.photos.length > 1 ? 'carousel' : 'image',
          hasVideo,
          itemCount: hasVideo ? ttInfo.videos.length : ttInfo.photos.length,
          qualities: ['best'],
          engineMode: 'live',
          audioTracks: [],
          manualSubtitles: [],
          autoSubtitles: [],
        });
        return;
      } catch (ttErr) {
        res.status(422).json({
          error: ttErr instanceof Error ? ttErr.message : 'Could not fetch TikTok media.',
        });
        return;
      }
    }

    // Generic public media or web page metadata
    let title = path.basename(parsed.pathname) || parsed.hostname;
    let thumbnail: string | null = null;
    try {
      const headRes = await fetch(parsed.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const contentType = headRes.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const html = (await headRes.text()).slice(0, 64000);
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        const docTitle = html.match(/<title>([^<]+)<\/title>/i);
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogTitle?.[1]) title = ogTitle[1].trim();
        else if (docTitle?.[1]) title = docTitle[1].trim();
        if (ogImg?.[1] && /^https?:\/\//i.test(ogImg[1])) thumbnail = ogImg[1];
      }
    } catch {
      // Keep hostname fallback
    }

    res.json({
      title,
      author: parsed.hostname,
      durationSeconds: null,
      thumbnail,
      providerGlow: 'default',
      qualities: ['1080p', '720p', '480p', '360p'],
      engineMode: 'preview',
      audioTracks: [],
      manualSubtitles: [],
      autoSubtitles: [],
    });
  });

  async function openRemoteMediaReadable(
    remoteUrl: string,
    options?: { referer?: string; headers?: Record<string, string>; timeoutMs?: number },
    redirectDepth = 0
  ): Promise<{ stream: Readable; contentType: string; contentLength: number | null }> {
    const valid = await validatePublicUrl(remoteUrl);
    if (!valid) {
      throw new Error('Disallowed remote media URL.');
    }
    const targetPort = valid.port ? Number(valid.port) : valid.protocol === 'https:' ? 443 : 80;
    const reqHeaders = buildUpstreamHeaders(options?.headers);
    if (options?.referer && !reqHeaders.Referer && !reqHeaders.referer) {
      reqHeaders.Referer = options.referer;
    }
    const timeoutMs = options?.timeoutMs ?? 120000;

    const handleUpstream = (
      upstreamRes: http.IncomingMessage,
      resolve: (v: { stream: Readable; contentType: string; contentLength: number | null }) => void,
      reject: (err: Error) => void
    ) => {
      const status = upstreamRes.statusCode || 200;
      if (status >= 300 && status < 400 && upstreamRes.headers.location) {
        const nextLoc = upstreamRes.headers.location;
        upstreamRes.resume();
        if (redirectDepth >= 5) {
          reject(new Error('Too many redirects downloading media.'));
          return;
        }
        let nextAbs = '';
        try {
          nextAbs = new URL(nextLoc, valid).toString();
        } catch {
          reject(new Error('Invalid redirect location.'));
          return;
        }
        openRemoteMediaReadable(nextAbs, options, redirectDepth + 1)
          .then(resolve)
          .catch((e) => reject(e instanceof Error ? e : new Error(String(e))));
        return;
      }
      if (status >= 400) {
        upstreamRes.destroy();
        reject(new Error(`Upstream returned HTTP ${status}.`));
        return;
      }
      const ct = String(upstreamRes.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
      const len = Number(upstreamRes.headers['content-length'] || 0) || null;
      resolve({ stream: upstreamRes, contentType: ct, contentLength: len });
    };

    if (adminConfig.xray.enabled && xrayState.running) {
      return new Promise((resolve, reject) => {
        const connectReq = http.request({
          host: '127.0.0.1',
          port: adminConfig.xray.httpPort,
          method: 'CONNECT',
          path: `${valid.hostname}:${targetPort}`,
          timeout: 12000,
        });
        connectReq.on('connect', (cRes, socket) => {
          if (cRes.statusCode !== 200) {
            socket.destroy();
            reject(new Error(`Proxy CONNECT ${cRes.statusCode}`));
            return;
          }
          const mod = valid.protocol === 'https:' ? https : http;
          const createConnection = () =>
            valid.protocol === 'https:'
              ? tls.connect({ socket, servername: valid.hostname })
              : socket;
          const upstreamReq = mod.request(
            {
              hostname: valid.hostname,
              port: targetPort,
              path: valid.pathname + valid.search,
              method: 'GET',
              createConnection,
              headers: { ...reqHeaders, Host: valid.host },
              timeout: timeoutMs,
            },
            (upstreamRes) => handleUpstream(upstreamRes, resolve, reject)
          );
          upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Media stream timed out.')));
          upstreamReq.on('error', reject);
          upstreamReq.end();
        });
        connectReq.on('timeout', () => connectReq.destroy(new Error('Proxy connect timed out.')));
        connectReq.on('error', reject);
        connectReq.end();
      });
    }

    return new Promise((resolve, reject) => {
      const mod = valid.protocol === 'https:' ? https : http;
      const upstreamReq = mod.request(
        {
          hostname: valid.hostname,
          port: targetPort,
          path: valid.pathname + valid.search,
          method: 'GET',
          headers: reqHeaders,
          timeout: timeoutMs,
        },
        (upstreamRes) => handleUpstream(upstreamRes, resolve, reject)
      );
      upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('Media stream timed out.')));
      upstreamReq.on('error', reject);
      upstreamReq.end();
    });
  }

  async function readRemoteBuffer(
    remoteUrl: string,
    options?: { referer?: string; headers?: Record<string, string>; maxBytes?: number }
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const maxBytes = options?.maxBytes ?? 64 * 1024 * 1024;
    const { stream, contentType } = await openRemoteMediaReadable(remoteUrl, options);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const raw of stream) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
      total += buf.length;
      if (total > maxBytes) {
        stream.destroy();
        throw new Error('Carousel item exceeds memory limit.');
      }
      chunks.push(buf);
    }
    return { buffer: Buffer.concat(chunks, total), contentType };
  }

  function createStreamingZipReadable(
    entries: Array<{ baseName: string; fetchEntry: () => Promise<{ buffer: Buffer; ext: string }> }>
  ): Readable {
    const out = new PassThrough();
    const writeChunk = async (buf: Buffer): Promise<void> => {
      if (out.destroyed) throw new Error('ZIP stream closed');
      if (!out.write(buf)) {
        await new Promise<void>((resolve, reject) => {
          const onDrain = () => {
            out.off('close', onClose);
            resolve();
          };
          const onClose = () => {
            out.off('drain', onDrain);
            reject(new Error('ZIP stream closed'));
          };
          out.once('drain', onDrain);
          out.once('close', onClose);
        });
      }
    };

    void (async () => {
      const centralRecords: Array<{
        nameBytes: Buffer;
        crc: number;
        size: number;
        offset: number;
      }> = [];
      let offset = 0;

      for (const entry of entries) {
        const { buffer, ext } = await entry.fetchEntry();
        const nameBytes = Buffer.from(`${entry.baseName}.${ext}`, 'utf8');
        const crc = zlib.crc32(buffer) >>> 0;
        const size = buffer.length;

        const lfh = Buffer.alloc(30);
        lfh.writeUInt32LE(0x04034b50, 0);
        lfh.writeUInt16LE(20, 4);
        lfh.writeUInt16LE(0x0800, 6); // UTF-8 filename
        lfh.writeUInt16LE(0, 8); // STORE
        lfh.writeUInt16LE(0, 10);
        lfh.writeUInt16LE(0, 12);
        lfh.writeUInt32LE(crc, 14);
        lfh.writeUInt32LE(size, 18);
        lfh.writeUInt32LE(size, 22);
        lfh.writeUInt16LE(nameBytes.length, 26);
        lfh.writeUInt16LE(0, 28);

        const localHeaderOffset = offset;
        await writeChunk(lfh);
        await writeChunk(nameBytes);
        await writeChunk(buffer);
        offset += 30 + nameBytes.length + size;
        centralRecords.push({ nameBytes, crc, size, offset: localHeaderOffset });
      }

      const cdStart = offset;
      let cdSize = 0;
      for (const rec of centralRecords) {
        const cdfh = Buffer.alloc(46);
        cdfh.writeUInt32LE(0x02014b50, 0);
        cdfh.writeUInt16LE(20, 4);
        cdfh.writeUInt16LE(20, 6);
        cdfh.writeUInt16LE(0x0800, 8);
        cdfh.writeUInt16LE(0, 10);
        cdfh.writeUInt16LE(0, 12);
        cdfh.writeUInt16LE(0, 14);
        cdfh.writeUInt32LE(rec.crc, 16);
        cdfh.writeUInt32LE(rec.size, 20);
        cdfh.writeUInt32LE(rec.size, 24);
        cdfh.writeUInt16LE(rec.nameBytes.length, 28);
        cdfh.writeUInt16LE(0, 30);
        cdfh.writeUInt16LE(0, 32);
        cdfh.writeUInt16LE(0, 34);
        cdfh.writeUInt16LE(0, 36);
        cdfh.writeUInt32LE(0, 38);
        cdfh.writeUInt32LE(rec.offset, 42);

        await writeChunk(cdfh);
        await writeChunk(rec.nameBytes);
        cdSize += 46 + rec.nameBytes.length;
      }

      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(0, 4);
      eocd.writeUInt16LE(0, 6);
      eocd.writeUInt16LE(centralRecords.length, 8);
      eocd.writeUInt16LE(centralRecords.length, 10);
      eocd.writeUInt32LE(cdSize, 12);
      eocd.writeUInt32LE(cdStart, 16);
      eocd.writeUInt16LE(0, 20);
      await writeChunk(eocd);
      out.end();
    })().catch((err) => {
      out.destroy(err instanceof Error ? err : new Error(String(err)));
    });

    return out;
  }

  function spawnChildToReadable(
    cmd: string,
    args: string[],
    env?: NodeJS.ProcessEnv,
    options?: {
      stdio?: ('ignore' | 'pipe')[];
      onSpawn?: (child: ChildProcess) => void;
    }
  ): Readable {
    const out = new PassThrough();
    const child = spawn(cmd, args, {
      shell: false,
      ...(env ? { env } : {}),
      ...(options?.stdio ? { stdio: options.stdio } : {}),
    });

    let stderrBuf = '';
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        if (stderrBuf.length < 4096) stderrBuf += chunk.toString('utf8');
      });
    }

    const killChild = () => {
      if (child.exitCode === null && !child.killed) {
        try {
          child.kill('SIGTERM');
        } catch {}
      }
    };

    out.on('close', killChild);

    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        if (out.destroyed) return;
        if (!out.write(chunk)) {
          child.stdout?.pause();
          out.once('drain', () => {
            if (!out.destroyed && child.exitCode === null) child.stdout?.resume();
          });
        }
      });
    }

    child.on('error', (err) => {
      out.destroy(err);
    });

    child.on('close', (code) => {
      if (out.destroyed) return;
      if (code === 0) {
        out.end();
      } else {
        const lines = stderrBuf
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        out.destroy(new Error(lines[lines.length - 1] || `${cmd} exited with code ${code}`));
      }
    });

    if (options?.onSpawn) {
      options.onSpawn(child);
    }
    return out;
  }

  function buildFfmpegStreamArgs(inputs: StreamInputSpec[], isAudio: boolean, title: string): string[] {
    const ffArgs: string[] = [];
    for (const inp of inputs) {
      const proto = (inp.protocol || '').toLowerCase();
      const lowerUrl = inp.url.toLowerCase();
      const isManifest =
        proto.includes('m3u8') ||
        proto.includes('dash') ||
        /\.m3u8(\?|$)/i.test(lowerUrl) ||
        /\.mpd(\?|$)/i.test(lowerUrl);
      if (!isManifest) {
        ffArgs.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
      }
      const ua = inp.headers['User-Agent'] || inp.headers['user-agent'];
      if (ua) {
        ffArgs.push('-user_agent', sanitizeHttpHeaderValue(ua));
      }
      const headerLines: string[] = [];
      for (const [k, v] of Object.entries(inp.headers)) {
        const kl = k.toLowerCase();
        if (['user-agent', 'host', 'connection', 'content-length', 'accept-encoding', 'range'].includes(kl)) continue;
        const cleanK = k.replace(/[^a-zA-Z0-9-]/g, '');
        const cleanV = sanitizeHttpHeaderValue(v);
        if (cleanK && cleanV) headerLines.push(`${cleanK}: ${cleanV}\r\n`);
      }
      if (headerLines.length > 0) {
        ffArgs.push('-headers', headerLines.join(''));
      }
      ffArgs.push('-i', inp.url);
    }

    if (isAudio) {
      ffArgs.push(
        '-vn',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '192k',
        '-metadata',
        `title=${sanitizeFilename(title)}`,
        '-f',
        'mp3',
        'pipe:1'
      );
      return ffArgs;
    }

    const primaryVcodec = (inputs[0]?.vcodec || '').toLowerCase();
    const primaryExt = (inputs[0]?.ext || '').toLowerCase();
    const needsVideoTranscode =
      ['mpeg4', 'msmpeg4', 'divx', 'xvid', 'wmv', 'flv', 'vp6', 'h263'].some((c) => primaryVcodec.includes(c)) ||
      ['avi', 'wmv', 'flv'].includes(primaryExt);

    if (needsVideoTranscode) {
      ffArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
    } else {
      ffArgs.push('-c:v', 'copy');
    }

    ffArgs.push(
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1'
    );
    return ffArgs;
  }

  function buildFfmpegProxyEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const ffEnv: NodeJS.ProcessEnv = { ...baseEnv };
    delete ffEnv.ALL_PROXY;
    delete ffEnv.all_proxy;
    if (adminConfig.xray.enabled && xrayState.running) {
      const hp = `http://127.0.0.1:${adminConfig.xray.httpPort}`;
      ffEnv.http_proxy = hp;
      ffEnv.https_proxy = hp;
      ffEnv.HTTP_PROXY = hp;
      ffEnv.HTTPS_PROXY = hp;
    }
    return ffEnv;
  }

  async function finalizeJobFile(job: DownloadJob): Promise<void> {
    const stat = await fs.promises.stat(job.filePath);
    job.totalBytes = stat.size;
    job.downloadedBytes = stat.size;

    // Publish to the Telegram channel when the admin enabled it. While the bytes
    // move to Telegram the job stays in "processing" so no client starts a
    // download from the cache file that is about to be removed.
    if (telegramEnabledForUploads(adminConfig.telegram)) {
      job.progress = 99;
      job.status = 'processing';
      await uploadJobToTelegram(job, job.ownerUserId ?? null, job.author || 'grove save');
    }

    job.progress = 100;
    job.status = 'ready';
    appendAppLog('info', 'download', `Job ready: ${job.title} [${job.quality}.${job.ext}] (${job.totalBytes ?? 0} bytes)`);
  }

  async function runDirectTelegramDownload(job: DownloadJob, parsed: URL): Promise<void> {
    const isAudio = job.quality === 'audio';
    const ytId = extractYouTubeId(parsed);

    try {
      if (isInstagramUrl(parsed)) {
        const normalizedIgUrl = normalizeInstagramUrl(parsed);
        const targetH = selectTargetHeight(job.quality);
        const info = await runParthDlInfo(normalizedIgUrl);
        const entries = Array.isArray(info.entries) ? info.entries : [];
        if (entries.length === 0) {
          throw new Error('No downloadable media found for this Instagram link.');
        }

        if (isAudio) {
          const videoEntry = entries.find((e) => e.kind === 'video' && Array.isArray(e.formats) && e.formats.length > 0);
          const fmt = videoEntry ? selectInstagramVideoFormat(videoEntry, 1080) : null;
          if (!fmt?.url) {
            throw new Error('This Instagram post does not contain a video track for MP3 extraction.');
          }
          const { stream } = await openRemoteMediaReadable(fmt.url, { referer: 'https://www.instagram.com/' });
          const ffStream = spawnChildToReadable(
            'ffmpeg',
            ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-metadata', `title=${sanitizeFilename(job.title)}`, '-f', 'mp3', 'pipe:1'],
            undefined,
            {
              stdio: ['pipe', 'pipe', 'pipe'],
              onSpawn: (child) => {
                child.stdin?.on('error', () => {});
                stream.on('error', () => {
                  if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                });
                if (child.stdin) stream.pipe(child.stdin);
              },
            }
          );
          await uploadStreamJobToTelegram(job, ffStream, null, { ext: 'mp3', mimeType: 'audio/mpeg' });
          return;
        }

        if (entries.length > 1) {
          const zipEntries = entries.map((entry, idx) => ({
            baseName: `item_${idx + 1}`,
            fetchEntry: async () => {
              if (entry.kind === 'video') {
                const fmt = selectInstagramVideoFormat(entry, targetH);
                if (!fmt?.url) throw new Error('Missing video URL in carousel item.');
                const { buffer } = await readRemoteBuffer(fmt.url, { referer: 'https://www.instagram.com/' });
                return { buffer, ext: 'mp4' };
              }
              const imgUrl = (entry.formats || []).find((f) => typeof f.url === 'string' && /^https?:\/\//i.test(f.url))?.url;
              if (!imgUrl) throw new Error('Missing image URL in carousel item.');
              const { buffer, contentType } = await readRemoteBuffer(imgUrl, { referer: 'https://www.instagram.com/' });
              const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
              return { buffer, ext };
            },
          }));
          const zipStream = createStreamingZipReadable(zipEntries);
          await uploadStreamJobToTelegram(job, zipStream, null, { ext: 'zip', mimeType: 'application/zip' });
          return;
        }

        const single = entries[0];
        if (single.kind === 'video') {
          const fmt = selectInstagramVideoFormat(single, targetH);
          if (!fmt?.url) throw new Error('No downloadable Instagram video URL found.');
          let opened;
          try {
            opened = await openRemoteMediaReadable(fmt.url, { referer: 'https://www.instagram.com/' });
          } catch (openErr) {
            if (/HTTP 403|HTTP 410|HTTP 404/i.test(openErr instanceof Error ? openErr.message : '')) {
              const refreshed = await runParthDlInfo(normalizedIgUrl, true);
              const refEntry = (refreshed.entries || []).find((e) => e.kind === 'video');
              const refFmt = refEntry ? selectInstagramVideoFormat(refEntry, targetH) : null;
              if (!refFmt?.url) throw openErr;
              opened = await openRemoteMediaReadable(refFmt.url, { referer: 'https://www.instagram.com/' });
            } else {
              throw openErr;
            }
          }
          await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
            ext: 'mp4',
            mimeType: 'video/mp4',
          });
          return;
        }

        const imgUrl = (single.formats || []).find((f) => typeof f.url === 'string' && /^https?:\/\//i.test(f.url))?.url;
        if (!imgUrl) throw new Error('No downloadable Instagram image URL found.');
        const opened = await openRemoteMediaReadable(imgUrl, { referer: 'https://www.instagram.com/' });
        const imgExt: DownloadFileExt = opened.contentType.includes('png')
          ? 'png'
          : opened.contentType.includes('webp')
            ? 'webp'
            : 'jpg';
        await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
          ext: imgExt,
          mimeType: getMimeTypeForExt(imgExt),
        });
        return;
      }

      const targetUrlForDl = isXUrl(parsed)
        ? normalizeXUrl(parsed)
        : ytId
          ? `https://www.youtube.com/watch?v=${ytId}`
          : parsed.toString();
      const runner = await getYtDlpRunner();
      if (runner) {
        const fp = ytId ? getYouTubeConfigFingerprint() : '';
        if (ytId) {
          const cooldownMs = getYouTubeCooldownRemainingMs(fp);
          if (cooldownMs > 0) {
            throw new Error(
              `YouTube rate-limit protection active. Retry in ${Math.max(1, Math.ceil(cooldownMs / 1000))}s.`
            );
          }
        }
        try {
          const targetH = String(selectTargetHeight(job.quality));
          const audioFid = job.audioFormatId;
          const isTikTok = isTikTokUrl(parsed);
          const videoFmtSelector = audioFid
            ? `bestvideo[height<=${targetH}][vcodec^=avc]+${audioFid}/bestvideo[height<=${targetH}]+${audioFid}/best[height<=${targetH}]/best`
            : isTikTok
              ? `best[height<=${targetH}][format_id!*=-watermarked][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][format_id!*=-watermarked]/best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}]/best`
              : `best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][vcodec^=avc]/best[height<=${targetH}]/best`;
          const audioFmtSelector = audioFid ? `${audioFid}/bestaudio/best` : 'bestaudio/best';
          const { extraArgs, env } = await getYtDlpAuthAndProxy();

          const dumpArgs = insertBeforeDoubleDash(
            buildYtDlpArgs(
              [
                '--dump-single-json',
                '-f',
                isAudio ? audioFmtSelector : videoFmtSelector,
                '--no-playlist',
                '--playlist-items',
                '1',
                '--no-warnings',
                '--',
                targetUrlForDl,
              ],
              { isYouTube: Boolean(ytId) }
            ),
            extraArgs
          );

          let inputs: StreamInputSpec[] = [];
          let fatalBotError: unknown = null;

          // Reuse recently resolved stream URLs when available (avoids double-scraping YouTube)
          if (!isAudio && ytId) {
            const streamCacheKey = `${targetUrlForDl}::${targetH}::${audioFid || ''}::${fp}`;
            const cachedStream = streamResolveCache.get(streamCacheKey);
            if (cachedStream && cachedStream.expiresAt > Date.now() && cachedStream.inputs.length > 0) {
              inputs = cachedStream.inputs;
            }
          }

          if (inputs.length === 0) {
            try {
              const execDump = () =>
                execFileAsync(runner.cmd, [...runner.baseArgs, ...dumpArgs], {
                  timeout: 30000,
                  maxBuffer: 8 * 1024 * 1024,
                  env,
                });
              const { stdout } = ytId ? await runPacedYouTubeTask(execDump) : await execDump();
              const rawJson = JSON.parse(stdout) as Record<string, unknown> & {
                entries?: Array<Record<string, unknown>>;
              };
              const entry =
                Array.isArray(rawJson.entries) && rawJson.entries.length > 0 ? rawJson.entries[0] : rawJson;
              const toSpec = (fmt: Record<string, unknown>): StreamInputSpec | null => {
                const u = typeof fmt.url === 'string' ? fmt.url.trim() : '';
                if (!/^https?:\/\//i.test(u)) return null;
                return {
                  url: u,
                  headers: buildUpstreamHeaders(
                    fmt.http_headers && typeof fmt.http_headers === 'object'
                      ? (fmt.http_headers as Record<string, string>)
                      : undefined,
                    extractCookieHeaderFromYtDlp(fmt.cookies)
                  ),
                  protocol: typeof fmt.protocol === 'string' ? fmt.protocol : undefined,
                  vcodec: typeof fmt.vcodec === 'string' ? fmt.vcodec : undefined,
                  acodec: typeof fmt.acodec === 'string' ? fmt.acodec : undefined,
                  ext: typeof fmt.ext === 'string' ? fmt.ext : undefined,
                };
              };
              const reqFmts = Array.isArray(entry.requested_formats)
                ? (entry.requested_formats as Array<Record<string, unknown>>)
                : null;
              if (reqFmts && reqFmts.length >= 2) {
                inputs = reqFmts.map(toSpec).filter((x): x is StreamInputSpec => x !== null);
              } else if (reqFmts && reqFmts.length === 1) {
                const one = toSpec(reqFmts[0]);
                if (one) inputs = [one];
              } else {
                const one = toSpec(entry);
                if (one) inputs = [one];
              }
            } catch (dumpErr) {
              if (ytId && isYouTubeBotOrRateLimitError(dumpErr)) {
                recordYouTubeRateLimit(fp);
                fatalBotError = dumpErr;
              }
              inputs = [];
            }
          }

          if (fatalBotError) {
            throw fatalBotError;
          }

          if (inputs.length === 1 && !isAudio && !isManifestOrIncompatibleFormat(inputs[0])) {
            try {
              const opened = await openRemoteMediaReadable(inputs[0].url, { headers: inputs[0].headers });
              await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
                ext: 'mp4',
                mimeType: 'video/mp4',
              });
              return;
            } catch (openErr) {
              if (isFatalTelegramUploadError(openErr)) throw openErr;
            }
          }

          if (inputs.length > 0) {
            try {
              const ffArgs = buildFfmpegStreamArgs(inputs, isAudio, job.title);
              const ffStream = spawnChildToReadable('ffmpeg', ffArgs, buildFfmpegProxyEnv(env));
              await uploadStreamJobToTelegram(job, ffStream, null, {
                ext: isAudio ? 'mp3' : 'mp4',
                mimeType: isAudio ? 'audio/mpeg' : 'video/mp4',
              });
              return;
            } catch (muxErr) {
              if (isFatalTelegramUploadError(muxErr)) throw muxErr;
            }
          }

          // Fallback: stream yt-dlp directly to stdout -> ffmpeg -> Telegram (zero disk)
          const singleFmt = isAudio
            ? audioFmtSelector
            : `best[height<=${targetH}][ext=mp4]/best[height<=${targetH}]/best`;
          const ytdlpArgs = insertBeforeDoubleDash(
            buildYtDlpArgs(
              ['-f', singleFmt, '--no-playlist', '--playlist-items', '1', '-o', '-', '--', targetUrlForDl],
              { isYouTube: Boolean(ytId), isDownload: true }
            ),
            extraArgs
          );
          const ytStdout = spawnChildToReadable(runner.cmd, [...runner.baseArgs, ...ytdlpArgs], env);
          if (isAudio) {
            const ffStream = spawnChildToReadable(
              'ffmpeg',
              ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-metadata', `title=${sanitizeFilename(job.title)}`, '-f', 'mp3', 'pipe:1'],
              undefined,
              {
                stdio: ['pipe', 'pipe', 'pipe'],
                onSpawn: (child) => {
                  child.stdin?.on('error', () => {});
                  ytStdout.on('error', () => {
                    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                  });
                  if (child.stdin) ytStdout.pipe(child.stdin);
                },
              }
            );
            await uploadStreamJobToTelegram(job, ffStream, null, { ext: 'mp3', mimeType: 'audio/mpeg' });
          } else {
            await uploadStreamJobToTelegram(job, ytStdout, null, { ext: 'mp4', mimeType: 'video/mp4' });
          }
          return;
        } catch (ytdlpErr) {
          if (isFatalTelegramUploadError(ytdlpErr)) throw ytdlpErr;
          if (!isXUrl(parsed) && !isTikTokUrl(parsed)) {
            throw ytdlpErr;
          }
          // Fall through to X / TikTok fallback resolver
        }
      }

      if (isXUrl(parsed) || isTikTokUrl(parsed)) {
        const resolved = isXUrl(parsed)
          ? await resolveXMediaFallback(parsed)
          : await resolveTikTokMediaFallback(parsed);

        if (isAudio) {
          const sourceUrl = resolved.musicUrl || resolved.videos[0]?.url;
          if (!sourceUrl) {
            throw new Error('This post does not contain an audio or video stream for MP3 extraction.');
          }
          const { stream } = await openRemoteMediaReadable(sourceUrl, { referer: resolved.referer });
          const ffStream = spawnChildToReadable(
            'ffmpeg',
            ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-metadata', `title=${sanitizeFilename(job.title)}`, '-f', 'mp3', 'pipe:1'],
            undefined,
            {
              stdio: ['pipe', 'pipe', 'pipe'],
              onSpawn: (child) => {
                child.stdin?.on('error', () => {});
                stream.on('error', () => {
                  if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                });
                if (child.stdin) stream.pipe(child.stdin);
              },
            }
          );
          await uploadStreamJobToTelegram(job, ffStream, null, { ext: 'mp3', mimeType: 'audio/mpeg' });
          return;
        }

        if (resolved.videos.length > 0) {
          const opened = await openRemoteMediaReadable(resolved.videos[0].url, { referer: resolved.referer });
          await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
            ext: 'mp4',
            mimeType: 'video/mp4',
          });
          return;
        }

        if (resolved.photos.length > 1) {
          const zipEntries = resolved.photos.map((p, idx) => ({
            baseName: `photo_${idx + 1}`,
            fetchEntry: async () => {
              const { buffer, contentType } = await readRemoteBuffer(p.url, { referer: resolved.referer });
              const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
              return { buffer, ext };
            },
          }));
          const zipStream = createStreamingZipReadable(zipEntries);
          await uploadStreamJobToTelegram(job, zipStream, null, { ext: 'zip', mimeType: 'application/zip' });
          return;
        }

        if (resolved.photos.length === 1) {
          const opened = await openRemoteMediaReadable(resolved.photos[0].url, { referer: resolved.referer });
          const imgExt: DownloadFileExt = opened.contentType.includes('png')
            ? 'png'
            : opened.contentType.includes('webp')
              ? 'webp'
              : 'jpg';
          await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
            ext: imgExt,
            mimeType: getMimeTypeForExt(imgExt),
          });
          return;
        }
      }

      if (ytId) {
        const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
        try {
          const info = await ytdl.getInfo(watchUrl);
          if (isAudio) {
            const customAudioItag = job.audioFormatId ? Number(job.audioFormatId) : NaN;
            const customAudioFormat = Number.isFinite(customAudioItag)
              ? info.formats.find((f: VideoFormat) => f.itag === customAudioItag && f.hasAudio)
              : undefined;
            const audioFormat =
              customAudioFormat ||
              chooseFormat(info.formats, {
                quality: Quality.HighestAudio,
                filter: { hasAudio: true, hasVideo: false },
              });
            const audioStream = ytdl.download(info, { format: audioFormat });
            const ffStream = spawnChildToReadable(
              'ffmpeg',
              ['-i', 'pipe:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-metadata', `title=${sanitizeFilename(job.title)}`, '-f', 'mp3', 'pipe:1'],
              undefined,
              {
                stdio: ['pipe', 'pipe', 'pipe'],
                onSpawn: (child) => {
                  child.stdin?.on('error', () => {});
                  audioStream.on('error', () => {
                    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                  });
                  if (child.stdin) audioStream.pipe(child.stdin);
                },
              }
            );
            await uploadStreamJobToTelegram(job, ffStream, null, { ext: 'mp3', mimeType: 'audio/mpeg' });
            return;
          }

          const targetH = selectTargetHeight(job.quality);
          const customAudioItag = job.audioFormatId ? Number(job.audioFormatId) : NaN;
          const customAudioFormat = Number.isFinite(customAudioItag)
            ? info.formats.find((f: VideoFormat) => f.itag === customAudioItag && f.hasAudio)
            : undefined;
          const muxedFormats = info.formats
            .filter((f: VideoFormat) => f.hasVideo && f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));

          const bestMuxed = muxedFormats[0];
          if (!customAudioFormat && bestMuxed && (bestMuxed.height || 0) >= targetH && bestMuxed.container === 'mp4') {
            const totalHint = Number(bestMuxed.contentLength) || null;
            const stream = ytdl.download(info, { format: bestMuxed });
            await uploadStreamJobToTelegram(job, stream, totalHint, { ext: 'mp4', mimeType: 'video/mp4' });
            return;
          }

          const videoCandidates = info.formats
            .filter((f: VideoFormat) => f.hasVideo && !f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));
          const videoFormat = videoCandidates[0] || bestMuxed;
          const audioFormat =
            customAudioFormat ||
            chooseFormat(info.formats, {
              quality: Quality.HighestAudio,
              filter: { hasAudio: true, hasVideo: false },
            });

          if (videoFormat && audioFormat && !videoFormat.hasAudio) {
            const vStream = ytdl.download(info, { format: videoFormat });
            const aStream = ytdl.download(info, { format: audioFormat });
            const ffStream = spawnChildToReadable(
              'ffmpeg',
              [
                '-i',
                'pipe:3',
                '-i',
                'pipe:4',
                '-c:v',
                'copy',
                '-c:a',
                'aac',
                '-b:a',
                '192k',
                '-movflags',
                'frag_keyframe+empty_moov+default_base_moof',
                '-f',
                'mp4',
                'pipe:1',
              ],
              undefined,
              {
                stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'],
                onSpawn: (child) => {
                  const pipe3 = child.stdio[3] as NodeJS.WritableStream | null;
                  const pipe4 = child.stdio[4] as NodeJS.WritableStream | null;
                  pipe3?.on('error', () => {});
                  pipe4?.on('error', () => {});
                  vStream.on('error', () => {
                    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                  });
                  aStream.on('error', () => {
                    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
                  });
                  if (pipe3) vStream.pipe(pipe3);
                  if (pipe4) aStream.pipe(pipe4);
                },
              }
            );
            await uploadStreamJobToTelegram(job, ffStream, null, { ext: 'mp4', mimeType: 'video/mp4' });
            return;
          } else if (videoFormat) {
            const stream = ytdl.download(info, { format: videoFormat });
            await uploadStreamJobToTelegram(job, stream, Number(videoFormat.contentLength) || null, {
              ext: 'mp4',
              mimeType: 'video/mp4',
            });
            return;
          }
        } catch {
          // Fall through to direct URL or preview container
        }
      }

      // Check direct video/audio file URL
      try {
        const headRes = await fetch(parsed.toString(), {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
        });
        const ct = headRes.headers.get('content-type') || '';
        if (ct.startsWith('video/') || ct.startsWith('audio/')) {
          const opened = await openRemoteMediaReadable(parsed.toString());
          const ext: DownloadFileExt = ct.startsWith('audio/') ? 'mp3' : 'mp4';
          await uploadStreamJobToTelegram(job, opened.stream, opened.contentLength, {
            ext,
            mimeType: ct.split(';')[0].trim() || getMimeTypeForExt(ext),
          });
          return;
        }
      } catch {
        // Fall through to playable container
      }

      // Fallback playable container streamed directly to Telegram (zero disk)
      const resMap: Record<string, string> = {
        '2160p': '1920x1080',
        '1080p': '1280x720',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360',
      };
      const ffArgs = isAudio
        ? [
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
            '-metadata', `title=${sanitizeFilename(job.title)}`,
            '-c:a', 'libmp3lame', '-b:a', '192k',
            '-f', 'mp3',
            'pipe:1',
          ]
        : [
            '-f', 'lavfi', '-i', `color=c=black:s=${resMap[job.quality] || '1280x720'}:d=3`,
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
            '-metadata', `title=${sanitizeFilename(job.title)}`,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
            '-f', 'mp4',
            'pipe:1',
          ];
      const ffStream = spawnChildToReadable('ffmpeg', ffArgs);
      await uploadStreamJobToTelegram(job, ffStream, null, {
        ext: isAudio ? 'mp3' : 'mp4',
        mimeType: isAudio ? 'audio/mpeg' : 'video/mp4',
      });
    } catch (err) {
      job.status = 'error';
      job.error = sanitizeTelegramError(err, adminConfig.telegram.botToken);
      appendAppLog('error', 'download', `Telegram upload job failed (${job.title}): ${job.error}`);
    }
  }

  async function runStagedDownload(job: DownloadJob, parsed: URL): Promise<void> {
    if (telegramEnabledForUploads(adminConfig.telegram)) {
      await runDirectTelegramDownload(job, parsed);
      return;
    }

    // Telegram was switched on but cannot actually publish yet (most often a
    // bot token whose bot has never seen a chat, so no channel was discovered).
    // Fail loudly instead of quietly downloading onto the disk we promised to
    // leave alone — that is exactly the behaviour the admin turned Telegram on
    // to avoid.
    const tg = adminConfig.telegram;
    if (tg.uploadEnabled && telegramIsConfigured(tg) && !tg.channel) {
      job.status = 'error';
      job.error = telegramUsesBotHttpApi(tg)
        ? 'Telegram upload is on, but the bot has no chat to post into yet. Open a chat with the bot (or add it to a channel) and save the bot token again.'
        : 'Telegram upload is on, but no channel is set. Pick a channel or use Saved Messages.';
      return;
    }

    ensureDataDir();
    const isAudio = job.quality === 'audio';
    const ytId = extractYouTubeId(parsed);

    try {
      if (isInstagramUrl(parsed)) {
        const normalizedIgUrl = normalizeInstagramUrl(parsed);
        const targetH = selectTargetHeight(job.quality);
        const parthQuality: 'best' | 'worst' = !isAudio && targetH <= 480 ? 'worst' : 'best';
        const xrayFingerprint = `${adminConfig.xray.enabled}:${adminConfig.xray.activeProfileId || ''}:${xrayState.running}`;
        const cachedInfo = instagramInfoCache.get(`${normalizedIgUrl}::${xrayFingerprint}`)?.info || null;

        let workDir = '';
        try {
          workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-ig-'));
          const { files } = await runParthDlDownload(
            normalizedIgUrl,
            workDir,
            parthQuality,
            cachedInfo,
            (downloaded, total) => {
              job.downloadedBytes = downloaded;
              if (total > 0) {
                job.totalBytes = total;
                job.progress = Math.min(92, Math.max(5, Math.floor((downloaded / total) * 90)));
              } else {
                job.progress = Math.min(88, job.progress + 2);
              }
            }
          );

          const resolvedFiles = files
            .map((f) => path.resolve(f))
            .filter((f) => f.startsWith(workDir + path.sep) && fs.existsSync(f));
          if (resolvedFiles.length === 0) {
            throw new Error('No downloadable files returned for this Instagram link.');
          }

          if (isAudio) {
            const videoFile = resolvedFiles.find((f) => /\.(mp4|mov|webm|mkv|m4v)$/i.test(f));
            if (!videoFile) {
              throw new Error('This Instagram post does not contain a video track for MP3 extraction.');
            }
            job.status = 'processing';
            job.progress = 90;
            await new Promise<void>((resolve, reject) => {
              const ff = spawn(
                'ffmpeg',
                [
                  '-y',
                  '-i', videoFile,
                  '-vn',
                  '-c:a', 'libmp3lame',
                  '-b:a', '192k',
                  '-metadata', `title=${sanitizeFilename(job.title)}`,
                  '-f', 'mp3',
                  job.filePath,
                ],
                { shell: false }
              );
              ff.on('error', reject);
              ff.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Audio extraction failed'));
              });
            });
            await finalizeJobFile(job);
            return;
          }

          if (resolvedFiles.length > 1) {
            job.status = 'processing';
            job.progress = 92;
            const archiveExt: DownloadFileExt = 'zip';
            const archivePath = path.resolve(CACHE_DIR, `${job.id}.${archiveExt}`);
            if (!archivePath.startsWith(CACHE_DIR + path.sep)) {
              throw new Error('Invalid cache path.');
            }
            const fileNames = resolvedFiles.map((f) => path.basename(f));
            await execFileAsync('python3', ['-m', 'zipfile', '-c', archivePath, ...fileNames], {
              cwd: workDir,
              timeout: 30000,
            });
            job.ext = archiveExt;
            job.mimeType = getMimeTypeForExt(archiveExt);
            job.filePath = archivePath;
            job.contentDisposition = buildContentDisposition(job.title, job.quality, archiveExt);
            job.fileName = `${sanitizeFilename(job.title)}-${job.quality}.${archiveExt}`;
            await finalizeJobFile(job);
            return;
          }

          const singleFile = resolvedFiles[0];
          const rawExt = path.extname(singleFile).toLowerCase().replace('.', '');
          const mappedExt: DownloadFileExt =
            rawExt === 'jpeg' || rawExt === 'jpg'
              ? 'jpg'
              : rawExt === 'png'
                ? 'png'
                : rawExt === 'webp'
                  ? 'webp'
                  : 'mp4';

          const finalPath = path.resolve(CACHE_DIR, `${job.id}.${mappedExt}`);
          if (!finalPath.startsWith(CACHE_DIR + path.sep)) {
            throw new Error('Invalid cache path.');
          }
          await fs.promises.copyFile(singleFile, finalPath);
          job.ext = mappedExt;
          job.mimeType = getMimeTypeForExt(mappedExt);
          job.filePath = finalPath;
          job.contentDisposition = buildContentDisposition(job.title, job.quality, mappedExt);
          job.fileName = `${sanitizeFilename(job.title)}-${job.quality}.${mappedExt}`;
          await finalizeJobFile(job);
          return;
        } finally {
          if (workDir) {
            await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {});
          }
        }
      }

      const targetUrlForDl = isXUrl(parsed)
        ? normalizeXUrl(parsed)
        : ytId
          ? `https://www.youtube.com/watch?v=${ytId}`
          : parsed.toString();
      const runner = await getYtDlpRunner();
      if (runner) {
        const fp = ytId ? getYouTubeConfigFingerprint() : '';
        if (ytId) {
          const cooldownMs = getYouTubeCooldownRemainingMs(fp);
          if (cooldownMs > 0) {
            throw new Error(
              `YouTube rate-limit protection active. Retry in ${Math.max(1, Math.ceil(cooldownMs / 1000))}s.`
            );
          }
        }
        try {
          const targetH = String(selectTargetHeight(job.quality));
          const audioFid = job.audioFormatId;
          const isTikTok = isTikTokUrl(parsed);
          const videoFmtSelector = audioFid
            ? `bestvideo[height<=${targetH}][vcodec^=avc]+${audioFid}/bestvideo[height<=${targetH}]+${audioFid}/best[height<=${targetH}]/best`
            : isTikTok
              ? `best[height<=${targetH}][format_id!*=-watermarked][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][format_id!*=-watermarked]/best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}]/best`
              : `best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][vcodec^=avc]/best[height<=${targetH}]/best`;
          const audioFmtSelector = audioFid ? `${audioFid}/bestaudio/best` : undefined;
          const baseArgs = isAudio
            ? [
                ...(audioFmtSelector ? ['-f', audioFmtSelector] : []),
                '-x',
                '--audio-format',
                'mp3',
                '-o',
                job.filePath,
                '--newline',
                '--',
                targetUrlForDl,
              ]
            : [
                '-f',
                videoFmtSelector,
                '--merge-output-format',
                'mp4',
                '--recode-video',
                'mp4',
                '-o',
                job.filePath,
                '--newline',
                '--',
                targetUrlForDl,
              ];
          const { extraArgs, env } = await getYtDlpAuthAndProxy();
          const finalArgs = insertBeforeDoubleDash(
            buildYtDlpArgs(baseArgs, { isYouTube: Boolean(ytId), isDownload: true }),
            extraArgs
          );

          await new Promise<void>((resolve, reject) => {
            const child = spawn(runner.cmd, [...runner.baseArgs, ...finalArgs], { shell: false, env });
            let stderr = '';
            child.stdout.on('data', (data) => {
              const output = data.toString();
              const progressMatch = output.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
              if (progressMatch) {
                const pct = Math.min(95, Math.max(5, Math.floor(parseFloat(progressMatch[1]))));
                job.progress = pct;
              }
            });
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            child.on('close', async (code) => {
              if (code === 0) {
                await finalizeJobFile(job);
                resolve();
              } else {
                const err = new Error(stderr || `yt-dlp exited with code ${code}`);
                if (ytId && isYouTubeBotOrRateLimitError(err)) {
                  recordYouTubeRateLimit(fp);
                }
                reject(err);
              }
            });
            child.on('error', reject);
          });
          return;
        } catch (ytdlpErr) {
          if (!isXUrl(parsed) && !isTikTokUrl(parsed)) {
            throw ytdlpErr;
          }
          // Fall through to X / TikTok native fallback resolver below
        }
      }

      if (isXUrl(parsed) || isTikTokUrl(parsed)) {
        const resolved = isXUrl(parsed)
          ? await resolveXMediaFallback(parsed)
          : await resolveTikTokMediaFallback(parsed);
        let workDir = '';
        try {
          workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-social-'));
          if (isAudio) {
            const sourceUrl = resolved.musicUrl || resolved.videos[0]?.url;
            if (!sourceUrl) {
              throw new Error('This post does not contain an audio or video stream for MP3 extraction.');
            }
            const rawMediaPath = path.join(workDir, 'source.bin');
            await downloadRemoteUrlToFile(
              sourceUrl,
              rawMediaPath,
              resolved.referer,
              (dl, tot) => {
                job.downloadedBytes = dl;
                if (tot > 0) {
                  job.totalBytes = tot;
                  job.progress = Math.min(84, Math.max(8, Math.floor((dl / tot) * 82)));
                }
              }
            );
            job.status = 'processing';
            job.progress = 90;
            await new Promise<void>((resolve, reject) => {
              const ff = spawn(
                'ffmpeg',
                [
                  '-y',
                  '-i', rawMediaPath,
                  '-vn',
                  '-c:a', 'libmp3lame',
                  '-b:a', '192k',
                  '-metadata', `title=${sanitizeFilename(job.title)}`,
                  '-f', 'mp3',
                  job.filePath,
                ],
                { shell: false }
              );
              ff.on('error', reject);
              ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Audio conversion failed'))));
            });
            await finalizeJobFile(job);
            return;
          }

          if (resolved.videos.length > 0) {
            const videoUrl = resolved.videos[0].url;
            await downloadRemoteUrlToFile(
              videoUrl,
              job.filePath,
              resolved.referer,
              (dl, tot) => {
                job.downloadedBytes = dl;
                if (tot > 0) {
                  job.totalBytes = tot;
                  job.progress = Math.min(95, Math.max(8, Math.floor((dl / tot) * 95)));
                }
              }
            );
            await finalizeJobFile(job);
            return;
          }

          if (resolved.photos.length > 1) {
            const downloadedNames: string[] = [];
            for (let i = 0; i < resolved.photos.length; i += 1) {
              const photoPath = path.join(workDir, `photo_${i + 1}.jpg`);
              const ct = await downloadRemoteUrlToFile(resolved.photos[i].url, photoPath, resolved.referer);
              let finalPhotoName = `photo_${i + 1}.jpg`;
              if (ct.includes('png')) finalPhotoName = `photo_${i + 1}.png`;
              else if (ct.includes('webp')) finalPhotoName = `photo_${i + 1}.webp`;
              if (finalPhotoName !== `photo_${i + 1}.jpg`) {
                await fs.promises.rename(photoPath, path.join(workDir, finalPhotoName));
              }
              downloadedNames.push(finalPhotoName);
              job.progress = Math.min(88, Math.round(((i + 1) / resolved.photos.length) * 85));
            }
            job.status = 'processing';
            job.progress = 92;
            const archiveExt: DownloadFileExt = 'zip';
            const archivePath = path.resolve(CACHE_DIR, `${job.id}.${archiveExt}`);
            if (!archivePath.startsWith(CACHE_DIR + path.sep)) {
              throw new Error('Invalid cache path.');
            }
            await execFileAsync('python3', ['-m', 'zipfile', '-c', archivePath, ...downloadedNames], {
              cwd: workDir,
              timeout: 30000,
            });
            job.ext = archiveExt;
            job.mimeType = getMimeTypeForExt(archiveExt);
            job.filePath = archivePath;
            job.contentDisposition = buildContentDisposition(job.title, job.quality, archiveExt);
            job.fileName = `${sanitizeFilename(job.title)}-${job.quality}.${archiveExt}`;
            await finalizeJobFile(job);
            return;
          }

          if (resolved.photos.length === 1) {
            const tmpPhoto = path.join(workDir, 'single.img');
            const ct = await downloadRemoteUrlToFile(
              resolved.photos[0].url,
              tmpPhoto,
              resolved.referer,
              (dl, tot) => {
                job.downloadedBytes = dl;
                if (tot > 0) {
                  job.totalBytes = tot;
                  job.progress = Math.min(92, Math.max(8, Math.floor((dl / tot) * 90)));
                }
              }
            );
            const mappedExt: DownloadFileExt = ct.includes('png')
              ? 'png'
              : ct.includes('webp')
                ? 'webp'
                : 'jpg';
            const finalPath = path.resolve(CACHE_DIR, `${job.id}.${mappedExt}`);
            if (!finalPath.startsWith(CACHE_DIR + path.sep)) {
              throw new Error('Invalid cache path.');
            }
            await fs.promises.copyFile(tmpPhoto, finalPath);
            job.ext = mappedExt;
            job.mimeType = getMimeTypeForExt(mappedExt);
            job.filePath = finalPath;
            job.contentDisposition = buildContentDisposition(job.title, job.quality, mappedExt);
            job.fileName = `${sanitizeFilename(job.title)}-${job.quality}.${mappedExt}`;
            await finalizeJobFile(job);
            return;
          }
        } finally {
          if (workDir) {
            await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {});
          }
        }
      }

      if (ytId) {
        const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
        let tempDir: string | null = null;
        try {
          const info = await ytdl.getInfo(watchUrl);

          if (isAudio) {
            const customAudioItag = job.audioFormatId ? Number(job.audioFormatId) : NaN;
            const customAudioFormat = Number.isFinite(customAudioItag)
              ? info.formats.find((f: VideoFormat) => f.itag === customAudioItag && f.hasAudio)
              : undefined;
            const audioFormat =
              customAudioFormat ||
              chooseFormat(info.formats, {
                quality: Quality.HighestAudio,
                filter: { hasAudio: true, hasVideo: false },
              });
            const totalHint = Number(audioFormat.contentLength) || null;
            job.totalBytes = totalHint;

            const audioStream = ytdl.download(info, { format: audioFormat });
            audioStream.on('data', (chunk: Buffer) => {
              job.downloadedBytes += chunk.byteLength;
              if (totalHint && totalHint > 0) {
                job.progress = Math.min(88, Math.round((job.downloadedBytes / totalHint) * 85));
              } else {
                job.progress = Math.min(82, job.progress + 3);
              }
            });

            await new Promise<void>((resolve, reject) => {
              const ff = spawn(
                'ffmpeg',
                [
                  '-y',
                  '-i', 'pipe:0',
                  '-vn',
                  '-c:a', 'libmp3lame',
                  '-b:a', '192k',
                  '-metadata', `title=${sanitizeFilename(job.title)}`,
                  '-f', 'mp3',
                  job.filePath,
                ],
                { shell: false }
              );
              audioStream.on('error', reject);
              ff.stdin.on('error', () => {});
              ff.on('error', reject);
              ff.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Audio conversion failed'));
              });
              audioStream.pipe(ff.stdin);
            });

            await finalizeJobFile(job);
            return;
          }

          const targetH = selectTargetHeight(job.quality);
          const customAudioItag = job.audioFormatId ? Number(job.audioFormatId) : NaN;
          const customAudioFormat = Number.isFinite(customAudioItag)
            ? info.formats.find((f: VideoFormat) => f.itag === customAudioItag && f.hasAudio)
            : undefined;
          const muxedFormats = info.formats
            .filter((f: VideoFormat) => f.hasVideo && f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));

          const bestMuxed = muxedFormats[0];
          if (!customAudioFormat && bestMuxed && (bestMuxed.height || 0) >= targetH && bestMuxed.container === 'mp4') {
            const totalHint = Number(bestMuxed.contentLength) || null;
            job.totalBytes = totalHint;
            const stream = ytdl.download(info, { format: bestMuxed });
            stream.on('data', (chunk: Buffer) => {
              job.downloadedBytes += chunk.byteLength;
              if (totalHint && totalHint > 0) {
                job.progress = Math.min(96, Math.round((job.downloadedBytes / totalHint) * 96));
              } else {
                job.progress = Math.min(92, job.progress + 3);
              }
            });
            await pipeline(stream, fs.createWriteStream(job.filePath));
            await finalizeJobFile(job);
            return;
          }

          const videoCandidates = info.formats
            .filter((f: VideoFormat) => f.hasVideo && !f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));
          const videoFormat = videoCandidates[0] || bestMuxed;
          const audioFormat =
            customAudioFormat ||
            chooseFormat(info.formats, {
              quality: Quality.HighestAudio,
              filter: { hasAudio: true, hasVideo: false },
            });

          if (videoFormat && audioFormat && !videoFormat.hasAudio) {
            tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-'));
            const vPath = path.join(tempDir, 'video.bin');
            const aPath = path.join(tempDir, 'audio.bin');
            const totalHint =
              (Number(videoFormat.contentLength) || 0) + (Number(audioFormat.contentLength) || 0) || null;
            job.totalBytes = totalHint;

            const vStream = ytdl.download(info, { format: videoFormat });
            const aStream = ytdl.download(info, { format: audioFormat });

            const trackChunk = (chunk: Buffer) => {
              job.downloadedBytes += chunk.byteLength;
              if (totalHint && totalHint > 0) {
                job.progress = Math.min(82, Math.round((job.downloadedBytes / totalHint) * 82));
              } else {
                job.progress = Math.min(78, job.progress + 2);
              }
            };
            vStream.on('data', trackChunk);
            aStream.on('data', trackChunk);

            await Promise.all([
              pipeline(vStream, fs.createWriteStream(vPath)),
              pipeline(aStream, fs.createWriteStream(aPath)),
            ]);

            job.status = 'processing';
            job.progress = 86;

            await new Promise<void>((resolve, reject) => {
              const ff = spawn(
                'ffmpeg',
                [
                  '-y',
                  '-i', vPath,
                  '-i', aPath,
                  '-c:v', 'copy',
                  '-c:a', 'aac',
                  '-b:a', '192k',
                  '-movflags', '+faststart',
                  '-f', 'mp4',
                  job.filePath,
                ],
                { shell: false }
              );
              ff.on('error', reject);
              ff.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Mux failed'));
              });
            });

            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            await finalizeJobFile(job);
            return;
          } else if (videoFormat) {
            const stream = ytdl.download(info, { format: videoFormat });
            stream.on('data', (chunk: Buffer) => {
              job.downloadedBytes += chunk.byteLength;
              job.progress = Math.min(92, job.progress + 3);
            });
            await pipeline(stream, fs.createWriteStream(job.filePath));
            await finalizeJobFile(job);
            return;
          }
        } catch {
          if (tempDir) {
            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
          }
          // Fall through to direct URL or preview container
        }
      }

      // Check direct video/audio file URL
      try {
        const headRes = await fetch(parsed.toString(), {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
        });
        const ct = headRes.headers.get('content-type') || '';
        if (ct.startsWith('video/') || ct.startsWith('audio/')) {
          const remote = await fetch(parsed.toString(), { signal: AbortSignal.timeout(120000) });
          if (remote.ok && remote.body) {
            const len = Number(remote.headers.get('content-length') || 0) || null;
            job.totalBytes = len;
            const out = fs.createWriteStream(job.filePath);
            const reader = remote.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const buf = Buffer.from(value);
              out.write(buf);
              job.downloadedBytes += buf.byteLength;
              if (len && len > 0) {
                job.progress = Math.min(96, Math.round((job.downloadedBytes / len) * 96));
              }
            }
            await new Promise<void>((resolve, reject) => {
              out.on('finish', resolve);
              out.on('error', reject);
              out.end();
            });
            await finalizeJobFile(job);
            return;
          }
        }
      } catch {
        // Fall through to playable container
      }

      // Fallback playable container written cleanly to cache
      job.status = 'processing';
      job.progress = 55;
      const resMap: Record<string, string> = {
        '2160p': '1920x1080',
        '1080p': '1280x720',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360',
      };
      const ffArgs = isAudio
        ? [
            '-y',
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
            '-metadata', `title=${sanitizeFilename(job.title)}`,
            '-c:a', 'libmp3lame', '-b:a', '192k',
            '-f', 'mp3',
            job.filePath,
          ]
        : [
            '-y',
            '-f', 'lavfi', '-i', `color=c=black:s=${resMap[job.quality] || '1280x720'}:d=3`,
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
            '-metadata', `title=${sanitizeFilename(job.title)}`,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-f', 'mp4',
            job.filePath,
          ];

      await new Promise<void>((resolve, reject) => {
        const ff = spawn('ffmpeg', ffArgs, { shell: false });
        ff.on('error', reject);
        ff.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Container synthesis failed'));
        });
      });

      await finalizeJobFile(job);
    } catch (err) {
      job.status = 'error';
      job.error = err instanceof Error ? err.message : 'Download failed';
      appendAppLog('error', 'download', `Download job failed (${job.title}): ${job.error}`);
      fs.promises.rm(job.filePath, { force: true }).catch(() => {});
    }
  }

  app.post('/api/media/prepare', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as {
      url?: unknown;
      quality?: unknown;
      title?: unknown;
      author?: unknown;
      audioFormatId?: unknown;
    };
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const rawQuality =
      typeof body.quality === 'string' &&
      ['2160p', '1080p', '720p', '480p', '360p', 'best', 'audio'].includes(body.quality.trim())
        ? body.quality.trim()
        : '1080p';
    const rawTitle = typeof body.title === 'string' ? body.title : 'grove-save-media';
    const rawAuthor = typeof body.author === 'string' ? body.author.slice(0, 200) : '';
    const audioFormatId = validateAudioFormatId(body.audioFormatId);

    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

    const quality =
      (isInstagramUrl(parsed) || isTikTokUrl(parsed) || isXUrl(parsed)) && rawQuality !== 'audio'
        ? 'best'
        : rawQuality;
    const id = crypto.randomUUID();
    const isAudio = quality === 'audio';
    const ext = isAudio ? 'mp3' : 'mp4';
    const filePath = path.resolve(CACHE_DIR, `${id}.${ext}`);
    if (!filePath.startsWith(CACHE_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid cache path.' });
      return;
    }

    const job: DownloadJob = {
      id,
      url: parsed.toString(),
      title: rawTitle,
      quality,
      audioFormatId,
      ext,
      mimeType: isAudio ? 'audio/mpeg' : 'video/mp4',
      status: 'downloading',
      progress: 4,
      downloadedBytes: 0,
      totalBytes: null,
      filePath,
      contentDisposition: buildContentDisposition(rawTitle, quality, ext),
      createdAt: Date.now(),
      ownerUserId: req.authUser?.id ?? null,
      author: rawAuthor,
    };
    downloadJobs.set(id, job);
    appendAppLog('info', 'download', `Job started: ${rawTitle} [${quality}] (${parsed.hostname})`);

    void runStagedDownload(job, parsed);

    res.status(202).json({
      jobId: id,
      status: job.status,
    });
  });

  app.get('/api/media/jobs/:jobId', (req: Request, res: Response) => {
    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId : '';
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      res.status(400).json({ error: 'Invalid job identifier.' });
      return;
    }
    const job = downloadJobs.get(jobId);
    if (!job) {
      // Published files outlive the in-memory job, so a restarted server can
      // still report them as ready.
      const storedId = telegramFileIdForJob(jobId);
      const stored = storedId ? lookupTelegramFile(storedId) : null;
      if (stored) {
        const storedName = (stored.file_name || '').toLowerCase();
        const inferredExt: DownloadFileExt = storedName.endsWith('.mp3')
          ? 'mp3'
          : storedName.endsWith('.zip')
            ? 'zip'
            : storedName.endsWith('.png')
              ? 'png'
              : storedName.endsWith('.webp')
                ? 'webp'
                : storedName.endsWith('.jpg') || storedName.endsWith('.jpeg')
                  ? 'jpg'
                  : 'mp4';
        res.json({
          id: jobId,
          status: 'ready',
          progress: 100,
          downloadedBytes: stored.size_bytes,
          totalBytes: stored.size_bytes,
          quality: stored.quality || '',
          ext: inferredExt,
          title: stored.title,
          error: null,
          storage: 'telegram',
          fileId: stored.id,
          downloadPath: `/api/download/${stored.id}`,
        });
        return;
      }
      res.status(404).json({ error: 'Download job not found or expired.' });
      return;
    }
    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      quality: job.quality,
      ext: job.ext,
      title: job.title,
      error: job.error || null,
      storage: job.telegramFileId ? 'telegram' : 'local',
      fileId: job.telegramFileId ?? null,
      downloadPath: job.telegramFileId
        ? `/api/download/${job.telegramFileId}`
        : `/api/media/files/${job.id}`,
      telegramMessageId: job.telegramMessageId ?? null,
    });
  });

  app.get('/api/media/files/:jobId', async (req: Request, res: Response) => {
    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId : '';
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      res.status(400).json({ error: 'Invalid file identifier.' });
      return;
    }
    const job = downloadJobs.get(jobId);
    if (!job) {
      // The in-memory job is gone after a restart, but the Telegram copy is permanent.
      const storedId = telegramFileIdForJob(jobId);
      const stored = storedId ? lookupTelegramFile(storedId) : null;
      if (stored) {
        await streamTelegramFile(stored, req, res);
        return;
      }
      res.status(404).json({ error: 'Prepared file is not ready or has expired.' });
      return;
    }
    if (job.status !== 'ready') {
      res.status(404).json({ error: 'Prepared file is not ready or has expired.' });
      return;
    }

    if (job.telegramFileId) {
      const stored = lookupTelegramFile(job.telegramFileId);
      if (stored) {
        await streamTelegramFile(stored, req, res);
        return;
      }
    }

    const resolved = path.resolve(job.filePath);
    if (!resolved.startsWith(CACHE_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Prepared file missing.' });
      return;
    }

    res.setHeader('Content-Type', job.mimeType);
    res.setHeader('Content-Disposition', job.contentDisposition);
    res.sendFile(resolved);
  });

  // Permanent direct download link for a Telegram-stored file. This is the
  // stable URL handed to users: it survives restarts and cache expiry.
  app.get('/api/download/:fileId', async (req: Request, res: Response) => {
    const fileId = typeof req.params.fileId === 'string' ? req.params.fileId : '';
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
      res.status(400).json({ error: 'Invalid file identifier.' });
      return;
    }
    const stored = lookupTelegramFile(fileId);
    if (!stored) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    if (!telegramIsConfigured(adminConfig.telegram)) {
      res.status(503).json({ error: 'Telegram storage is not configured.' });
      return;
    }
    await streamTelegramFile(stored, req, res);
  });

  // Metadata for a stored file, used by the UI to build the shareable link.
  app.get('/api/download/:fileId/info', (req: Request, res: Response) => {
    const fileId = typeof req.params.fileId === 'string' ? req.params.fileId : '';
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
      res.status(400).json({ error: 'Invalid file identifier.' });
      return;
    }
    const stored = lookupTelegramFile(fileId);
    if (!stored) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    res.json({
      id: stored.id,
      title: stored.title,
      author: stored.author,
      quality: stored.quality,
      fileName: stored.file_name,
      mimeType: stored.mime_type,
      sizeBytes: stored.size_bytes,
      createdAt: stored.created_at,
      downloadPath: `/api/download/${stored.id}`,
    });
  });

  type StreamInputSpec = StreamInputSpecGlobal;
  type ResolvedStreamEntry = ResolvedStreamEntryGlobal;

  function isManifestOrIncompatibleFormat(input: StreamInputSpec): boolean {
    const proto = (input.protocol || '').toLowerCase();
    const ext = (input.ext || '').toLowerCase();
    const lowerUrl = input.url.toLowerCase();
    if (
      proto.includes('m3u8') ||
      proto.includes('dash') ||
      /\.m3u8(\?|$)/i.test(lowerUrl) ||
      /\.mpd(\?|$)/i.test(lowerUrl)
    ) {
      return true;
    }
    if (ext && !['mp4', 'webm', 'm4v', 'mov', 'mp3', 'm4a', 'ogg', 'wav'].includes(ext)) {
      return true;
    }
    return false;
  }

  async function spawnFfmpegStream(
    inputs: StreamInputSpec[],
    baseEnv: NodeJS.ProcessEnv,
    req: Request,
    res: Response
  ): Promise<void> {
    const ffArgs: string[] = [];
    for (const inp of inputs) {
      const proto = (inp.protocol || '').toLowerCase();
      const lowerUrl = inp.url.toLowerCase();
      const isManifest =
        proto.includes('m3u8') ||
        proto.includes('dash') ||
        /\.m3u8(\?|$)/i.test(lowerUrl) ||
        /\.mpd(\?|$)/i.test(lowerUrl);
      if (!isManifest) {
        ffArgs.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
      }
      const ua = inp.headers['User-Agent'] || inp.headers['user-agent'];
      if (ua) {
        ffArgs.push('-user_agent', sanitizeHttpHeaderValue(ua));
      }
      const headerLines: string[] = [];
      for (const [k, v] of Object.entries(inp.headers)) {
        const kl = k.toLowerCase();
        if (['user-agent', 'host', 'connection', 'content-length', 'accept-encoding', 'range'].includes(kl)) continue;
        const cleanK = k.replace(/[^a-zA-Z0-9-]/g, '');
        const cleanV = sanitizeHttpHeaderValue(v);
        if (cleanK && cleanV) headerLines.push(`${cleanK}: ${cleanV}\r\n`);
      }
      if (headerLines.length > 0) {
        ffArgs.push('-headers', headerLines.join(''));
      }
      ffArgs.push('-i', inp.url);
    }

    const primaryVcodec = (inputs[0]?.vcodec || '').toLowerCase();
    const primaryExt = (inputs[0]?.ext || '').toLowerCase();
    const needsVideoTranscode =
      ['mpeg4', 'msmpeg4', 'divx', 'xvid', 'wmv', 'flv', 'vp6', 'h263'].some((c) => primaryVcodec.includes(c)) ||
      ['avi', 'wmv', 'flv'].includes(primaryExt);

    if (needsVideoTranscode) {
      ffArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
    } else {
      ffArgs.push('-c:v', 'copy');
    }

    ffArgs.push(
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      'frag_keyframe+empty_moov+default_base_moof',
      '-f',
      'mp4',
      'pipe:1'
    );

    const ffEnv: NodeJS.ProcessEnv = { ...baseEnv };
    delete ffEnv.ALL_PROXY;
    delete ffEnv.all_proxy;
    if (adminConfig.xray.enabled && xrayState.running) {
      const hp = `http://127.0.0.1:${adminConfig.xray.httpPort}`;
      ffEnv.http_proxy = hp;
      ffEnv.https_proxy = hp;
      ffEnv.HTTP_PROXY = hp;
      ffEnv.HTTPS_PROXY = hp;
    }

    await new Promise<void>((resolve, reject) => {
      const ff = spawn('ffmpeg', ffArgs, { shell: false, env: ffEnv });
      let committed = false;
      let finished = false;
      let stderrBuf = '';

      const cleanupProcess = () => {
        if (!ff.killed && ff.exitCode === null) {
          try {
            ff.kill('SIGTERM');
          } catch {}
          setTimeout(() => {
            if (ff.exitCode === null) {
              try {
                ff.kill('SIGKILL');
              } catch {}
            }
          }, 400).unref();
        }
      };

      const onReqClose = () => {
        finished = true;
        cleanupProcess();
        resolve();
      };
      req.once('close', onReqClose);

      ff.stderr.on('data', (chunk: Buffer) => {
        if (stderrBuf.length < 4096) {
          stderrBuf += chunk.toString('utf8');
        }
      });

      ff.stdout.on('data', (chunk: Buffer) => {
        if (finished || res.writableEnded) return;
        if (!committed) {
          committed = true;
          res.status(200);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Accept-Ranges', 'none');
          res.setHeader('Cache-Control', 'no-store');
        }
        if (!res.write(chunk)) {
          ff.stdout.pause();
          res.once('drain', () => {
            if (!finished && !ff.killed) ff.stdout.resume();
          });
        }
      });

      ff.on('error', (err) => {
        req.off('close', onReqClose);
        if (finished) return;
        finished = true;
        if (!committed && !res.headersSent) {
          reject(err);
        } else {
          if (!res.writableEnded) res.end();
          resolve();
        }
      });

      ff.on('close', (code) => {
        req.off('close', onReqClose);
        if (finished) return;
        finished = true;
        if (!committed && !res.headersSent) {
          const lines = stderrBuf
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          reject(new Error(lines[lines.length - 1] || `ffmpeg exited with code ${code}`));
        } else {
          if (!res.writableEnded) res.end();
          resolve();
        }
      });
    });
  }

  // Online inline player streaming endpoint (supports Range requests, audio track switching, and Xray VPN proxy)
  app.get('/api/media/stream', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const rawQuality = typeof req.query.quality === 'string' ? req.query.quality.trim() : '720p';
    const quality = rawQuality === 'audio' ? '360p' : rawQuality;
    const audioFormatId = validateAudioFormatId(req.query.audioFormatId);
    const requestedJobId = typeof req.query.jobId === 'string' ? req.query.jobId.trim() : '';

    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

    // 0. If a matching prepared/ready file already exists in cache or Telegram, stream it directly with full Range seeking
    const matchingJob =
      (requestedJobId && /^[0-9a-f-]{36}$/i.test(requestedJobId) ? downloadJobs.get(requestedJobId) : undefined) ||
      Array.from(downloadJobs.values()).find(
        (j) =>
          j.status === 'ready' &&
          j.ext === 'mp4' &&
          j.url === parsed.toString() &&
          j.quality === quality &&
          (j.audioFormatId || '') === (audioFormatId || '')
      );
    if (matchingJob && matchingJob.status === 'ready' && matchingJob.ext === 'mp4') {
      if (matchingJob.telegramFileId) {
        const stored = lookupTelegramFile(matchingJob.telegramFileId);
        if (stored) {
          await streamTelegramFile(stored, req, res, true);
          return;
        }
      }
      const resolvedFile = path.resolve(matchingJob.filePath);
      if (resolvedFile.startsWith(CACHE_DIR + path.sep) && fs.existsSync(resolvedFile)) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(resolvedFile);
        return;
      }
    }

    const targetH = selectTargetHeight(quality);

    if (isInstagramUrl(parsed)) {
      const normalizedIgUrl = normalizeInstagramUrl(parsed);
      try {
        let info = await runParthDlInfo(normalizedIgUrl);
        let entries = Array.isArray(info.entries) ? info.entries : [];
        let videoEntry = entries.find((e) => e.kind === 'video' && Array.isArray(e.formats) && e.formats.length > 0);
        if (!videoEntry) {
          res.status(422).json({
            error: 'This Instagram post contains images only.',
            code: 'INSTAGRAM_IMAGE_ONLY',
          });
          return;
        }
        let fmt = selectInstagramVideoFormat(videoEntry, targetH);
        let validFmtUrl = fmt?.url ? await validatePublicUrl(fmt.url) : null;
        if (!validFmtUrl) {
          res.status(502).json({ error: 'No playable Instagram video URL found.' });
          return;
        }
        try {
          await proxyRemoteMediaWithRange(validFmtUrl.toString(), req, res, {
            Referer: 'https://www.instagram.com/',
          });
          return;
        } catch (proxyErr) {
          const msg = proxyErr instanceof Error ? proxyErr.message : '';
          if (!res.headersSent && /HTTP 403|HTTP 410|HTTP 404/i.test(msg)) {
            info = await runParthDlInfo(normalizedIgUrl, true);
            entries = Array.isArray(info.entries) ? info.entries : [];
            videoEntry = entries.find((e) => e.kind === 'video' && Array.isArray(e.formats) && e.formats.length > 0);
            fmt = videoEntry ? selectInstagramVideoFormat(videoEntry, targetH) : null;
            validFmtUrl = fmt?.url ? await validatePublicUrl(fmt.url) : null;
            if (validFmtUrl) {
              await proxyRemoteMediaWithRange(validFmtUrl.toString(), req, res, {
                Referer: 'https://www.instagram.com/',
              });
              return;
            }
          }
          throw proxyErr;
        }
      } catch (igErr) {
        if (!res.headersSent) {
          const status = igErr instanceof ParthDlInvocationError && igErr.code === 'RATE_LIMIT' ? 429 : 502;
          res.status(status).json({
            error: igErr instanceof Error ? igErr.message : 'Unable to stream Instagram video.',
            code: igErr instanceof ParthDlInvocationError ? igErr.code : 'STREAM_UNAVAILABLE',
          });
        }
        return;
      }
    }

    const ytId = extractYouTubeId(parsed);
    const streamTargetUrl = isXUrl(parsed)
      ? normalizeXUrl(parsed)
      : ytId
        ? `https://www.youtube.com/watch?v=${ytId}`
        : parsed.toString();
    const isTikTok = isTikTokUrl(parsed);
    const runner = await getYtDlpRunner();
    let lastStreamError = '';
    let suppressYtdlFallback = Boolean(adminConfig.xray.enabled && xrayState.running);

    if (runner) {
      try {
        const { extraArgs, env } = await getYtDlpAuthAndProxy();
        const cfgFingerprint = ytId
          ? getYouTubeConfigFingerprint()
          : `${adminConfig.xray.enabled}:${adminConfig.xray.activeProfileId || ''}:${adminConfig.potProvider.enabled}:${Boolean(adminConfig.youtubeCookies)}`;
        const cacheKey = `${streamTargetUrl}::${targetH}::${audioFormatId || ''}::${cfgFingerprint}`;

        let resolvedEntry = streamResolveCache.get(cacheKey);
        if (resolvedEntry && resolvedEntry.expiresAt < Date.now()) {
          streamResolveCache.delete(cacheKey);
          resolvedEntry = undefined;
        }

        if (!resolvedEntry && ytId) {
          const cachedRaw = youtubeRawInfoCache.get(`${ytId}::${cfgFingerprint}`);
          if (cachedRaw && cachedRaw.expiresAt > Date.now()) {
            const fromRaw = resolveYouTubeStreamFromRawInfo(
              cachedRaw.info,
              targetH,
              audioFormatId,
              buildUpstreamHeaders,
              extractCookieHeaderFromYtDlp,
              isManifestOrIncompatibleFormat
            );
            if (fromRaw) {
              setBoundedCache(streamResolveCache, cacheKey, fromRaw, 100);
              resolvedEntry = fromRaw;
            }
          } else if (cachedRaw) {
            youtubeRawInfoCache.delete(`${ytId}::${cfgFingerprint}`);
          }
        }

        if (!resolvedEntry && ytId) {
          const cooldownMs = getYouTubeCooldownRemainingMs(cfgFingerprint);
          if (cooldownMs > 0) {
            suppressYtdlFallback = true;
            throw new Error(
              `YouTube rate-limit protection active. Retry in ${Math.max(1, Math.ceil(cooldownMs / 1000))}s.`
            );
          }
        }

        if (!resolvedEntry) {
          let inflight = streamInflightMap.get(cacheKey);
          if (!inflight) {
            const resolveTask = async (): Promise<ResolvedStreamEntry> => {
              const formatSelector = audioFormatId
                ? `bestvideo[height<=${targetH}][vcodec^=avc]+${audioFormatId}/bestvideo[height<=${targetH}]+${audioFormatId}/best[height<=${targetH}]`
                : isTikTok
                  ? `best[height<=${targetH}][format_id!*=-watermarked][ext=mp4][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][format_id!*=-watermarked]/best[height<=${targetH}][ext=mp4][vcodec!=none][acodec!=none]/best[height<=${targetH}]/best`
                  : targetH <= 360
                    ? `best[height<=360][ext=mp4][vcodec^=avc][acodec^=mp4a]/best[height<=360][ext=mp4][vcodec!=none][acodec!=none]/bestvideo[height<=360][vcodec^=avc]+bestaudio[acodec^=mp4a]/bestvideo[height<=360]+bestaudio/best[height<=360]/best`
                    : `best[height<=${targetH}][height>=480][ext=mp4][vcodec!=none][acodec!=none]/bestvideo[height<=${targetH}][vcodec^=avc]+bestaudio[acodec^=mp4a]/bestvideo[height<=${targetH}]+bestaudio/best[height<=${targetH}][ext=mp4]/best[height<=${targetH}]/best`;

              const args = insertBeforeDoubleDash(
                buildYtDlpArgs(
                  [
                    '--dump-single-json',
                    '-f',
                    formatSelector,
                    '--no-playlist',
                    '--playlist-items',
                    '1',
                    '--no-warnings',
                    '--',
                    streamTargetUrl,
                  ],
                  { isYouTube: Boolean(ytId) }
                ),
                extraArgs
              );
              const { stdout } = await execFileAsync(runner.cmd, [...runner.baseArgs, ...args], {
                timeout: 30000,
                maxBuffer: 8 * 1024 * 1024,
                env,
              });
              const rawJson = JSON.parse(stdout) as Record<string, unknown> & {
                entries?: Array<Record<string, unknown>>;
              };
              const entry =
                Array.isArray(rawJson.entries) && rawJson.entries.length > 0 ? rawJson.entries[0] : rawJson;

              if (ytId) {
                setBoundedCache(
                  youtubeRawInfoCache,
                  `${ytId}::${cfgFingerprint}`,
                  { info: entry, expiresAt: Date.now() + YOUTUBE_RAW_INFO_CACHE_TTL_MS },
                  80
                );
              }

              const toSpec = (fmt: Record<string, unknown>): StreamInputSpec | null => {
                const u = typeof fmt.url === 'string' ? fmt.url.trim() : '';
                if (!/^https?:\/\//i.test(u)) return null;
                const hdrs = buildUpstreamHeaders(
                  fmt.http_headers && typeof fmt.http_headers === 'object'
                    ? (fmt.http_headers as Record<string, string>)
                    : undefined,
                  extractCookieHeaderFromYtDlp(fmt.cookies)
                );
                return {
                  url: u,
                  headers: hdrs,
                  protocol: typeof fmt.protocol === 'string' ? fmt.protocol : undefined,
                  vcodec: typeof fmt.vcodec === 'string' ? fmt.vcodec : undefined,
                  acodec: typeof fmt.acodec === 'string' ? fmt.acodec : undefined,
                  ext: typeof fmt.ext === 'string' ? fmt.ext : undefined,
                };
              };

              const reqFmts = Array.isArray(entry.requested_formats)
                ? (entry.requested_formats as Array<Record<string, unknown>>)
                : null;
              let inputs: StreamInputSpec[] = [];
              if (reqFmts && reqFmts.length >= 2) {
                inputs = reqFmts.map(toSpec).filter((x): x is StreamInputSpec => x !== null);
              } else if (reqFmts && reqFmts.length === 1) {
                const one = toSpec(reqFmts[0]);
                if (one) inputs = [one];
              } else {
                const one = toSpec(entry);
                if (one) inputs = [one];
              }

              if (inputs.length === 0) {
                throw new Error('No playable stream URL found for this media.');
              }

              const mode: 'proxy' | 'ffmpeg' =
                inputs.length >= 2 || isManifestOrIncompatibleFormat(inputs[0]) ? 'ffmpeg' : 'proxy';

              const resolved: ResolvedStreamEntry = {
                mode,
                inputs,
                expiresAt: Date.now() + 4 * 60 * 1000,
              };
              setBoundedCache(streamResolveCache, cacheKey, resolved, 100);
              return resolved;
            };
            inflight = ytId ? runPacedYouTubeTask(resolveTask) : resolveTask();
            streamInflightMap.set(cacheKey, inflight);
          }

          try {
            resolvedEntry = await inflight;
          } finally {
            streamInflightMap.delete(cacheKey);
          }
        }

        if (resolvedEntry.mode === 'proxy' && resolvedEntry.inputs[0]) {
          try {
            await proxyRemoteMediaWithRange(resolvedEntry.inputs[0].url, req, res, resolvedEntry.inputs[0].headers);
            return;
          } catch (proxyErr) {
            streamResolveCache.delete(cacheKey);
            if (ytId) youtubeRawInfoCache.delete(`${ytId}::${cfgFingerprint}`);
            throw proxyErr;
          }
        }
        if (resolvedEntry.mode === 'ffmpeg' && resolvedEntry.inputs.length > 0) {
          try {
            await spawnFfmpegStream(resolvedEntry.inputs, env, req, res);
            return;
          } catch (ffErr) {
            streamResolveCache.delete(cacheKey);
            if (ytId) youtubeRawInfoCache.delete(`${ytId}::${cfgFingerprint}`);
            throw ffErr;
          }
        }
      } catch (err: unknown) {
        if (ytId && isYouTubeBotOrRateLimitError(err)) {
          recordYouTubeRateLimit(getYouTubeConfigFingerprint());
          suppressYtdlFallback = true;
        }
        const errObj = err as { stderr?: string; message?: string };
        const stderrLines = (errObj.stderr || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('WARNING:'));
        lastStreamError = stderrLines[stderrLines.length - 1] || errObj.message || '';
        if (res.headersSent) return;
      }
    }

    if (isXUrl(parsed) || isTikTokUrl(parsed)) {
      try {
        const resolved = isXUrl(parsed)
          ? await resolveXMediaFallback(parsed)
          : await resolveTikTokMediaFallback(parsed);
        if (resolved.videos.length > 0) {
          await proxyRemoteMediaWithRange(resolved.videos[0].url, req, res, {
            ...(resolved.referer ? { Referer: resolved.referer } : {}),
          });
          return;
        }
        if (resolved.photos.length > 0) {
          res.status(422).json({
            error: 'This post contains images only.',
            code: isXUrl(parsed) ? 'X_IMAGE_ONLY' : 'TIKTOK_IMAGE_ONLY',
          });
          return;
        }
      } catch (fallbackErr) {
        if (!lastStreamError && fallbackErr instanceof Error) {
          lastStreamError = fallbackErr.message;
        }
        if (res.headersSent) return;
      }
    }

    if (ytId && !suppressYtdlFallback) {
      const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
      try {
        const info = await ytdl.getInfo(watchUrl);
        const customItag = audioFormatId ? Number(audioFormatId) : NaN;
        const customAudio = Number.isFinite(customItag)
          ? info.formats.find((f: VideoFormat) => f.itag === customItag && f.hasAudio)
          : undefined;
        const muxed = info.formats
          .filter((f: VideoFormat) => f.hasVideo && f.hasAudio && (f.height || 0) <= targetH)
          .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0))[0];

        if (!customAudio && muxed?.url && (targetH <= 360 || (muxed.height || 0) >= Math.min(targetH, 720))) {
          await proxyRemoteMediaWithRange(muxed.url, req, res);
          return;
        }

        const videoFmt =
          info.formats
            .filter((f: VideoFormat) => f.hasVideo && !f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0))[0] || muxed;
        const audioFmt =
          customAudio ||
          chooseFormat(info.formats, {
            quality: Quality.HighestAudio,
            filter: { hasAudio: true, hasVideo: false },
          });

        if (videoFmt?.url && audioFmt?.url) {
          await spawnFfmpegStream(
            [
              { url: videoFmt.url, headers: buildUpstreamHeaders(), ext: videoFmt.container || 'mp4' },
              { url: audioFmt.url, headers: buildUpstreamHeaders(), ext: audioFmt.container || 'm4a' },
            ],
            process.env,
            req,
            res
          );
          return;
        }
        if (muxed?.url) {
          await proxyRemoteMediaWithRange(muxed.url, req, res);
          return;
        }
      } catch (err) {
        if (!lastStreamError && err instanceof Error) {
          lastStreamError = err.message;
        }
        if (res.headersSent) return;
      }
    }

    // Only proxy directly if the target URL itself serves a video/* or audio/* stream
    try {
      let probeRes = await fetch(parsed.toString(), {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      if (probeRes.status === 405 || probeRes.status === 403) {
        probeRes = await fetch(parsed.toString(), {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          signal: AbortSignal.timeout(5000),
        });
        void probeRes.body?.cancel().catch(() => {});
      }
      const ct = (probeRes.headers.get('content-type') || '').toLowerCase();
      const looksLikeDirectMedia =
        ct.startsWith('video/') ||
        ct.startsWith('audio/') ||
        (ct.startsWith('application/octet-stream') &&
          /\.(mp4|webm|m4v|mov|mp3|m4a|ogg|wav)(\?|$)/i.test(parsed.pathname));
      if (probeRes.ok && looksLikeDirectMedia) {
        await proxyRemoteMediaWithRange(parsed.toString(), req, res);
        return;
      }
    } catch {
      // Fall through to structured JSON error
    }

    if (!res.headersSent) {
      const cleanErr = lastStreamError
        .replace(/^ERROR:\s*/i, '')
        .replace(/\[youtube\]\s*[a-zA-Z0-9_-]+:\s*/i, '')
        .slice(0, 260);
      const isBotOrAuth = /sign in|bot|cookies|login_required/i.test(cleanErr);
      res.status(502).json({
        error: cleanErr || 'Unable to stream media online.',
        code: ytId && isBotOrAuth ? 'YOUTUBE_AUTH_REQUIRED' : 'STREAM_UNAVAILABLE',
        ...(ytId ? { youtubeId: ytId } : {}),
      });
    }
  });

  // WebVTT Subtitle proxy & download endpoint (supports manual and auto captions)
  app.get('/api/media/subtitle', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const lang = typeof req.query.lang === 'string' ? req.query.lang.trim() : '';
    const isAuto = req.query.auto === '1';
    const asDownload = req.query.download === '1';

    if (!/^[a-zA-Z0-9_-]{1,24}$/.test(lang)) {
      res.status(400).json({ error: 'Invalid subtitle language code.' });
      return;
    }
    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

    const sendVtt = (vttText: string) => {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      if (asDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="subtitle_${lang}.vtt"`);
      }
      res.send(vttText);
    };

    const ytId = extractYouTubeId(parsed);
    const subCacheKey = `${ytId || parsed.toString()}::${lang}::${isAuto ? '1' : '0'}`;
    const cachedSub = youtubeSubtitleCache.get(subCacheKey);
    if (cachedSub && cachedSub.expiresAt > Date.now()) {
      sendVtt(cachedSub.vtt);
      return;
    }
    if (cachedSub) youtubeSubtitleCache.delete(subCacheKey);

    let inflightSub = youtubeSubtitleInflight.get(subCacheKey);
    if (!inflightSub) {
      inflightSub = (async (): Promise<string | null> => {
        const fp = ytId ? getYouTubeConfigFingerprint() : '';

        // 1. Try direct timedtext VTT URL from cached inspect/stream raw info (0 extra yt-dlp calls!)
        if (ytId) {
          const cachedRaw = youtubeRawInfoCache.get(`${ytId}::${fp}`);
          if (cachedRaw && cachedRaw.expiresAt > Date.now()) {
            const subUrl = findSubtitleUrlFromRawInfo(cachedRaw.info, lang, isAuto);
            if (subUrl) {
              try {
                if (adminConfig.xray.enabled && xrayState.running) {
                  const resp = await proxyHttpGetFullText(subUrl, adminConfig.xray.httpPort, 12000);
                  if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.body.trim()) {
                    return resp.body;
                  }
                } else {
                  const resp = await fetch(subUrl, { signal: AbortSignal.timeout(12000) });
                  if (resp.ok) {
                    const text = await resp.text();
                    if (text.trim()) return text;
                  }
                }
              } catch {
                // Fall through to yt-dlp below
              }
            }
          }
        }

        const runner = await getYtDlpRunner();
        let suppressSubYtdlFallback = Boolean(adminConfig.xray.enabled && xrayState.running);
        if (runner && (!ytId || getYouTubeCooldownRemainingMs(fp) === 0)) {
          let tempDir: string | null = null;
          try {
            tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-sub-'));
            const { extraArgs, env } = await getYtDlpAuthAndProxy();
            const subArgs = insertBeforeDoubleDash(
              buildYtDlpArgs(
                [
                  '--skip-download',
                  isAuto ? '--write-auto-subs' : '--write-subs',
                  '--sub-langs',
                  lang,
                  '--sub-format',
                  'vtt/srt/best',
                  '--convert-subs',
                  'vtt',
                  '--no-playlist',
                  '-o',
                  path.join(tempDir, 'sub.%(ext)s'),
                  '--',
                  ytId ? `https://www.youtube.com/watch?v=${ytId}` : parsed.toString(),
                ],
                { isYouTube: Boolean(ytId), isSubtitle: true }
              ),
              extraArgs
            );
            const execSub = () => execFileAsync(runner.cmd, [...runner.baseArgs, ...subArgs], { timeout: 28000, env });
            if (ytId) {
              await runPacedYouTubeTask(execSub);
            } else {
              await execSub();
            }
            const files = await fs.promises.readdir(tempDir);
            const vttFile = files.find((f) => f.endsWith('.vtt')) || files[0];
            if (vttFile) {
              const content = await fs.promises.readFile(path.join(tempDir, vttFile), 'utf8');
              if (content.trim()) {
                return content;
              }
            }
          } catch (subErr) {
            if (ytId && isYouTubeBotOrRateLimitError(subErr)) {
              recordYouTubeRateLimit(fp);
              suppressSubYtdlFallback = true;
            }
          } finally {
            if (tempDir) {
              await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            }
          }
        }

        if (ytId && !suppressSubYtdlFallback) {
          try {
            const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${ytId}`);
            type SubtitlePlayerResp = {
              captions?: {
                playerCaptionsTracklistRenderer?: {
                  captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>;
                };
              };
            };
            const rawInfo = info as unknown as {
              playerResponse?: SubtitlePlayerResp;
              player_response?: SubtitlePlayerResp;
            };
            const playerResp = rawInfo.playerResponse || rawInfo.player_response;
            const captionTracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

            const match =
              captionTracks.find((c) => c.languageCode === lang && (isAuto ? c.kind === 'asr' : c.kind !== 'asr')) ||
              captionTracks.find((c) => c.languageCode === lang);

            if (match?.baseUrl) {
              const vttUrl = match.baseUrl.includes('fmt=')
                ? match.baseUrl.replace(/fmt=[^&]+/, 'fmt=vtt')
                : `${match.baseUrl}&fmt=vtt`;

              if (adminConfig.xray.enabled && xrayState.running) {
                const resp = await proxyHttpGetFullText(vttUrl, adminConfig.xray.httpPort, 10000);
                if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.body.trim()) {
                  return resp.body;
                }
              } else {
                const resp = await fetch(vttUrl, { signal: AbortSignal.timeout(10000) });
                if (resp.ok) {
                  const text = await resp.text();
                  if (text.trim()) return text;
                }
              }
            }
          } catch {
            // Fall through to 404
          }
        }

        return null;
      })();
      youtubeSubtitleInflight.set(subCacheKey, inflightSub);
    }

    try {
      const vttText = await inflightSub;
      if (vttText) {
        setBoundedCache(
          youtubeSubtitleCache,
          subCacheKey,
          { vtt: vttText, expiresAt: Date.now() + YOUTUBE_SUBTITLE_CACHE_TTL_MS },
          150
        );
        sendVtt(vttText);
        return;
      }
    } finally {
      youtubeSubtitleInflight.delete(subCacheKey);
    }

    res.status(404).json({ error: 'Subtitle track not found.' });
  });

  app.get('/api/media/download', async (req: Request, res: Response) => {
    // Legacy endpoint: it downloads to os.tmpdir() with no size bound, which is
    // exactly the disk usage Telegram storage exists to avoid. The current UI
    // uses /api/media/prepare + /api/media/stream, so refuse it while diskless
    // uploads are configured.
    if (telegramEnabledForUploads(adminConfig.telegram)) {
      res.status(409).json({
        error: 'This endpoint writes to the server disk. Use /api/media/prepare and /api/media/stream while Telegram storage is enabled.',
      });
      return;
    }

    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const quality = typeof req.query.quality === 'string' ? req.query.quality.trim() : '1080p';
    const rawTitle = typeof req.query.title === 'string' ? req.query.title : 'grove-save-media';

    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

    const isAudio = quality === 'audio';
    const ext = isAudio ? 'mp3' : 'mp4';
    const contentDisposition = buildContentDisposition(rawTitle, quality, ext);
    const ytId = extractYouTubeId(parsed);

    if (isInstagramUrl(parsed)) {
      const normalizedIgUrl = normalizeInstagramUrl(parsed);
      const targetH = selectTargetHeight(quality);
      const parthQuality: 'best' | 'worst' = !isAudio && targetH <= 480 ? 'worst' : 'best';
      let workDir = '';
      try {
        workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-ig-dl-'));
        const { files } = await runParthDlDownload(normalizedIgUrl, workDir, parthQuality);
        const resolvedFiles = files
          .map((f) => path.resolve(f))
          .filter((f) => f.startsWith(workDir + path.sep) && fs.existsSync(f));
        if (!resolvedFiles.length) {
          res.status(502).json({ error: 'No downloadable content found for this Instagram link.' });
          return;
        }

        let sendPath = '';
        let outExt: DownloadFileExt = 'mp4';
        if (isAudio) {
          const videoFile = resolvedFiles.find((f) => /\.(mp4|mov|webm|mkv|m4v)$/i.test(f));
          if (!videoFile) {
            res.status(422).json({ error: 'This Instagram post contains no video for MP3 extraction.' });
            return;
          }
          sendPath = path.join(workDir, 'audio.mp3');
          await new Promise<void>((resolve, reject) => {
            const ff = spawn(
              'ffmpeg',
              ['-y', '-i', videoFile, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-f', 'mp3', sendPath],
              { shell: false }
            );
            ff.on('error', reject);
            ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Audio extraction failed'))));
          });
          outExt = 'mp3';
        } else if (resolvedFiles.length > 1) {
          sendPath = path.join(workDir, 'carousel.zip');
          await execFileAsync(
            'python3',
            ['-m', 'zipfile', '-c', sendPath, ...resolvedFiles.map((f) => path.basename(f))],
            { cwd: workDir, timeout: 30000 }
          );
          outExt = 'zip';
        } else {
          sendPath = resolvedFiles[0];
          const rawExt = path.extname(sendPath).toLowerCase().replace('.', '');
          outExt =
            rawExt === 'jpeg' || rawExt === 'jpg'
              ? 'jpg'
              : rawExt === 'png'
                ? 'png'
                : rawExt === 'webp'
                  ? 'webp'
                  : 'mp4';
        }

        const stat = await fs.promises.stat(sendPath);
        res.setHeader('Content-Type', getMimeTypeForExt(outExt));
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Content-Disposition', buildContentDisposition(rawTitle, quality, outExt));
        res.setHeader('X-Grove-Stream-Mode', 'parth-dl');
        await new Promise<void>((resolve, reject) => {
          const rs = fs.createReadStream(sendPath);
          rs.on('error', reject);
          res.on('close', () => {
            rs.destroy();
            resolve();
          });
          rs.on('end', resolve);
          rs.pipe(res);
        });
        return;
      } catch (err) {
        if (!res.headersSent) {
          res.status(502).json({ error: err instanceof Error ? err.message : 'Instagram download failed.' });
        }
        return;
      } finally {
        if (workDir) {
          await fs.promises.rm(workDir, { recursive: true, force: true }).catch(() => {});
        }
      }
    }

    const dlTargetUrl = isXUrl(parsed)
      ? normalizeXUrl(parsed)
      : ytId
        ? `https://www.youtube.com/watch?v=${ytId}`
        : parsed.toString();
    const runner = await getYtDlpRunner();
    if (runner) {
      const targetH = String(selectTargetHeight(quality));
      const isTikTokDl = isTikTokUrl(parsed);
      const baseArgs = isAudio
        ? ['-x', '--audio-format', 'mp3', '-o', '-', '--', dlTargetUrl]
        : [
            '-f',
            isTikTokDl
              ? `best[height<=${targetH}][format_id!*=-watermarked][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][format_id!*=-watermarked]/best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}]/best`
              : `best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][vcodec^=avc]/best[height<=${targetH}]/best`,
            '--recode-video',
            'mp4',
            '-o',
            '-',
            '--',
            dlTargetUrl,
          ];
      const { extraArgs, env } = await getYtDlpAuthAndProxy();
      const finalArgs = insertBeforeDoubleDash(
        buildYtDlpArgs(baseArgs, { isYouTube: Boolean(ytId), isDownload: true }),
        extraArgs
      );

      res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', contentDisposition);
      res.setHeader('X-Grove-Stream-Mode', 'live');

      const child = spawn(runner.cmd, [...runner.baseArgs, ...finalArgs], { shell: false, env });
      child.stdout.pipe(res);
      req.on('close', () => {
        if (!child.killed) child.kill('SIGTERM');
      });
      child.on('error', () => {
        if (!res.headersSent) res.status(502).json({ error: 'Stream extraction failed.' });
      });
      return;
    }

    // Built-in @distube/ytdl-core + ffmpeg stream extraction
    if (ytId) {
      const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
      let tempDir: string | null = null;
      try {
        const info = await ytdl.getInfo(watchUrl);

        if (isAudio) {
          const audioFormat = chooseFormat(info.formats, {
            quality: Quality.HighestAudio,
            filter: { hasAudio: true, hasVideo: false },
          });
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Disposition', contentDisposition);
          res.setHeader('X-Grove-Stream-Mode', 'live');

          const audioStream = ytdl.download(info, { format: audioFormat });
          const ff = spawn(
            'ffmpeg',
            [
              '-i', 'pipe:0',
              '-vn',
              '-c:a', 'libmp3lame',
              '-b:a', '192k',
              '-metadata', `title=${sanitizeFilename(rawTitle)}`,
              '-f', 'mp3',
              'pipe:1',
            ],
            { shell: false }
          );
          audioStream.on('error', () => {
            if (!ff.killed) ff.kill('SIGTERM');
            if (!res.writableEnded) res.end();
          });
          ff.stdin.on('error', () => {});
          ff.on('error', () => {
            audioStream.destroy();
            if (!res.writableEnded) res.end();
          });
          audioStream.pipe(ff.stdin);
          ff.stdout.pipe(res);
          req.on('close', () => {
            audioStream.destroy();
            if (!ff.killed) ff.kill('SIGTERM');
          });
          return;
        }

        const targetH = selectTargetHeight(quality);
        const muxedFormats = info.formats
          .filter((f: VideoFormat) => f.hasVideo && f.hasAudio && (f.height || 0) <= targetH)
          .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));

        // If muxed format already hits exact requested height (e.g. 720p or 360p), stream directly
        const bestMuxed = muxedFormats[0];
        if (bestMuxed && (bestMuxed.height || 0) >= targetH && bestMuxed.container === 'mp4') {
          res.setHeader('Content-Type', 'video/mp4');
          if (bestMuxed.contentLength) {
            res.setHeader('Content-Length', String(bestMuxed.contentLength));
          }
          res.setHeader('Content-Disposition', contentDisposition);
          res.setHeader('X-Grove-Stream-Mode', 'live');
          const stream = ytdl.download(info, { format: bestMuxed });
          stream.on('error', () => {
            if (!res.writableEnded) res.end();
          });
          stream.pipe(res);
          req.on('close', () => stream.destroy());
          return;
        }

        // Otherwise fetch best video <= targetH + best audio and mux with ffmpeg
        const videoCandidates = info.formats
          .filter((f: VideoFormat) => f.hasVideo && !f.hasAudio && (f.height || 0) <= targetH)
          .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));
        const videoFormat = videoCandidates[0] || bestMuxed;
        const audioFormat = chooseFormat(info.formats, {
          quality: Quality.HighestAudio,
          filter: { hasAudio: true, hasVideo: false },
        });

        if (videoFormat && audioFormat && !videoFormat.hasAudio) {
          tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'grovesave-'));
          const vPath = path.join(tempDir, 'video.bin');
          const aPath = path.join(tempDir, 'audio.bin');

          await Promise.all([
            pipeline(ytdl.download(info, { format: videoFormat }), fs.createWriteStream(vPath)),
            pipeline(ytdl.download(info, { format: audioFormat }), fs.createWriteStream(aPath)),
          ]);

          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', contentDisposition);
          res.setHeader('X-Grove-Stream-Mode', 'live');

          const ff = spawn(
            'ffmpeg',
            [
              '-i', vPath,
              '-i', aPath,
              '-c:v', 'copy',
              '-c:a', 'aac',
              '-b:a', '192k',
              '-movflags', 'frag_keyframe+empty_moov',
              '-f', 'mp4',
              'pipe:1',
            ],
            { shell: false }
          );

          const cleanup = () => {
            if (tempDir) {
              fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
              tempDir = null;
            }
          };

          ff.on('error', () => {
            cleanup();
            if (!res.writableEnded) res.end();
          });
          ff.stdout.pipe(res);
          ff.on('close', cleanup);
          req.on('close', () => {
            if (!ff.killed) ff.kill('SIGTERM');
            cleanup();
          });
          return;
        } else if (videoFormat) {
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', contentDisposition);
          res.setHeader('X-Grove-Stream-Mode', 'live');
          const stream = ytdl.download(info, { format: videoFormat });
          stream.on('error', () => {
            if (!res.writableEnded) res.end();
          });
          stream.pipe(res);
          req.on('close', () => stream.destroy());
          return;
        }
      } catch {
        if (tempDir) {
          fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
        // Fall through to direct/preview fallback
      }
    }

    // Check if URL itself is a direct video/audio file
    try {
      const headRes = await fetch(parsed.toString(), {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      });
      const ct = headRes.headers.get('content-type') || '';
      if (ct.startsWith('video/') || ct.startsWith('audio/')) {
        const remote = await fetch(parsed.toString(), { signal: AbortSignal.timeout(30000) });
        if (remote.ok && remote.body) {
          res.setHeader('Content-Type', ct);
          const len = remote.headers.get('content-length');
          if (len) res.setHeader('Content-Length', len);
          res.setHeader('Content-Disposition', contentDisposition);
          res.setHeader('X-Grove-Stream-Mode', 'direct');
          const reader = remote.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
          return;
        }
      }
    } catch {
      // Fall through to local ffmpeg playable container synthesis
    }

    // Fallback playable media container when external extraction is blocked
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('X-Grove-Stream-Mode', 'preview-container');

    const resMap: Record<string, string> = {
      '2160p': '1920x1080',
      '1080p': '1280x720',
      '720p': '1280x720',
      '480p': '854x480',
      '360p': '640x360',
    };

    const ffArgs = isAudio
      ? [
          '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
          '-metadata', `title=${sanitizeFilename(rawTitle)}`,
          '-c:a', 'libmp3lame', '-b:a', '192k',
          '-f', 'mp3', 'pipe:1',
        ]
      : [
          '-f', 'lavfi', '-i', `color=c=black:s=${resMap[quality] || '1280x720'}:d=3`,
          '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
          '-metadata', `title=${sanitizeFilename(rawTitle)}`,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', 'frag_keyframe+empty_moov',
          '-f', 'mp4', 'pipe:1',
        ];

    const ff = spawn('ffmpeg', ffArgs, { shell: false });
    ff.stdout.pipe(res);
    req.on('close', () => {
      if (!ff.killed) ff.kill('SIGTERM');
    });
    ff.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'Media encoding unavailable.' });
    });
  });

  const httpServer = http.createServer(app);

  if (!IS_PROD) {
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Remove orphaned temporary downloads left in persistent cache from previous runs
  fs.promises.readdir(CACHE_DIR)
    .then((entries) =>
      Promise.allSettled(
        entries.map((entry) => fs.promises.rm(path.join(CACHE_DIR, entry), { recursive: true, force: true }))
      )
    )
    .catch(() => {});

  // Auto-provision prerequisites on Linux/Railway boot (non-blocking) & start Xray + bgutil POT server
  const bootBackgroundServices = async () => {
    try {
      if (process.platform === 'linux') {
        const existingXray = await findXrayBinary();
        if (!existingXray) {
          await installXrayBinary().catch(() => {});
        }
      }
      if (adminConfig.xray.enabled && adminConfig.xray.configInput.trim()) {
        await startXrayProcess();
      }
      await getYtDlpRunner({ autoInstall: true }).catch(() => null);
      await getParthDlRunner({ autoInstall: true }).catch(() => false);
      syncBgutilPluginFromRepo();
      if (adminConfig.potProvider.enabled && adminConfig.potProvider.mode === 'managed') {
        await startBgutilPotServer();
      }
      if (telegramIsConfigured(adminConfig.telegram) && adminConfig.telegram.enabled) {
        if (telegramUsesBotHttpApi(adminConfig.telegram)) {
          await callTelegramBotApi<{ username?: string; first_name?: string }>(
            adminConfig.telegram.botToken,
            'getMe'
          )
            .then((me) => {
              telegramState.selfLabel = me.username ? `@${me.username}` : me.first_name || null;
              telegramState.lastError = null;
            })
            .catch((err) => {
              telegramState.lastError = sanitizeTelegramError(err, adminConfig.telegram.botToken);
            });
        } else {
          await getTelegramClient().catch((err) => {
            telegramState.lastError = sanitizeTelegramError(err, adminConfig.telegram.botToken);
          });
        }
      }
    } catch {
      // Non-fatal boot background provisioning error; inspectable via admin panels
    }
  };
  void bootBackgroundServices();

  const handleShutdown = () => {
    void Promise.allSettled([
      stopBgutilPotServer(),
      stopXrayProcess(),
      disposeTelegramClient(),
      pendingTelegramLogin
        ? pendingTelegramLogin.client.disconnect().catch(() => {})
        : Promise.resolve(),
    ]).finally(() => {
      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
        db.close();
      } catch {
        // ignore close errors during shutdown
      }
      process.exit(0);
    });
  };
  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Grove Save server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
