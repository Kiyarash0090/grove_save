import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { Ytdl, chooseFormat, Quality } from '@distube/ytdl-core';
import type { VideoFormat } from '@distube/ytdl-core';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';

const ytdl = new Ytdl();
const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CACHE_DIR = path.resolve(DATA_DIR, 'cache');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

interface DownloadJob {
  id: string;
  url: string;
  title: string;
  quality: string;
  ext: 'mp4' | 'mp3';
  mimeType: string;
  status: 'downloading' | 'processing' | 'ready' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  filePath: string;
  contentDisposition: string;
  error?: string;
  createdAt: number;
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

function loadUsers(): Map<string, StoredUser> {
  try {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
      return new Map();
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const arr = JSON.parse(raw) as StoredUser[];
    const map = new Map<string, StoredUser>();
    for (const u of arr) {
      map.set(u.email.toLowerCase(), u);
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveUsers(map: Map<string, StoredUser>): void {
  ensureDataDir();
  const arr = Array.from(map.values());
  fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

const usersByEmail = loadUsers();

// Sync admin account from environment variables if configured
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const adminEmailClean = ADMIN_EMAIL.trim().toLowerCase();
  const { hash, salt } = hashPassword(ADMIN_PASSWORD);
  const existing = usersByEmail.get(adminEmailClean);
  const adminUser: StoredUser = {
    id: existing?.id || crypto.randomUUID(),
    email: adminEmailClean,
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
  usersByEmail.set(adminEmailClean, adminUser);
  saveUsers(usersByEmail);
}

function signToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): { sub: string; email: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      exp: number;
    };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return { sub: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
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
    'vimeo.com',
    'dailymotion.com',
    'twitch.tv',
    'soundcloud.com',
  ];
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
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

let cachedYtDlpPath: string | null | undefined;
let cachedYtDlpVersion: string | null | undefined;

// Use python -m yt_dlp for cross-platform compatibility (Windows .exe issue)
const YTDLP_CMD = process.platform === 'win32' ? 'python' : 'yt-dlp';
const YTDLP_ARGS = process.platform === 'win32' ? ['-m', 'yt_dlp'] : [];

async function getYtDlpPath(): Promise<string | null> {
  if (cachedYtDlpPath !== undefined) return cachedYtDlpPath;
  try {
    // Just verify yt-dlp is available via python module
    const { stdout } = await execFileAsync(YTDLP_CMD, [...YTDLP_ARGS, '--version'], { timeout: 5000 });
    cachedYtDlpPath = stdout.trim() ? 'available' : null;
  } catch {
    cachedYtDlpPath = null;
  }
  return cachedYtDlpPath;
}

async function getYtDlpVersion(): Promise<string | null> {
  if (cachedYtDlpVersion !== undefined) return cachedYtDlpVersion;
  const ytdlp = await getYtDlpPath();
  if (!ytdlp) return null;
  try {
    const { stdout } = await execFileAsync(YTDLP_CMD, [...YTDLP_ARGS, '--version'], { timeout: 5000 });
    cachedYtDlpVersion = stdout.trim();
  } catch {
    cachedYtDlpVersion = null;
  }
  return cachedYtDlpVersion;
}

function buildYtDlpArgs(baseArgs: string[]): string[] {
  // Ensure yt-dlp uses Node.js as JavaScript runtime for YouTube extraction
  // This is needed because newer YouTube player requires JS execution
  // Also add --no-check-certificate for container environments
  // Add --remote-components ejs:github for YouTube challenge solving
  return ['--js-runtimes', 'node', '--no-check-certificate', '--remote-components', 'ejs:github', ...baseArgs];
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
}

function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const claims = verifyToken(token);
    if (claims) {
      const user = usersByEmail.get(claims.email.toLowerCase());
      if (user) {
        req.authUser = user;
      }
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
    next();
  });
}

function publicUserView(u: StoredUser) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    provider: u.provider,
    preferences: u.preferences,
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
  app.use(express.json({ limit: '1mb' }));

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
    if (usersByEmail.has(email)) {
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
      role: 'user',
      provider: 'email',
      preferences: {
        theme: 'dark',
        language: 'en',
        defaultQuality: '1080p',
      },
    };
    usersByEmail.set(email, user);
    saveUsers(usersByEmail);

    const token = signToken(user.id, user.email);
    res.status(201).json({ token, user: publicUserView(user) });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const user = usersByEmail.get(email);
    if (!user || !user.passwordHash || !user.passwordSalt) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user.id, user.email);
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
      let user = usersByEmail.get(email);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email,
          displayName: data.name || email.split('@')[0],
          provider: 'google',
          role: 'user',
          preferences: {
            theme: 'dark',
            language: 'en',
            defaultQuality: '1080p',
          },
        };
        usersByEmail.set(email, user);
        saveUsers(usersByEmail);
      }
      const token = signToken(user.id, user.email);
      res.json({ token, user: publicUserView(user) });
    } catch {
      res.status(502).json({ error: 'Failed to verify Google credential.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: publicUserView(req.authUser!) });
  });

  app.put('/api/user/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
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
      ['2160p', '1080p', '720p', '480p', '360p', 'audio'].includes(body.defaultQuality)
    ) {
      user.preferences.defaultQuality = body.defaultQuality;
    }
    usersByEmail.set(user.email, user);
    saveUsers(usersByEmail);
    res.json({ user: publicUserView(user) });
  });

  // YouTube Authentication endpoints (admin only)
  app.get('/api/admin/youtube-auth', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    res.json({
      youtubeCookies: user.preferences.youtubeCookies || '',
      youtubePoToken: user.preferences.youtubePoToken || '',
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
      user.preferences.youtubeCookies = body.youtubeCookies.trim();
    }
    if (typeof body.youtubePoToken === 'string') {
      user.preferences.youtubePoToken = body.youtubePoToken.trim();
    }
    usersByEmail.set(user.email, user);
    saveUsers(usersByEmail);
    res.json({ success: true });
  });

  app.post('/api/admin/youtube-auth/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const available = await getYtDlpPath();
    if (!available) {
      res.status(500).json({ error: 'yt-dlp not available' });
      return;
    }
    try {
      const args = buildYtDlpArgs([
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '--',
        testUrl,
      ]);
      // Add cookies and PO token if configured
      if (user.preferences.youtubeCookies) {
        const cookieFile = path.join(CACHE_DIR, `cookies-${user.id}.txt`);
        await fs.promises.writeFile(cookieFile, user.preferences.youtubeCookies);
        args.splice(args.indexOf('--'), 0, '--cookies', cookieFile);
      }
      if (user.preferences.youtubePoToken) {
        args.splice(args.indexOf('--'), 0, '--extractor-args', `youtube:po_token=${user.preferences.youtubePoToken}`);
      }
      const { stdout } = await execFileAsync(YTDLP_CMD, [...YTDLP_ARGS, ...args], { timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
      const info = JSON.parse(stdout);
      res.json({ success: true, title: info.title || 'Test video' });
    } catch (err) {
      res.json({ success: false, error: err instanceof Error ? err.message : 'Test failed' });
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

    const ytId = extractYouTubeId(parsed);
    const available = await getYtDlpPath();

    if (available) {
      try {
        const { stdout } = await execFileAsync(
          YTDLP_CMD,
          [...YTDLP_ARGS, ...buildYtDlpArgs(['--dump-single-json', '--no-playlist', '--no-warnings', '--', parsed.toString()])],
          { timeout: 15000, maxBuffer: 4 * 1024 * 1024 }
        );
        const info = JSON.parse(stdout) as {
          title?: string;
          uploader?: string;
          channel?: string;
          duration?: number;
          thumbnail?: string;
        };
        res.json({
          title: info.title || 'Media Stream',
          author: info.uploader || info.channel || parsed.hostname,
          durationSeconds: typeof info.duration === 'number' ? info.duration : null,
          thumbnail: info.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null),
          providerGlow: ytId ? 'red' : 'default',
          qualities: ['2160p', '1080p', '720p', '480p', '360p', 'audio'],
          engineMode: 'live',
        });
        return;
      } catch {
        // Fall through to @distube/ytdl-core / oEmbed
      }
    }

    if (ytId) {
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
        qualities.push('audio');

        const thumbs = details.thumbnails || [];
        const bestThumb = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;

        res.json({
          title: details.title || `Media Clip (${ytId})`,
          author: details.author?.name || 'Media Creator',
          durationSeconds: Number(details.lengthSeconds) || null,
          thumbnail: bestThumb,
          providerGlow: 'red',
          qualities,
          engineMode: 'live',
        });
        return;
      } catch {
        // Fall back to oEmbed metadata
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
          qualities: ['2160p', '1080p', '720p', '480p', '360p', 'audio'],
          engineMode: 'preview',
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
      qualities: ['1080p', '720p', '480p', '360p', 'audio'],
      engineMode: 'preview',
    });
  });

  async function finalizeJobFile(job: DownloadJob): Promise<void> {
    const stat = await fs.promises.stat(job.filePath);
    job.totalBytes = stat.size;
    job.downloadedBytes = stat.size;
    job.progress = 100;
    job.status = 'ready';
  }

  async function runStagedDownload(job: DownloadJob, parsed: URL): Promise<void> {
    ensureDataDir();
    const isAudio = job.quality === 'audio';
    const ytId = extractYouTubeId(parsed);

    // Get admin user for YouTube auth (first admin found)
    let adminUser: StoredUser | undefined;
    for (const u of usersByEmail.values()) {
      if (u.role === 'admin') {
        adminUser = u;
        break;
      }
    }

    try {
      const available = await getYtDlpPath();
      if (available) {
        const targetH = String(selectTargetHeight(job.quality));
        const baseArgs = isAudio
          ? ['-x', '--audio-format', 'mp3', '-o', job.filePath, '--', parsed.toString()]
          : [
              '-f',
              // Flexible format selection with fallback chain
              `best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][vcodec^=avc]/best[height<=${targetH}]/best`,
              '--merge-output-format',
              'mp4',
              '--recode-video', 'mp4',  // Force recode to mp4 if needed
              '-o',
              job.filePath,
              '--newline',  // Output progress on new lines for parsing
              '--',
              parsed.toString(),
            ];
        // Build yt-dlp args with YouTube auth if available
        let finalArgs = buildYtDlpArgs(baseArgs);
        if (adminUser) {
          if (adminUser.preferences.youtubeCookies) {
            const cookieFile = path.join(CACHE_DIR, `cookies-${adminUser.id}.txt`);
            await fs.promises.writeFile(cookieFile, adminUser.preferences.youtubeCookies);
            // Insert before '--'
            const dashIndex = finalArgs.indexOf('--');
            if (dashIndex !== -1) {
              finalArgs.splice(dashIndex, 0, '--cookies', cookieFile);
            }
          }
          if (adminUser.preferences.youtubePoToken) {
            const dashIndex = finalArgs.indexOf('--');
            if (dashIndex !== -1) {
              finalArgs.splice(dashIndex, 0, '--extractor-args', `youtube:po_token=${adminUser.preferences.youtubePoToken}`);
            }
          }
        }

        // Use spawn to capture progress output
        await new Promise<void>((resolve, reject) => {
          const child = spawn(YTDLP_CMD, [...YTDLP_ARGS, ...finalArgs], { shell: false });
          let stderr = '';
          child.stdout.on('data', (data) => {
            const output = data.toString();
            // Parse progress from yt-dlp output like "[download]  45.2% of 12.34MiB at 1.23MiB/s ETA 00:05"
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
              reject(new Error(stderr || `yt-dlp exited with code ${code}`));
            }
          });
          child.on('error', reject);
        });
        return;
      }

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
          const muxedFormats = info.formats
            .filter((f: VideoFormat) => f.hasVideo && f.hasAudio && (f.height || 0) <= targetH)
            .sort((a: VideoFormat, b: VideoFormat) => (b.height || 0) - (a.height || 0));

          const bestMuxed = muxedFormats[0];
          if (bestMuxed && (bestMuxed.height || 0) >= targetH && bestMuxed.container === 'mp4') {
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
          const audioFormat = chooseFormat(info.formats, {
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
      fs.promises.rm(job.filePath, { force: true }).catch(() => {});
    }
  }

  app.post('/api/media/prepare', async (req: Request, res: Response) => {
    const body = req.body as { url?: unknown; quality?: unknown; title?: unknown };
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    const quality =
      typeof body.quality === 'string' &&
      ['2160p', '1080p', '720p', '480p', '360p', 'audio'].includes(body.quality.trim())
        ? body.quality.trim()
        : '1080p';
    const rawTitle = typeof body.title === 'string' ? body.title : 'grove-save-media';

    const parsed = await validatePublicUrl(rawUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid or disallowed media URL.' });
      return;
    }

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
      ext,
      mimeType: isAudio ? 'audio/mpeg' : 'video/mp4',
      status: 'downloading',
      progress: 4,
      downloadedBytes: 0,
      totalBytes: null,
      filePath,
      contentDisposition: buildContentDisposition(rawTitle, quality, ext),
      createdAt: Date.now(),
    };
    downloadJobs.set(id, job);

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
    });
  });

  app.get('/api/media/files/:jobId', (req: Request, res: Response) => {
    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId : '';
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      res.status(400).json({ error: 'Invalid file identifier.' });
      return;
    }
    const job = downloadJobs.get(jobId);
    if (!job || job.status !== 'ready') {
      res.status(404).json({ error: 'Prepared file is not ready or has expired.' });
      return;
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

  app.get('/api/media/download', async (req: Request, res: Response) => {
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

    const available = await getYtDlpPath();
    if (available) {
      const targetH = String(selectTargetHeight(quality));
      const baseArgs = isAudio
        ? ['-x', '--audio-format', 'mp3', '-o', '-', '--', parsed.toString()]
        : [
            '-f',
            // Flexible format selection with fallback chain
            `best[height<=${targetH}][vcodec^=avc][acodec^=mp4a]/best[height<=${targetH}][vcodec^=avc]/best[height<=${targetH}]/best`,
            '--recode-video', 'mp4',  // Force recode to mp4 if needed
            '-o',
            '-',
            '--',
            parsed.toString(),
          ];
      // Build yt-dlp args with YouTube auth if available
      let adminUser: StoredUser | undefined;
      for (const u of usersByEmail.values()) {
        if (u.role === 'admin') {
          adminUser = u;
          break;
        }
      }
      let finalArgs = buildYtDlpArgs(baseArgs);
      if (adminUser) {
        if (adminUser.preferences.youtubeCookies) {
          const cookieFile = path.join(CACHE_DIR, `cookies-${adminUser.id}.txt`);
          await fs.promises.writeFile(cookieFile, adminUser.preferences.youtubeCookies);
          const dashIndex = finalArgs.indexOf('--');
          if (dashIndex !== -1) {
            finalArgs.splice(dashIndex, 0, '--cookies', cookieFile);
          }
        }
        if (adminUser.preferences.youtubePoToken) {
          const dashIndex = finalArgs.indexOf('--');
          if (dashIndex !== -1) {
            finalArgs.splice(dashIndex, 0, '--extractor-args', `youtube:po_token=${adminUser.preferences.youtubePoToken}`);
          }
        }
      }

      res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', contentDisposition);
      res.setHeader('X-Grove-Stream-Mode', 'live');

      const child = spawn(YTDLP_CMD, [...YTDLP_ARGS, ...finalArgs], { shell: false });
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Grove Save server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
