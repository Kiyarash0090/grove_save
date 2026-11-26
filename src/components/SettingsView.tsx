import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Database,
  Download,
  Globe,
  HardDrive,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Megaphone,
  Moon,
  Pencil,
  Play,
  Plus,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import type { AppLanguage, AppTheme, TranslationDict } from '../i18n';
import type { AuthUser } from './AuthModal';
import type { AnnouncementItem } from './InfoView';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  t: TranslationDict;
  theme: AppTheme;
  onThemeChange: (next: AppTheme) => void;
  language: AppLanguage;
  onLanguageChange: (next: AppLanguage) => void;
  defaultQuality: string;
  onDefaultQualityChange: (next: string) => void;
  historyCount: number;
  onClearHistory: () => void;
  user: AuthUser | null;
  authToken: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onUpdateDisplayName: (nextName: string) => Promise<{ ok: boolean; error?: string }>;
  apiBase: string;
  announcements: AnnouncementItem[];
  onAnnouncementsChange: (items: AnnouncementItem[]) => void;
}

const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

const DEFAULT_QUALITIES = ['2160p', '1080p', '720p', '480p', '360p'] as const;

export const SettingsView: React.FC<SettingsViewProps> = ({
  t,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  defaultQuality,
  onDefaultQualityChange,
  historyCount,
  onClearHistory,
  user,
  authToken,
  onOpenAuth,
  onSignOut,
  onUpdateDisplayName,
  apiBase,
  announcements,
  onAnnouncementsChange,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [clearedFeedback, setClearedFeedback] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [adminPage, setAdminPage] = useState<'main' | 'xray' | 'pot' | 'telegram' | 'announcements'>('main');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin-only YouTube Cookies state (PO Token is handled automatically by bgutil-ytdlp-pot-provider)
  const [youtubeCookies, setYoutubeCookies] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeMessage, setYoutubeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin-only Xray VPN state
  interface XrayProfileItem {
    id: string;
    name: string;
    protocol: string;
    address: string;
    configInput: string;
    lastTest?: {
      ok: boolean;
      testedAt: number;
      latencyMs?: number;
      downloadedBytes?: number;
      title?: string;
      exitIp?: string | null;
      error?: string;
    };
  }
  const [xrayEnabled, setXrayEnabled] = useState(false);
  const [xrayConfigInput, setXrayConfigInput] = useState('');
  const [xrayProfiles, setXrayProfiles] = useState<XrayProfileItem[]>([]);
  const [xrayActiveProfileId, setXrayActiveProfileId] = useState<string | null>(null);
  const [xrayTestYoutubeUrl, setXrayTestYoutubeUrl] = useState('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  const [xrayTestConcurrency, setXrayTestConcurrency] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('grovesave_xray_concurrency'));
      if (Number.isFinite(saved) && saved >= 1 && saved <= 20) return Math.floor(saved);
    } catch {}
    return 3;
  });
  const [xrayTestingProfileIds, setXrayTestingProfileIds] = useState<string[]>([]);
  const [xraySingleTesting, setXraySingleTesting] = useState(false);
  const [xrayTestingAll, setXrayTestingAll] = useState(false);
  const [xrayTestProgress, setXrayTestProgress] = useState<{ done: number; total: number } | null>(null);
  const xrayTestAbortControllersRef = useRef<Set<AbortController>>(new Set());
  const xrayTestCancelledRef = useRef(false);
  const xrayTestBatchIdRef = useRef<string | null>(null);
  const [xrayRunning, setXrayRunning] = useState(false);
  const [xrayBinaryInstalled, setXrayBinaryInstalled] = useState(true);
  const [xrayPorts, setXrayPorts] = useState<{ socks: number; http: number }>({ socks: 10808, http: 10809 });
  const [xrayLoading, setXrayLoading] = useState(false);
  const [xrayMessage, setXrayMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin-only bgutil-ytdlp-pot-provider state
  const [potEnabled, setPotEnabled] = useState(true);
  const [potMode, setPotMode] = useState<'managed' | 'external'>('managed');
  const [potBaseUrl, setPotBaseUrl] = useState('http://127.0.0.1:4416');
  const [potPort, setPotPort] = useState(4416);
  const [potInstalled, setPotInstalled] = useState(true);
  const [potPluginInstalled, setPotPluginInstalled] = useState(true);
  const [potRunning, setPotRunning] = useState(false);
  const [potVersion, setPotVersion] = useState<string | null>(null);
  const [potJsRuntime, setPotJsRuntime] = useState<'auto' | 'deno' | 'node'>('auto');
  const [potEjsRemoteComponents, setPotEjsRemoteComponents] = useState(true);
  const [denoInstalled, setDenoInstalled] = useState(false);
  const [denoVersion, setDenoVersion] = useState<string | null>(null);
  const [nodeVersion, setNodeVersion] = useState<string | null>(null);
  const [installingDeno, setInstallingDeno] = useState(false);
  const [potLoading, setPotLoading] = useState(false);
  const [potMessage, setPotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin-only Telegram storage state
  interface TelegramStatus {
    enabled: boolean;
    uploadEnabled: boolean;
    mode: 'user' | 'bot';
    channel: string;
    apiId: number | null;
    hasApiHash: boolean;
    apiHashMasked: string;
    hasBotToken: boolean;
    hasSession: boolean;
    signedIn: boolean;
    account: string | null;
    lastError: string | null;
    pendingLogin: boolean;
    uploadsActive?: boolean;
    needsChannel?: boolean;
  }
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgUploadEnabled, setTgUploadEnabled] = useState(false);
  const [tgMode, setTgMode] = useState<'user' | 'bot'>('user');
  const [tgApiId, setTgApiId] = useState('');
  const [tgApiHash, setTgApiHash] = useState('');
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChannel, setTgChannel] = useState('');
  const [tgPhone, setTgPhone] = useState('');
  const [tgCode, setTgCode] = useState('');
  const [tgPassword, setTgPassword] = useState('');
  const [tgNeedsPassword, setTgNeedsPassword] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgMessage, setTgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tgFiles, setTgFiles] = useState<
    Array<{ id: string; title: string; file_name: string | null; size_bytes: number; created_at: number; user_email: string | null }>
  >([]);
  const [tgFileCount, setTgFileCount] = useState(0);
  const [tgTotalBytes, setTgTotalBytes] = useState(0);
  const [cachePurgeBusy, setCachePurgeBusy] = useState(false);
  const [cachePurgeMessage, setCachePurgeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Admin-only database backup stats
  const [dbStats, setDbStats] = useState<{
    sizeBytes: number;
    users: number;
    history: number;
    telegramFiles: number;
  } | null>(null);
  const [dbBackups, setDbBackups] = useState<
    Array<{ fileName: string; sizeBytes: number; createdAt: number }>
  >([]);
  const [dbBackupBusy, setDbBackupBusy] = useState(false);
  const [dbBackupMessage, setDbBackupMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = (withJson = false): Record<string, string> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'GroveSave',
    };
    if (withJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
  };

  const fetchYouTubeAuth = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { youtubeCookies?: string };
        setYoutubeCookies(data.youtubeCookies || '');
      }
    } catch {}
  };

  const fetchXrayStatus = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/xray`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          enabled?: boolean;
          configInput?: string;
          activeProfileId?: string | null;
          profiles?: typeof xrayProfiles;
          testYoutubeUrl?: string;
          testConcurrency?: number;
          running?: boolean;
          binaryInstalled?: boolean;
          socksPort?: number;
          httpPort?: number;
          lastError?: string | null;
        };
        setXrayEnabled(Boolean(data.enabled));
        setXrayConfigInput(data.configInput || '');
        setXrayActiveProfileId(data.activeProfileId || null);
        if (Array.isArray(data.profiles)) setXrayProfiles(data.profiles);
        if (data.testYoutubeUrl) setXrayTestYoutubeUrl(data.testYoutubeUrl);
        if (typeof data.testConcurrency === 'number' && Number.isFinite(data.testConcurrency)) {
          const clamped = Math.max(1, Math.min(20, Math.floor(data.testConcurrency)));
          setXrayTestConcurrency(clamped);
          try {
            localStorage.setItem('grovesave_xray_concurrency', String(clamped));
          } catch {}
        }
        setXrayRunning(Boolean(data.running));
        setXrayBinaryInstalled(Boolean(data.binaryInstalled));
        if (data.socksPort && data.httpPort) {
          setXrayPorts({ socks: data.socksPort, http: data.httpPort });
        }
        if (data.lastError && data.enabled && !data.running) {
          setXrayMessage({ type: 'error', text: data.lastError });
        }
      }
    } catch {}
  };

  const saveYouTubeAuth = async () => {
    if (!isAdmin) return;
    setYoutubeLoading(true);
    setYoutubeMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ youtubeCookies }),
      });
      if (res.ok) {
        setYoutubeMessage({ type: 'success', text: t.youtubeSaved });
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setYoutubeMessage({ type: 'error', text: err.error || 'Failed to save' });
      }
    } catch {
      setYoutubeMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setYoutubeLoading(false);
    }
  };

  const testYouTubeAuth = async () => {
    if (!isAdmin) return;
    setYoutubeLoading(true);
    setYoutubeMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth/test`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ youtubeCookies }),
      });
      const data = (await res.json()) as { success?: boolean; title?: string; error?: string };
      if (data.success) {
        setYoutubeMessage({
          type: 'success',
          text: data.title ? `${t.youtubeTestSuccess} (${data.title})` : t.youtubeTestSuccess,
        });
      } else {
        setYoutubeMessage({ type: 'error', text: `${t.youtubeTestFailed}: ${data.error || ''}` });
      }
    } catch {
      setYoutubeMessage({ type: 'error', text: t.youtubeTestFailed });
    } finally {
      setYoutubeLoading(false);
    }
  };

  const saveXrayConfig = async (overrideEnabled?: boolean) => {
    if (!isAdmin) return;
    const nextEnabled = overrideEnabled !== undefined ? overrideEnabled : xrayEnabled;
    setXrayLoading(true);
    setXrayMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          enabled: nextEnabled,
          configInput: xrayConfigInput,
          testYoutubeUrl: xrayTestYoutubeUrl,
          testConcurrency: Math.max(1, Math.min(20, Math.floor(xrayTestConcurrency) || 3)),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        enabled?: boolean;
        configInput?: string;
        activeProfileId?: string | null;
        profiles?: typeof xrayProfiles;
        testYoutubeUrl?: string;
        testConcurrency?: number;
        running?: boolean;
        binaryInstalled?: boolean;
        lastError?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setXrayMessage({ type: 'error', text: data.error || t.xrayTestFailed });
      } else {
        setXrayEnabled(Boolean(data.enabled));
        if (typeof data.configInput === 'string') setXrayConfigInput(data.configInput);
        setXrayActiveProfileId(data.activeProfileId || null);
        if (Array.isArray(data.profiles)) setXrayProfiles(data.profiles);
        if (data.testYoutubeUrl) setXrayTestYoutubeUrl(data.testYoutubeUrl);
        if (typeof data.testConcurrency === 'number' && Number.isFinite(data.testConcurrency)) {
          const clamped = Math.max(1, Math.min(20, Math.floor(data.testConcurrency)));
          setXrayTestConcurrency(clamped);
          try {
            localStorage.setItem('grovesave_xray_concurrency', String(clamped));
          } catch {}
        }
        setXrayRunning(Boolean(data.running));
        setXrayBinaryInstalled(Boolean(data.binaryInstalled));
        if (data.lastError && data.enabled && !data.running) {
          setXrayMessage({ type: 'error', text: data.lastError });
        } else {
          setXrayMessage({ type: 'success', text: t.xraySavedMsg });
        }
      }
    } catch {
      setXrayMessage({ type: 'error', text: t.xrayTestFailed });
    } finally {
      setXrayLoading(false);
    }
  };

  const importXrayProfiles = async () => {
    if (!isAdmin || !xrayConfigInput.trim()) return;
    setXrayLoading(true);
    setXrayMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray/profiles/import`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ rawConfigs: xrayConfigInput }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        addedCount?: number;
        errors?: string[];
        activeProfileId?: string | null;
        profiles?: typeof xrayProfiles;
        configInput?: string;
        error?: string;
      };
      if (!res.ok) {
        setXrayMessage({ type: 'error', text: data.error || 'Import failed' });
      } else {
        if (Array.isArray(data.profiles)) setXrayProfiles(data.profiles);
        setXrayActiveProfileId(data.activeProfileId || null);
        if (typeof data.configInput === 'string') setXrayConfigInput(data.configInput);
        const note = data.errors?.length ? ` (${data.errors.length} skipped)` : '';
        setXrayMessage({
          type: 'success',
          text: `${t.xrayImportMsg}: +${data.addedCount || 0}${note}`,
        });
      }
    } catch {
      setXrayMessage({ type: 'error', text: 'Import failed' });
    } finally {
      setXrayLoading(false);
    }
  };

  const activateXrayProfile = async (profileId: string) => {
    if (!isAdmin) return;
    setXrayLoading(true);
    setXrayMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray/profiles/${encodeURIComponent(profileId)}/activate`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        enabled?: boolean;
        configInput?: string;
        activeProfileId?: string | null;
        profiles?: typeof xrayProfiles;
        running?: boolean;
        binaryInstalled?: boolean;
        lastError?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setXrayMessage({ type: 'error', text: data.error || 'Activation failed' });
      } else {
        setXrayEnabled(Boolean(data.enabled));
        if (typeof data.configInput === 'string') setXrayConfigInput(data.configInput);
        setXrayActiveProfileId(data.activeProfileId || null);
        if (Array.isArray(data.profiles)) setXrayProfiles(data.profiles);
        setXrayRunning(Boolean(data.running));
        setXrayBinaryInstalled(Boolean(data.binaryInstalled));
        if (data.lastError && data.enabled && !data.running) {
          setXrayMessage({ type: 'error', text: data.lastError });
        } else {
          setXrayMessage({ type: 'success', text: t.xraySavedMsg });
        }
      }
    } catch {
      setXrayMessage({ type: 'error', text: 'Activation failed' });
    } finally {
      setXrayLoading(false);
    }
  };

  const deleteXrayProfile = async (profileId: string) => {
    if (!isAdmin) return;
    setXrayLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        enabled?: boolean;
        activeProfileId?: string | null;
        configInput?: string;
        profiles?: typeof xrayProfiles;
        running?: boolean;
      };
      if (res.ok) {
        setXrayEnabled(Boolean(data.enabled));
        setXrayActiveProfileId(data.activeProfileId || null);
        if (typeof data.configInput === 'string') setXrayConfigInput(data.configInput);
        if (Array.isArray(data.profiles)) setXrayProfiles(data.profiles);
        setXrayRunning(Boolean(data.running));
      }
    } catch {} finally {
      setXrayLoading(false);
    }
  };

  const installXrayCore = async () => {
    if (!isAdmin) return;
    setXrayLoading(true);
    setXrayMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray/install`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as { success?: boolean; running?: boolean; error?: string };
      if (res.ok && data.success) {
        setXrayBinaryInstalled(true);
        setXrayRunning(Boolean(data.running));
        setXrayMessage({ type: 'success', text: t.xrayInstalledMsg });
      } else {
        setXrayMessage({ type: 'error', text: data.error || 'Install failed' });
      }
    } catch {
      setXrayMessage({ type: 'error', text: 'Install failed' });
    } finally {
      setXrayLoading(false);
    }
  };

  const updateXrayConcurrency = (rawVal: number) => {
    const next = Number.isFinite(rawVal) ? Math.max(1, Math.min(20, Math.floor(rawVal))) : 1;
    setXrayTestConcurrency(next);
    try {
      localStorage.setItem('grovesave_xray_concurrency', String(next));
    } catch {}
  };

  const cancelXrayTests = async () => {
    xrayTestCancelledRef.current = true;
    const batchId = xrayTestBatchIdRef.current;
    for (const ctrl of xrayTestAbortControllersRef.current) {
      try {
        ctrl.abort();
      } catch {}
    }
    xrayTestAbortControllersRef.current.clear();
    setXrayTestingProfileIds([]);
    setXraySingleTesting(false);
    setXrayTestingAll(false);
    setXrayTestProgress(null);
    setXrayMessage({ type: 'error', text: t.xrayTestCancelledMsg });
    try {
      await fetch(`${apiBase}/api/admin/xray/test/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ batchId }),
      });
    } catch {}
  };

  const testXrayVpn = async (profileId?: string) => {
    if (!isAdmin) return;
    xrayTestCancelledRef.current = false;
    const batchId = `single-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    xrayTestBatchIdRef.current = batchId;
    const controller = new AbortController();
    xrayTestAbortControllersRef.current.add(controller);

    if (profileId) {
      setXrayTestingProfileIds((prev) => (prev.includes(profileId) ? prev : [...prev, profileId]));
    } else {
      setXraySingleTesting(true);
    }
    setXrayMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/xray/test`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        signal: controller.signal,
        body: JSON.stringify({
          ...(profileId ? { profileId } : { configInput: xrayConfigInput }),
          youtubeUrl: xrayTestYoutubeUrl,
          batchId,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        cancelled?: boolean;
        downloadedBytes?: number;
        title?: string;
        exitIp?: string | null;
        latencyMs?: number;
        error?: string;
        profileId?: string | null;
        lastTest?: XrayProfileItem['lastTest'] | null;
      };
      if (data.cancelled || xrayTestCancelledRef.current) {
        setXrayMessage({ type: 'error', text: t.xrayTestCancelledMsg });
        return;
      }
      if (data.profileId && data.lastTest) {
        setXrayProfiles((prev) =>
          prev.map((p) => (p.id === data.profileId ? { ...p, lastTest: data.lastTest || undefined } : p))
        );
      }
      if (data.success) {
        const parts = [t.xrayTestSuccess];
        if (typeof data.downloadedBytes === 'number') {
          parts.push(`${Math.max(1, Math.round(data.downloadedBytes / 1024))} KB`);
        }
        if (typeof data.latencyMs === 'number') parts.push(`${(data.latencyMs / 1000).toFixed(1)}s`);
        if (data.exitIp) parts.push(`IP: ${data.exitIp}`);
        if (data.title) parts.push(data.title);
        setXrayMessage({ type: 'success', text: parts.join(' · ') });
      } else {
        setXrayMessage({ type: 'error', text: `${t.xrayTestFailed}: ${data.error || ''}` });
      }
    } catch (err) {
      if ((err instanceof DOMException && err.name === 'AbortError') || xrayTestCancelledRef.current) {
        setXrayMessage({ type: 'error', text: t.xrayTestCancelledMsg });
      } else {
        setXrayMessage({ type: 'error', text: t.xrayTestFailed });
      }
    } finally {
      xrayTestAbortControllersRef.current.delete(controller);
      if (profileId) {
        setXrayTestingProfileIds((prev) => prev.filter((id) => id !== profileId));
      } else {
        setXraySingleTesting(false);
      }
    }
  };

  const testAllXrayProfiles = async () => {
    if (!isAdmin || xrayProfiles.length === 0) return;
    xrayTestCancelledRef.current = false;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    xrayTestBatchIdRef.current = batchId;

    const queue = [...xrayProfiles];
    const total = queue.length;
    const concurrency = Math.max(1, Math.min(total, Math.min(20, Math.floor(xrayTestConcurrency) || 3)));

    setXrayTestingAll(true);
    setXrayTestProgress({ done: 0, total });
    setXrayMessage(null);

    let nextIdx = 0;
    let doneCount = 0;
    let passCount = 0;

    const runWorker = async () => {
      while (!xrayTestCancelledRef.current) {
        const idx = nextIdx;
        nextIdx += 1;
        if (idx >= queue.length) break;
        const profile = queue[idx];

        const controller = new AbortController();
        xrayTestAbortControllersRef.current.add(controller);
        setXrayTestingProfileIds((prev) => (prev.includes(profile.id) ? prev : [...prev, profile.id]));

        try {
          const res = await fetch(`${apiBase}/api/admin/xray/test`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(true),
            signal: controller.signal,
            body: JSON.stringify({
              profileId: profile.id,
              youtubeUrl: xrayTestYoutubeUrl,
              batchId,
            }),
          });
          const data = (await res.json()) as {
            success?: boolean;
            cancelled?: boolean;
            profileId?: string | null;
            lastTest?: XrayProfileItem['lastTest'] | null;
          };
          if (!data.cancelled && !xrayTestCancelledRef.current) {
            if (data.success) passCount += 1;
            if (data.profileId && data.lastTest) {
              setXrayProfiles((prev) =>
                prev.map((p) => (p.id === data.profileId ? { ...p, lastTest: data.lastTest || undefined } : p))
              );
            }
          }
        } catch {
          // Aborted or failed request
        } finally {
          xrayTestAbortControllersRef.current.delete(controller);
          setXrayTestingProfileIds((prev) => prev.filter((id) => id !== profile.id));
          if (!xrayTestCancelledRef.current) {
            doneCount += 1;
            setXrayTestProgress({ done: doneCount, total });
          }
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
      if (xrayTestCancelledRef.current) {
        setXrayMessage({
          type: 'error',
          text: `${t.xrayTestCancelledMsg} (${doneCount}/${total})`,
        });
      } else {
        setXrayMessage({
          type: passCount > 0 ? 'success' : 'error',
          text: `${passCount}/${total} ${t.xrayTestedPass}`,
        });
      }
    } finally {
      setXrayTestingProfileIds([]);
      setXrayTestingAll(false);
      setXrayTestProgress(null);
    }
  };

  const fetchPotProviderStatus = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/pot-provider`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          enabled?: boolean;
          mode?: 'managed' | 'external';
          baseUrl?: string;
          port?: number;
          jsRuntime?: 'auto' | 'deno' | 'node';
          ejsRemoteComponents?: boolean;
          denoInstalled?: boolean;
          denoVersion?: string | null;
          nodeVersion?: string | null;
          installed?: boolean;
          pluginInstalled?: boolean;
          running?: boolean;
          pingVersion?: string | null;
          lastError?: string | null;
        };
        setPotEnabled(Boolean(data.enabled));
        setPotMode(data.mode === 'external' ? 'external' : 'managed');
        if (data.baseUrl) setPotBaseUrl(data.baseUrl);
        if (typeof data.port === 'number') setPotPort(data.port);
        if (data.jsRuntime === 'auto' || data.jsRuntime === 'deno' || data.jsRuntime === 'node') {
          setPotJsRuntime(data.jsRuntime);
        }
        if (typeof data.ejsRemoteComponents === 'boolean') {
          setPotEjsRemoteComponents(data.ejsRemoteComponents);
        }
        setDenoInstalled(Boolean(data.denoInstalled));
        setDenoVersion(data.denoVersion || null);
        setNodeVersion(data.nodeVersion || null);
        setPotInstalled(Boolean(data.installed));
        setPotPluginInstalled(Boolean(data.pluginInstalled));
        setPotRunning(Boolean(data.running));
        setPotVersion(data.pingVersion || null);
        if (data.lastError && data.enabled && data.mode !== 'external' && !data.running) {
          setPotMessage({ type: 'error', text: data.lastError });
        }
      }
    } catch {}
  };

  const savePotProviderConfig = async (
    overrideEnabled?: boolean,
    overrideJsRuntime?: 'auto' | 'deno' | 'node',
    overrideEjsRemoteComponents?: boolean
  ) => {
    if (!isAdmin) return;
    const nextEnabled = overrideEnabled !== undefined ? overrideEnabled : potEnabled;
    const nextJsRuntime = overrideJsRuntime !== undefined ? overrideJsRuntime : potJsRuntime;
    const nextEjsRemoteComponents =
      overrideEjsRemoteComponents !== undefined ? overrideEjsRemoteComponents : potEjsRemoteComponents;
    setPotLoading(true);
    setPotMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/pot-provider`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          enabled: nextEnabled,
          mode: potMode,
          baseUrl: potBaseUrl,
          port: Number(potPort) || 4416,
          jsRuntime: nextJsRuntime,
          ejsRemoteComponents: nextEjsRemoteComponents,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        enabled?: boolean;
        mode?: 'managed' | 'external';
        baseUrl?: string;
        port?: number;
        jsRuntime?: 'auto' | 'deno' | 'node';
        ejsRemoteComponents?: boolean;
        denoInstalled?: boolean;
        denoVersion?: string | null;
        nodeVersion?: string | null;
        installed?: boolean;
        pluginInstalled?: boolean;
        running?: boolean;
        pingVersion?: string | null;
        lastError?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setPotMessage({ type: 'error', text: data.error || t.potTestFailed });
      } else {
        setPotEnabled(Boolean(data.enabled));
        setPotMode(data.mode === 'external' ? 'external' : 'managed');
        if (data.baseUrl) setPotBaseUrl(data.baseUrl);
        if (typeof data.port === 'number') setPotPort(data.port);
        if (data.jsRuntime === 'auto' || data.jsRuntime === 'deno' || data.jsRuntime === 'node') {
          setPotJsRuntime(data.jsRuntime);
        }
        if (typeof data.ejsRemoteComponents === 'boolean') {
          setPotEjsRemoteComponents(data.ejsRemoteComponents);
        }
        setDenoInstalled(Boolean(data.denoInstalled));
        setDenoVersion(data.denoVersion || null);
        setNodeVersion(data.nodeVersion || null);
        setPotInstalled(Boolean(data.installed));
        setPotPluginInstalled(Boolean(data.pluginInstalled));
        setPotRunning(Boolean(data.running));
        setPotVersion(data.pingVersion || null);
        if (data.lastError && data.enabled && data.mode !== 'external' && !data.running) {
          setPotMessage({ type: 'error', text: data.lastError });
        } else {
          setPotMessage({ type: 'success', text: t.potSavedMsg });
        }
      }
    } catch {
      setPotMessage({ type: 'error', text: t.potTestFailed });
    } finally {
      setPotLoading(false);
    }
  };

  const installDenoRuntime = async () => {
    if (!isAdmin) return;
    setInstallingDeno(true);
    setPotMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/pot-provider/install-deno`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        denoInstalled?: boolean;
        denoVersion?: string | null;
        error?: string;
      };
      if (res.ok && data.success) {
        setDenoInstalled(Boolean(data.denoInstalled));
        setDenoVersion(data.denoVersion || null);
        setPotMessage({
          type: 'success',
          text: data.denoVersion ? `${t.potDenoInstalledMsg} (v${data.denoVersion})` : t.potDenoInstalledMsg,
        });
      } else {
        setPotMessage({ type: 'error', text: data.error || 'Deno install failed' });
      }
    } catch {
      setPotMessage({ type: 'error', text: 'Deno install failed' });
    } finally {
      setInstallingDeno(false);
    }
  };

  const installPotProvider = async () => {
    if (!isAdmin) return;
    setPotLoading(true);
    setPotMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/pot-provider/install`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        installed?: boolean;
        pluginInstalled?: boolean;
        running?: boolean;
        error?: string;
      };
      if (res.ok && data.success) {
        setPotInstalled(Boolean(data.installed));
        setPotPluginInstalled(Boolean(data.pluginInstalled));
        setPotRunning(Boolean(data.running));
        setPotMessage({ type: 'success', text: t.potInstalledMsg });
      } else {
        setPotMessage({ type: 'error', text: data.error || 'Install failed' });
      }
    } catch {
      setPotMessage({ type: 'error', text: 'Install failed' });
    } finally {
      setPotLoading(false);
    }
  };

  const testPotProvider = async () => {
    if (!isAdmin) return;
    setPotLoading(true);
    setPotMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/pot-provider/test`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        version?: string | null;
        latencyMs?: number;
        tokenPreview?: string;
        error?: string;
      };
      if (data.success) {
        if (data.version) setPotVersion(data.version);
        const parts = [t.potTestSuccess];
        if (data.version) parts.push(`v${data.version}`);
        if (typeof data.latencyMs === 'number') parts.push(`${data.latencyMs}ms`);
        if (data.tokenPreview) parts.push(data.tokenPreview);
        setPotMessage({ type: 'success', text: parts.join(' · ') });
      } else {
        setPotMessage({ type: 'error', text: `${t.potTestFailed}: ${data.error || ''}` });
      }
    } catch {
      setPotMessage({ type: 'error', text: t.potTestFailed });
    } finally {
      setPotLoading(false);
    }
  };

  const applyTelegramStatus = (data: Partial<TelegramStatus>) => {
    setTgStatus(data as TelegramStatus);
    if (typeof data.enabled === 'boolean') setTgEnabled(data.enabled);
    if (typeof data.uploadEnabled === 'boolean') setTgUploadEnabled(data.uploadEnabled);
    if (data.mode === 'user' || data.mode === 'bot') setTgMode(data.mode);
    if (typeof data.channel === 'string') setTgChannel(data.channel);
    if (typeof data.apiId === 'number') setTgApiId(String(data.apiId));
  };

  const fetchTelegramStatus = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/telegram`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        applyTelegramStatus((await res.json()) as TelegramStatus);
      }
    } catch {}
  };

  const fetchTelegramFiles = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/telegram/files?limit=20`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          items?: typeof tgFiles;
          count?: number;
          totalBytes?: number;
        };
        setTgFiles(Array.isArray(data.items) ? data.items : []);
        setTgFileCount(typeof data.count === 'number' ? data.count : 0);
        setTgTotalBytes(typeof data.totalBytes === 'number' ? data.totalBytes : 0);
      }
    } catch {}
  };

  const fetchDbStats = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/db/stats`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          sizeBytes?: number;
          users?: number;
          history?: number;
          telegramFiles?: number;
        };
        setDbStats({
          sizeBytes: data.sizeBytes || 0,
          users: data.users || 0,
          history: data.history || 0,
          telegramFiles: data.telegramFiles || 0,
        });
      }
    } catch {}
  };

  const fetchDbBackups = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/db/backups`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{ fileName: string; sizeBytes: number; createdAt: number }>;
        };
        setDbBackups(Array.isArray(data.items) ? data.items : []);
      }
    } catch {}
  };

  const createDbBackupOnServer = async () => {
    if (!isAdmin || dbBackupBusy) return;
    setDbBackupBusy(true);
    setDbBackupMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/db/backup`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setDbBackupMessage(t.dbBackupCreatedMsg);
        void fetchDbBackups();
        void fetchDbStats();
      } else {
        setDbBackupMessage(data.error || 'Backup failed');
      }
    } catch {
      setDbBackupMessage('Backup failed');
    } finally {
      setDbBackupBusy(false);
    }
  };

  const restoreDbBackup = async (file: File) => {
    if (!isAdmin || dbBackupBusy) return;
    if (!confirm('بازیابی دیتابیس تمام اطلاعات فعلی را جایگزین می‌کند. آیا مطمئن هستید؟')) return;
    setDbBackupBusy(true);
    setDbBackupMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1] || '';
          const res = await fetch(`${apiBase}/api/admin/db/restore`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ fileBase64: base64 }),
          });
          const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
          if (res.ok && data.success) {
            setDbBackupMessage(t.dbBackupRestoredMsg);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setDbBackupMessage(data.error || 'Restore failed');
          }
        } catch {
          setDbBackupMessage('Restore failed');
        } finally {
          setDbBackupBusy(false);
        }
      };
      reader.onerror = () => {
        setDbBackupMessage('Could not read backup file');
        setDbBackupBusy(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setDbBackupMessage('Restore failed');
      setDbBackupBusy(false);
    }
  };

  const saveTelegramSettings = async (overrides: Record<string, unknown> = {}) => {
    if (!isAdmin) return;
    setTgLoading(true);
    setTgMessage(null);
    try {
      const body: Record<string, unknown> = {
        enabled: tgEnabled,
        uploadEnabled: tgUploadEnabled,
        mode: tgMode,
        channel: tgChannel,
        apiId: tgApiId ? Number(tgApiId) : null,
        ...overrides,
      };
      // Only send secrets when the admin actually typed something new.
      if (tgApiHash.trim()) body.apiHash = tgApiHash.trim();
      if (tgBotToken.trim()) body.botToken = tgBotToken.trim();

      const res = await fetch(`${apiBase}/api/admin/telegram`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Partial<TelegramStatus> & { error?: string };
      if (res.ok) {
        applyTelegramStatus(data);
        setTgApiHash('');
        setTgBotToken('');
        setTgMessage({ type: 'success', text: t.telegramSavedMsg });
        void fetchDbStats();
      } else {
        setTgMessage({ type: 'error', text: data.error || t.telegramTestFailed });
      }
    } catch {
      setTgMessage({ type: 'error', text: t.telegramTestFailed });
    } finally {
      setTgLoading(false);
    }
  };

  const testTelegramChannel = async () => {
    if (!isAdmin) return;
    setTgLoading(true);
    setTgMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/telegram/test`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as { success?: boolean; channel?: string; account?: string; error?: string };
      if (data.success) {
        const parts = [t.telegramTestSuccess];
        if (data.channel) parts.push(data.channel);
        if (data.account) parts.push(data.account);
        setTgMessage({ type: 'success', text: parts.join(' · ') });
      } else {
        setTgMessage({ type: 'error', text: `${t.telegramTestFailed}: ${data.error || ''}` });
      }
    } catch {
      setTgMessage({ type: 'error', text: t.telegramTestFailed });
    } finally {
      setTgLoading(false);
    }
  };

  const sendTelegramCode = async () => {
    if (!isAdmin) return;
    if (!tgPhone.trim()) {
      setTgMessage({ type: 'error', text: t.telegramPhoneLabel });
      return;
    }
    setTgLoading(true);
    setTgMessage(null);
    try {
      // Persist the API credentials first so the sign-in step can reuse them.
      const body: Record<string, unknown> = { apiId: tgApiId ? Number(tgApiId) : null };
      if (tgApiHash.trim()) body.apiHash = tgApiHash.trim();
      await fetch(`${apiBase}/api/admin/telegram`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      const res = await fetch(`${apiBase}/api/admin/telegram/send-code`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          phoneNumber: tgPhone.trim(),
          apiId: tgApiId ? Number(tgApiId) : undefined,
          apiHash: tgApiHash.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setTgMessage({ type: 'success', text: t.telegramCodeSent });
      } else {
        setTgMessage({ type: 'error', text: data.error || t.telegramTestFailed });
      }
    } catch {
      setTgMessage({ type: 'error', text: t.telegramTestFailed });
    } finally {
      setTgLoading(false);
    }
  };

  const signInTelegram = async () => {
    if (!isAdmin) return;
    if (!tgCode.trim()) {
      setTgMessage({ type: 'error', text: t.telegramCodeLabel });
      return;
    }
    setTgLoading(true);
    setTgMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/telegram/sign-in`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ code: tgCode.trim(), password: tgPassword }),
      });
      const data = (await res.json()) as Partial<TelegramStatus> & {
        success?: boolean;
        needsPassword?: boolean;
        error?: string;
      };
      if (data.needsPassword) {
        setTgNeedsPassword(true);
        setTgMessage({ type: 'error', text: t.telegramNeedPassword });
      } else if (data.success) {
        applyTelegramStatus(data);
        setTgNeedsPassword(false);
        setTgCode('');
        setTgPassword('');
        setTgApiHash('');
        setTgMessage({ type: 'success', text: t.telegramSignedInMsg });
      } else {
        setTgMessage({ type: 'error', text: data.error || t.telegramTestFailed });
      }
    } catch {
      setTgMessage({ type: 'error', text: t.telegramTestFailed });
    } finally {
      setTgLoading(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!isAdmin) return;
    setTgLoading(true);
    setTgMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/telegram/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as Partial<TelegramStatus>;
      applyTelegramStatus(data);
      setTgNeedsPassword(false);
      setTgMessage({ type: 'success', text: t.telegramSavedMsg });
    } catch {
      setTgMessage({ type: 'error', text: t.telegramTestFailed });
    } finally {
      setTgLoading(false);
    }
  };

  const purgeServerCache = async () => {
    if (!isAdmin) return;
    if (!window.confirm(t.cachePurgeConfirm)) return;
    setCachePurgeBusy(true);
    setCachePurgeMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/storage/purge`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json()) as {
        success?: boolean;
        removedEntries?: number;
        freedBytes?: number;
        failures?: string[];
        error?: string;
      };
      if (res.ok && data.success) {
        const count = data.removedEntries || 0;
        setCachePurgeMessage({
          type: 'success',
          text: `${t.cachePurgeDone} (${count} · ${formatBytes(data.freedBytes || 0)})`,
        });
        void fetchTelegramFiles();
      } else {
        setCachePurgeMessage({
          type: 'error',
          text: data.error || t.cachePurgeFailed,
        });
      }
    } catch {
      setCachePurgeMessage({ type: 'error', text: t.cachePurgeFailed });
    } finally {
      setCachePurgeBusy(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  // Load admin-only configurations strictly when authenticated user is admin
  useEffect(() => {
    if (isAdmin) {
      void fetchYouTubeAuth();
      void fetchXrayStatus();
      void fetchPotProviderStatus();
      void fetchTelegramStatus();
      void fetchTelegramFiles();
      void fetchDbStats();
      void fetchDbBackups();
    } else {
      setAdminPage('main');
    }
  }, [isAdmin, authToken]);

  // Refresh the Telegram inventory whenever the Telegram page is opened
  useEffect(() => {
    if (isAdmin && adminPage === 'telegram') {
      void fetchTelegramStatus();
      void fetchTelegramFiles();
      void fetchDbStats();
      void fetchDbBackups();
    }
  }, [isAdmin, adminPage]);

  const ChevronIcon = t.dir === 'rtl' ? ChevronLeft : ChevronRight;
  const BackArrowIcon = t.dir === 'rtl' ? ArrowRight : ArrowLeft;

  const openAdminPage = (page: 'main' | 'xray' | 'pot' | 'telegram' | 'announcements') => {
    setAdminPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!isAdmin || announcementBusy) return;
    const body = announcementBody.trim();
    if (!body) return;
    setAnnouncementBusy(true);
    setAnnouncementMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/announcements`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: announcementTitle.trim(),
          body,
        }),
      });
      const data = (await res.json().catch(() => null)) as { items?: AnnouncementItem[]; error?: string } | null;
      if (!res.ok) {
        setAnnouncementMessage({ type: 'error', text: data?.error || t.downloadFailed });
      } else {
        if (Array.isArray(data?.items)) {
          onAnnouncementsChange(data.items);
        }
        setAnnouncementTitle('');
        setAnnouncementBody('');
        setAnnouncementMessage({ type: 'success', text: t.announcementPublishedMsg });
      }
    } catch {
      setAnnouncementMessage({ type: 'error', text: t.downloadFailed });
    } finally {
      setAnnouncementBusy(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin || announcementBusy) return;
    setAnnouncementBusy(true);
    setAnnouncementMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const data = (await res.json().catch(() => null)) as { items?: AnnouncementItem[]; error?: string } | null;
      if (!res.ok) {
        setAnnouncementMessage({ type: 'error', text: data?.error || t.downloadFailed });
      } else {
        if (Array.isArray(data?.items)) {
          onAnnouncementsChange(data.items);
        }
        setAnnouncementMessage({ type: 'success', text: t.announcementDeletedMsg });
      }
    } catch {
      setAnnouncementMessage({ type: 'error', text: t.downloadFailed });
    } finally {
      setAnnouncementBusy(false);
    }
  };

  useEffect(() => {
    setEditingName(false);
    setNameFeedback(null);
  }, [user?.id]);

  const startEditingName = () => {
    if (!user) return;
    setNameDraft(user.displayName);
    setNameFeedback(null);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setNameDraft('');
    setNameFeedback(null);
  };

  const submitNameChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || nameSaving) return;
    const trimmed = nameDraft.replace(/\s+/g, ' ').trim().slice(0, 48);
    if (!trimmed) {
      setNameFeedback({ type: 'error', text: t.displayNameRequiredError });
      return;
    }
    if (trimmed === user.displayName) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameFeedback(null);
    const result = await onUpdateDisplayName(trimmed);
    setNameSaving(false);
    if (result.ok) {
      setEditingName(false);
      setNameFeedback({ type: 'success', text: t.displayNameSaved });
      setTimeout(() => {
        setNameFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 2400);
    } else {
      setNameFeedback({ type: 'error', text: result.error || t.displayNameUpdateFailed });
    }
  };

  const handleClear = () => {
    onClearHistory();
    setClearedFeedback(true);
    setTimeout(() => setClearedFeedback(false), 1800);
  };

  if (isAdmin && adminPage === 'xray') {
    return (
      <div className="max-w-3xl mx-auto pb-28 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => openAdminPage('main')}
            className="min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-[#0A0A0A] text-black dark:text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <BackArrowIcon className="w-4 h-4 shrink-0" />
            <span>{t.backToSettings}</span>
          </button>
        </div>

        <div className="px-1">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t.sectionAdmin}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 shrink-0" />
            <span>{t.sectionXray}</span>
          </h1>
        </div>

        <section aria-label={t.sectionXray}>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-4 flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10">
              <div className="min-w-0">
                <div className="text-sm font-medium text-black dark:text-white">
                  {t.xrayEnableLabel}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.xrayEnableDesc}
                </p>
                <div className="mt-1.5 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                  {!xrayBinaryInstalled
                    ? t.xrayStatusNotInstalled
                    : xrayRunning
                      ? `${t.xrayStatusConnected} · SOCKS5 :${xrayPorts.socks} / HTTP :${xrayPorts.http}`
                      : t.xrayStatusStopped}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={xrayEnabled}
                aria-label={t.xrayEnableLabel}
                disabled={xrayLoading}
                onClick={() => {
                  const next = !xrayEnabled;
                  setXrayEnabled(next);
                  if (xrayConfigInput.trim()) {
                    void saveXrayConfig(next);
                  }
                }}
                className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                  xrayEnabled
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold">{xrayEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              {!xrayBinaryInstalled && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {t.xrayStatusNotInstalled}
                  </span>
                  <button
                    type="button"
                    onClick={installXrayCore}
                    disabled={xrayLoading}
                    className="min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {t.xrayInstallBtn}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.xrayTestUrlLabel}
                </label>
                <input
                  dir="ltr"
                  type="url"
                  value={xrayTestYoutubeUrl}
                  onChange={(e) => setXrayTestYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=jNQXAC9IVRw"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{t.xrayTestUrlDesc}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.xrayConfigLabel}
                </label>
                <textarea
                  dir="ltr"
                  value={xrayConfigInput}
                  onChange={(e) => setXrayConfigInput(e.target.value)}
                  placeholder={t.xrayConfigPlaceholder}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{t.xrayConfigDesc}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={importXrayProfiles}
                  disabled={xrayLoading || !xrayConfigInput.trim()}
                  className="min-h-[44px] px-4 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.xrayImportBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveXrayConfig()}
                  disabled={xrayLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {xrayLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.xraySaveBtn}</span>
                </button>
                {xraySingleTesting ? (
                  <button
                    type="button"
                    onClick={cancelXrayTests}
                    className="min-h-[44px] px-4 rounded-xl border border-red-300 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold whitespace-nowrap flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>{t.xrayCancelTestBtn}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => testXrayVpn()}
                    disabled={xrayLoading || xrayTestingAll || !xrayConfigInput.trim()}
                    className="min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {t.xrayTestBtn}
                  </button>
                )}
              </div>

              {xrayMessage && (
                <div
                  className={`text-xs p-3 rounded-xl flex items-start gap-2 ${
                    xrayMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                  }`}
                >
                  {xrayMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words min-w-0 font-mono">{xrayMessage.text}</span>
                </div>
              )}

              <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {t.xrayProfilesTitle} ({xrayProfiles.length})
                  </div>
                  {xrayProfiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{t.xrayTestConcurrencyLabel}</span>
                        <input
                          dir="ltr"
                          type="number"
                          min={1}
                          max={20}
                          value={xrayTestConcurrency}
                          disabled={xrayTestingAll}
                          onChange={(e) => updateXrayConcurrency(Number(e.target.value))}
                          className="w-16 min-h-[40px] px-2 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-center text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
                        />
                      </label>
                      {xrayTestingAll ? (
                        <button
                          type="button"
                          onClick={cancelXrayTests}
                          className="min-h-[40px] px-3 rounded-xl border border-red-300 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 tabular-nums"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>
                            {t.xrayCancelTestBtn}
                            {xrayTestProgress ? ` (${xrayTestProgress.done}/${xrayTestProgress.total})` : ''}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={testAllXrayProfiles}
                          disabled={xrayTestingProfileIds.length > 0 || xraySingleTesting || xrayLoading}
                          className="min-h-[40px] px-3 rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-black text-black dark:text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{t.xrayTestAllBtn}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {xrayProfiles.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                    {t.xrayProfilesEmpty}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {xrayProfiles.map((profile) => {
                      const isActive = profile.id === xrayActiveProfileId;
                      const isTesting = xrayTestingProfileIds.includes(profile.id);
                      return (
                        <div
                          key={profile.id}
                          className={`p-3 rounded-xl border transition-colors ${
                            isActive
                              ? 'bg-white dark:bg-black border-black dark:border-white'
                              : 'bg-white/70 dark:bg-black/60 border-black/10 dark:border-white/15'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-black dark:text-white break-words">
                                {profile.name}
                              </div>
                              <div className="mt-0.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                                {profile.protocol.toUpperCase()} · {profile.address}
                                {isActive ? ` · ${t.xrayActiveLabel}` : ''}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {isTesting && !xrayTestingAll ? (
                                <button
                                  type="button"
                                  onClick={cancelXrayTests}
                                  className="min-h-[40px] px-3 rounded-lg border border-red-300 dark:border-red-800/70 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
                                >
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{t.xrayCancelTestBtn}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => testXrayVpn(profile.id)}
                                  disabled={isTesting || xrayTestingAll}
                                  className="min-h-[40px] px-3 rounded-lg border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isTesting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                  <span>{t.xrayTestProfileBtn}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => activateXrayProfile(profile.id)}
                                disabled={xrayLoading || isActive}
                                className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50 ${
                                  isActive
                                    ? 'bg-black text-white dark:bg-white dark:text-black'
                                    : 'border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white'
                                }`}
                              >
                                {isActive ? t.xrayActiveLabel : t.xrayActivateBtn}
                              </button>
                              <button
                                type="button"
                                aria-label={t.xrayDeleteBtn}
                                onClick={() => deleteXrayProfile(profile.id)}
                                disabled={xrayLoading || isTesting}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-black/10 dark:border-white/15 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {profile.lastTest && (
                            <div
                              className={`mt-2 pt-2 border-t border-black/5 dark:border-white/10 text-[11px] font-mono flex items-start gap-1.5 ${
                                profile.lastTest.ok
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {profile.lastTest.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              )}
                              <span className="break-words min-w-0">
                                {profile.lastTest.ok
                                  ? [
                                      t.xrayTestedPass,
                                      typeof profile.lastTest.downloadedBytes === 'number'
                                        ? `${Math.max(1, Math.round(profile.lastTest.downloadedBytes / 1024))} KB`
                                        : null,
                                      typeof profile.lastTest.latencyMs === 'number'
                                        ? `${(profile.lastTest.latencyMs / 1000).toFixed(1)}s`
                                        : null,
                                      profile.lastTest.exitIp ? `IP ${profile.lastTest.exitIp}` : null,
                                      profile.lastTest.title || null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')
                                  : `${t.xrayTestedFail}: ${profile.lastTest.error || ''}`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isAdmin && adminPage === 'pot') {
    return (
      <div className="max-w-3xl mx-auto pb-28 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => openAdminPage('main')}
            className="min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-[#0A0A0A] text-black dark:text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <BackArrowIcon className="w-4 h-4 shrink-0" />
            <span>{t.backToSettings}</span>
          </button>
        </div>

        <div className="px-1">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t.sectionAdmin}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2.5">
            <Server className="w-6 h-6 shrink-0" />
            <span>{t.sectionPotProvider}</span>
          </h1>
        </div>

        <section aria-label={t.sectionPotProvider}>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-4 flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10">
              <div className="min-w-0">
                <div className="text-sm font-medium text-black dark:text-white">
                  {t.potEnableLabel}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.potEnableDesc}
                </p>
                <div className="mt-1.5 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                  {potMode === 'managed' && !potInstalled
                    ? t.potStatusNotInstalled
                    : potRunning
                      ? `${t.potStatusRunning}${potVersion ? ` v${potVersion}` : ''} · ${potMode === 'managed' ? `127.0.0.1:${potPort}` : potBaseUrl}`
                      : t.potStatusStopped}
                  {' · '}
                  {potPluginInstalled ? t.potPluginReady : t.potPluginMissing}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={potEnabled}
                aria-label={t.potEnableLabel}
                disabled={potLoading}
                onClick={() => {
                  const next = !potEnabled;
                  setPotEnabled(next);
                  void savePotProviderConfig(next);
                }}
                className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                  potEnabled
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold">{potEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {potMode === 'managed' && (!potInstalled || !potPluginInstalled) && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {!potInstalled ? t.potStatusNotInstalled : t.potPluginMissing}
                  </span>
                  <button
                    type="button"
                    onClick={installPotProvider}
                    disabled={potLoading}
                    className="min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {t.potInstallBtn}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.potModeLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPotMode('managed')}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      potMode === 'managed'
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/15'
                    }`}
                  >
                    {t.potModeManaged}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPotMode('external')}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      potMode === 'external'
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/15'
                    }`}
                  >
                    {t.potModeExternal}
                  </button>
                </div>
              </div>

              {potMode === 'managed' ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.potPortLabel}
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    min={1025}
                    max={65534}
                    value={potPort}
                    onChange={(e) => setPotPort(Number(e.target.value) || 4416)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.potBaseUrlLabel}
                  </label>
                  <input
                    dir="ltr"
                    type="url"
                    value={potBaseUrl}
                    onChange={(e) => setPotBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:4416"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Cpu className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-black dark:text-white">
                        {t.potJsRuntimeSection}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {t.potJsRuntimeDesc}
                      </p>
                      <div className="mt-1.5 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                        {denoInstalled
                          ? `${t.potDenoReady}${denoVersion ? ` v${denoVersion}` : ''}`
                          : t.potDenoMissing}
                        {' · '}
                        {`${t.potNodeReady}${nodeVersion ? ` v${nodeVersion}` : ''}`}
                      </div>
                    </div>
                  </div>

                  {!denoInstalled && (
                    <button
                      type="button"
                      onClick={installDenoRuntime}
                      disabled={installingDeno || potLoading}
                      className="min-h-[38px] px-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {installingDeno ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{t.potInstallDenoBtn}</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.potJsRuntimeModeLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'auto', label: t.potJsRuntimeAuto },
                        { id: 'deno', label: t.potJsRuntimeDeno },
                        { id: 'node', label: t.potJsRuntimeNode },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPotJsRuntime(opt.id)}
                        className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                          potJsRuntime === opt.id
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                            : 'bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/15'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-black dark:text-white">
                      {t.potEjsRemoteLabel}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {t.potEjsRemoteDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={potEjsRemoteComponents}
                    aria-label={t.potEjsRemoteLabel}
                    disabled={potLoading}
                    onClick={() => {
                      const next = !potEjsRemoteComponents;
                      setPotEjsRemoteComponents(next);
                      void savePotProviderConfig(undefined, undefined, next);
                    }}
                    className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                      potEjsRemoteComponents
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <span className="text-xs font-bold">{potEjsRemoteComponents ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => savePotProviderConfig()}
                  disabled={potLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {potLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.potSaveBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={testPotProvider}
                  disabled={potLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {t.potTestBtn}
                </button>
              </div>

              {potMessage && (
                <div
                  className={`text-xs p-3 rounded-xl flex items-start gap-2 ${
                    potMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                  }`}
                >
                  {potMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words min-w-0 font-mono">{potMessage.text}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-black/10 dark:bg-white/10" />

            {/* Moved YouTube Cookies section (PO Token field removed) */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <KeyRound className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-black dark:text-white">
                    {t.youtubeCookiesSection}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.youtubeCookiesDesc}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.youtubeCookiesLabel}
                </label>
                <textarea
                  dir="ltr"
                  value={youtubeCookies}
                  onChange={(e) => setYoutubeCookies(e.target.value)}
                  placeholder={t.youtubeCookiesPlaceholder}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveYouTubeAuth}
                  disabled={youtubeLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {youtubeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.youtubeSaveCookiesBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={testYouTubeAuth}
                  disabled={youtubeLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {t.youtubeTestBtn}
                </button>
              </div>

              {youtubeMessage && (
                <div
                  className={`text-xs p-3 rounded-xl flex items-start gap-2 ${
                    youtubeMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                  }`}
                >
                  {youtubeMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words min-w-0">{youtubeMessage.text}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isAdmin && adminPage === 'telegram') {
    const connected = Boolean(tgStatus?.signedIn);
    const statusLabel = connected ? t.telegramConnected : t.telegramNotConnected;

    return (
      <div className="max-w-3xl mx-auto pb-28 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => openAdminPage('main')}
            className="min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-[#0A0A0A] text-black dark:text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <BackArrowIcon className="w-4 h-4 shrink-0" />
            <span>{t.backToSettings}</span>
          </button>
        </div>

        <div className="px-1">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.sectionAdmin}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 shrink-0" />
            <span>{t.sectionTelegram}</span>
          </h1>
        </div>

        <section aria-label={t.sectionTelegram}>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-4 flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/10">
              <div className="min-w-0">
                <div className="text-sm font-medium text-black dark:text-white">{t.telegramEnableLabel}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.telegramEnableDesc}</p>
                <div className="mt-1.5 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                  {statusLabel}
                  {connected && tgStatus?.account ? ` · ${tgStatus.account}` : ''}
                  {tgChannel ? ` · ${tgChannel}` : ''}
                </div>
                {tgStatus?.uploadsActive ? (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t.telegramDisklessActive}</p>
                ) : tgStatus?.needsChannel ? (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t.telegramNeedsChannel}</p>
                ) : connected ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t.telegramDisklessInactiveHint}</p>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={tgEnabled}
                aria-label={t.telegramEnableLabel}
                disabled={tgLoading}
                onClick={() => {
                  const next = !tgEnabled;
                  setTgEnabled(next);
                  void saveTelegramSettings({ enabled: next });
                }}
                className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                  tgEnabled
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold">{tgEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-black dark:text-white">{t.telegramUploadLabel}</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.telegramUploadDesc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tgUploadEnabled}
                  aria-label={t.telegramUploadLabel}
                  disabled={tgLoading}
                  onClick={() => {
                    const next = !tgUploadEnabled;
                    setTgUploadEnabled(next);
                    void saveTelegramSettings({ uploadEnabled: next });
                  }}
                  className={`relative inline-flex h-8 w-14 min-h-[44px] min-w-[56px] shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                    tgUploadEnabled
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <span className="text-xs font-bold">{tgUploadEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.telegramModeLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTgMode('user')}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      tgMode === 'user'
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/15'
                    }`}
                  >
                    {t.telegramModeUser}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTgMode('bot')}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      tgMode === 'bot'
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/15'
                    }`}
                  >
                    {t.telegramModeBot}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.telegramApiIdLabel}
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    value={tgApiId}
                    onChange={(e) => setTgApiId(e.target.value)}
                    placeholder="12345678"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.telegramApiHashLabel}
                  </label>
                  <input
                    dir="ltr"
                    type="password"
                    value={tgApiHash}
                    onChange={(e) => setTgApiHash(e.target.value)}
                    placeholder={tgStatus?.hasApiHash ? tgStatus.apiHashMasked : '0123456789abcdef0123456789abcdef'}
                    autoComplete="new-password"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{t.telegramApiIdDesc}</p>

              {tgMode === 'bot' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.telegramBotTokenLabel}
                  </label>
                  <input
                    dir="ltr"
                    type="password"
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    placeholder={tgStatus?.hasBotToken ? '••••••••••••' : '123456789:AA...'}
                    autoComplete="new-password"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.telegramChannelLabel}
                </label>
                <input
                  dir="ltr"
                  type="text"
                  value={tgChannel}
                  onChange={(e) => setTgChannel(e.target.value)}
                  placeholder={t.telegramChannelPlaceholder}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{t.telegramSecretsHint}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => saveTelegramSettings()}
                  disabled={tgLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {tgLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.telegramSaveBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={testTelegramChannel}
                  disabled={tgLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {t.telegramTestBtn}
                </button>
              </div>

              {tgMessage && (
                <div
                  className={`text-xs p-3 rounded-xl flex items-start gap-2 ${
                    tgMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                  }`}
                >
                  {tgMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words min-w-0 font-mono">{tgMessage.text}</span>
                </div>
              )}
            </div>

            {tgMode === 'user' && (
              <>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-black dark:text-white">{t.telegramAccountLabel}</h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {statusLabel}
                        {tgStatus?.account ? ` · ${tgStatus.account}` : ''}
                      </p>
                    </div>
                  </div>

                  {!connected && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          {t.telegramPhoneLabel}
                        </label>
                        <input
                          dir="ltr"
                          type="tel"
                          value={tgPhone}
                          onChange={(e) => setTgPhone(e.target.value)}
                          placeholder={t.telegramPhonePlaceholder}
                          autoComplete="tel"
                          className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={sendTelegramCode}
                        disabled={tgLoading}
                        className="w-full min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {t.telegramSendCodeBtn}
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                            {t.telegramCodeLabel}
                          </label>
                          <input
                            dir="ltr"
                            type="text"
                            inputMode="numeric"
                            value={tgCode}
                            onChange={(e) => setTgCode(e.target.value)}
                            placeholder={t.telegramCodePlaceholder}
                            autoComplete="one-time-code"
                            className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 font-mono text-xs text-black dark:text-white placeholder-zinc-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                            {t.telegramPasswordLabel}
                          </label>
                          <input
                            dir="ltr"
                            type="password"
                            value={tgPassword}
                            onChange={(e) => setTgPassword(e.target.value)}
                            placeholder={t.telegramPasswordPlaceholder}
                            autoComplete="current-password"
                            className={`w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border font-mono text-xs text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 ${
                              tgNeedsPassword
                                ? 'border-red-400 dark:border-red-700'
                                : 'border-black/10 dark:border-white/15'
                            }`}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={signInTelegram}
                        disabled={tgLoading}
                        className="w-full min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {tgLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{t.telegramSignInBtn}</span>
                      </button>
                    </>
                  )}

                  {connected && (
                    <button
                      type="button"
                      onClick={disconnectTelegram}
                      disabled={tgLoading}
                      className="w-full min-h-[44px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold disabled:opacity-50"
                    >
                      {t.telegramLogoutBtn}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Stored files inventory */}
        <section aria-label={t.telegramStorageTitle}>
          <h2 className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t.telegramStorageTitle}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.telegramStorageDesc}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
                <span>
                  {tgFileCount} {t.telegramFilesCount}
                </span>
                <span>{formatBytes(tgTotalBytes)}</span>
              </div>

              {tgFiles.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.telegramNoFiles}</p>
              ) : (
                <ul className="divide-y divide-black/10 dark:divide-white/10 -mx-1">
                  {tgFiles.map((file) => (
                    <li key={file.id} className="px-1 py-2.5 flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-black dark:text-white truncate" dir="auto">
                          {file.title || file.file_name || file.id}
                        </span>
                        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                          {formatBytes(file.size_bytes)}
                          {file.user_email ? ` · ${file.user_email}` : ''}
                        </span>
                      </span>
                      <a
                        href={`${apiBase}/api/download/${encodeURIComponent(file.id)}`}
                        className="shrink-0 min-h-[36px] px-3 rounded-lg border border-black/10 dark:border-white/15 text-[11px] font-semibold inline-flex items-center text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        {t.telegramOpenFileBtn}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Server disk / cache purge */}
        <section aria-label={t.cachePurgeTitle}>
          <h2 className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t.cachePurgeTitle}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-4 flex items-start gap-3 border-b border-black/10 dark:border-white/10">
              <HardDrive className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-black dark:text-white">{t.cachePurgeTitle}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.cachePurgeDesc}</p>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <button
                type="button"
                onClick={() => void purgeServerCache()}
                disabled={cachePurgeBusy}
                className="w-full min-h-[44px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {cachePurgeBusy ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 shrink-0" />
                )}
                <span>{t.cachePurgeBtn}</span>
              </button>
              {cachePurgeMessage && (
                <p
                  className={`text-xs ${
                    cachePurgeMessage.type === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {cachePurgeMessage.text}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Database backup */}
        <section aria-label={t.dbBackupSection}>
          <h2 className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t.dbBackupSection}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-4 flex items-start gap-3 border-b border-black/10 dark:border-white/10">
              <Database className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-black dark:text-white">{t.dbBackupSection}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.dbBackupDesc}</p>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {dbStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: t.dbBackupUsers, value: dbStats.users },
                    { label: t.dbBackupHistory, value: dbStats.history },
                    { label: t.dbBackupTelegram, value: dbStats.telegramFiles },
                    { label: t.dbBackupSize, value: formatBytes(dbStats.sizeBytes) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 px-3 py-2.5"
                    >
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{stat.label}</div>
                      <div className="text-sm font-semibold text-black dark:text-white font-mono tabular-nums mt-0.5">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={`${apiBase}/api/admin/db/backup`}
                  download
                  className="w-full min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{t.dbBackupBtn}</span>
                </a>
                <button
                  type="button"
                  onClick={() => void createDbBackupOnServer()}
                  disabled={dbBackupBusy}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/20 text-black dark:text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>{dbBackupBusy ? '...' : t.dbBackupCreateBtn}</span>
                </button>
                <label className="w-full min-h-[44px] px-4 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/20 text-black dark:text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>{dbBackupBusy ? '...' : t.dbBackupRestoreBtn}</span>
                  <input
                    type="file"
                    accept=".db"
                    className="hidden"
                    disabled={dbBackupBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void restoreDbBackup(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              {dbBackupMessage && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{dbBackupMessage}</p>
              )}

              <div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  {t.dbBackupServerTitle}
                </div>
                {dbBackups.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.dbBackupEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {dbBackups.slice(0, 8).map((item) => (
                      <li key={item.fileName}>
                        <a
                          href={`${apiBase}/api/admin/db/backups/${encodeURIComponent(item.fileName)}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                          <span className="font-mono truncate flex-1 text-black dark:text-white">
                            {item.fileName}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                            {formatBytes(item.sizeBytes)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isAdmin && adminPage === 'announcements') {
    return (
      <div className="max-w-3xl mx-auto pb-28 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => openAdminPage('main')}
            className="min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-[#0A0A0A] text-black dark:text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            <BackArrowIcon className="w-4 h-4 shrink-0" />
            <span>{t.backToSettings}</span>
          </button>
        </div>

        <div className="px-1">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.sectionAdmin}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 shrink-0" />
            <span>{t.adminAnnouncementsSection}</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t.adminAnnouncementsDesc}</p>
        </div>

        <section aria-label={t.adminAnnouncementsSection}>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-announcement-title"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                {t.announcementTitleLabel}
              </label>
              <input
                id="admin-announcement-title"
                type="text"
                maxLength={160}
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder={t.announcementTitlePlaceholder}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/20 text-sm text-black dark:text-white placeholder:text-zinc-400 outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-announcement-body"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                {t.announcementBodyLabel}
              </label>
              <textarea
                id="admin-announcement-body"
                rows={4}
                maxLength={2000}
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                placeholder={t.announcementBodyPlaceholder}
                className="w-full p-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/20 text-sm text-black dark:text-white placeholder:text-zinc-400 outline-none focus:border-black dark:focus:border-white resize-y"
              />
            </div>

            <button
              type="button"
              onClick={() => void handlePublishAnnouncement()}
              disabled={announcementBusy || !announcementBody.trim()}
              className="w-full min-h-[46px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {announcementBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
              <span>{t.announcementPublishBtn}</span>
            </button>

            {announcementMessage && (
              <div
                className={`rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 ${
                  announcementMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                    : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25'
                }`}
              >
                {announcementMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="break-words min-w-0">{announcementMessage.text}</span>
              </div>
            )}
          </div>
        </section>

        <section aria-label={t.announcementsTitle}>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            {announcements.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {t.announcementEmptyAdmin}
              </div>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {announcements.map((item) => (
                  <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-semibold text-black dark:text-white truncate">
                        {item.title || t.announcementsTitle}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAnnouncement(item.id)}
                      disabled={announcementBusy}
                      aria-label={t.announcementDeleteBtn}
                      className="min-h-[36px] px-3 rounded-lg border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-red-500/10 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.announcementDeleteBtn}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-28 space-y-6">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          {t.settingsTitle}
        </h1>
      </div>

      {/* Section 1: Telegram-style Account */}
      <section aria-labelledby="settings-account">
        <h2
          id="settings-account"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {t.sectionAccount}
        </h2>
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 font-bold text-lg">
              {user ? user.displayName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-black dark:text-white truncate" dir="auto">
                {user ? user.displayName : t.guestName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {user ? `${t.signedInAs} · ${user.email}` : t.guestSubtitle}
              </div>
            </div>
            {user && !editingName && (
              <button
                type="button"
                onClick={startEditingName}
                aria-label={t.editDisplayName}
                title={t.editDisplayName}
                className="min-h-[44px] px-3 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition whitespace-nowrap shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.editDisplayName}</span>
              </button>
            )}
          </div>

          {user && editingName && (
            <>
              <div className="h-px bg-black/10 dark:bg-white/10 ms-16" />
              <form onSubmit={submitNameChange} className="p-4 space-y-2.5 bg-black/[0.02] dark:bg-white/[0.02]">
                <label
                  htmlFor="account-display-name-input"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {t.displayNameLabel}
                </label>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    id="account-display-name-input"
                    type="text"
                    dir="auto"
                    autoFocus
                    maxLength={48}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditingName();
                      }
                    }}
                    placeholder={t.displayNamePlaceholder}
                    disabled={nameSaving}
                    className="flex-1 min-w-0 w-full sm:w-auto min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/20 text-sm text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="submit"
                      disabled={nameSaving || !nameDraft.trim()}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {nameSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{t.saveNameBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingName}
                      disabled={nameSaving}
                      className="flex-1 sm:flex-initial min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-zinc-700 dark:text-zinc-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.cancelBtn}</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {user && nameFeedback && (
            <div
              className={`mx-4 mb-3 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 ${
                nameFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25'
              }`}
            >
              {nameFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="min-w-0 break-words">{nameFeedback.text}</span>
            </div>
          )}

          <div className="h-px bg-black/10 dark:bg-white/10 ms-16" />

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{t.signOut}</span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{t.signInOrCreate}</span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>
      </section>

      {/* Section 2: Appearance & Language */}
      <section aria-labelledby="settings-appearance">
        <h2
          id="settings-appearance"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {t.sectionAppearance}
        </h2>
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
          <div className="min-h-[60px] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>{t.themeLabel}</span>
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/80 dark:bg-black border border-black/10 dark:border-white/15">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  theme === 'dark'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {t.themeBlack}
              </button>
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  theme === 'light'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {t.themeWhite}
              </button>
            </div>
          </div>

          <div className="h-px bg-black/10 dark:bg-white/10 ms-11" />

          <div className="px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
              <Globe className="w-4 h-4" />
              <span>{t.languageLabel}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onLanguageChange(item.code)}
                  className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition whitespace-nowrap ${
                    language === item.code
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-black text-zinc-700 dark:text-zinc-300 border-black/10 dark:border-white/15 hover:border-black/30 dark:hover:border-white/35'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Downloads & Storage */}
      <section aria-labelledby="settings-downloads">
        <h2
          id="settings-downloads"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {t.sectionDownloads}
        </h2>
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
          <div className="px-4 py-3.5 space-y-2.5">
            <div className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
              <Download className="w-4 h-4 text-zinc-500" />
              <span>{t.defaultQualityLabel}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {DEFAULT_QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onDefaultQualityChange(q)}
                  className={`min-h-[40px] px-2 rounded-xl text-xs font-mono font-semibold border transition whitespace-nowrap ${
                    defaultQuality === q
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-black text-zinc-700 dark:text-zinc-300 border-black/10 dark:border-white/15 hover:border-black/30 dark:hover:border-white/35'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-black/10 dark:bg-white/10 ms-11" />

          <button
            type="button"
            onClick={handleClear}
            className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
              <Trash2 className="w-4 h-4 text-zinc-500" />
              <span>{t.clearHistoryLabel}</span>
            </span>
            <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              {clearedFeedback ? t.clearHistoryDone : `${historyCount} ${t.itemsCount}`}
            </span>
          </button>
        </div>
      </section>

      {/* Section 4: App (only shown when installable) */}
      {!isInstalled && (isInstallable || isIOS) && (
        <section aria-labelledby="settings-engine">
          <h2
            id="settings-engine"
            className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {t.sectionAppServer}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
              className="w-full min-h-[52px] px-4 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
                <Smartphone className="w-4 h-4" />
                <span>{t.installAppLabel}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-black dark:text-white">
                <Download className="w-3.5 h-3.5" />
                <span>{isInstallable ? t.installAppAction : t.installIOSAction}</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Admin-Only Navigation Buttons (Hidden completely from guests and standard users; open full pages, never popups) */}
      {isAdmin && (
        <section aria-labelledby="settings-admin-panel">
          <h2
            id="settings-admin-panel"
            className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {t.sectionAdmin}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => openAdminPage('xray')}
              className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-black dark:text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black dark:text-white truncate">
                    {t.sectionAdmin} · {t.sectionXray}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {xrayRunning
                      ? `${t.xrayStatusConnected} · ${xrayProfiles.length} ${t.itemsCount}`
                      : `${t.xrayNavDesc}`}
                  </span>
                </span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <div className="h-px bg-black/10 dark:bg-white/10 ms-16" />

            <button
              type="button"
              onClick={() => openAdminPage('pot')}
              className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4 text-black dark:text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black dark:text-white truncate">
                    {t.sectionAdmin} · {t.sectionPotProvider}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {potRunning
                      ? `${t.potStatusRunning} · ${potPluginInstalled ? t.potPluginReady : t.potPluginMissing}`
                      : t.potNavDesc}
                  </span>
                </span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <div className="h-px bg-black/10 dark:bg-white/10 ms-16" />

            <button
              type="button"
              onClick={() => openAdminPage('telegram')}
              className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-black dark:text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black dark:text-white truncate">
                    {t.sectionAdmin} · {t.sectionTelegram}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {tgStatus?.signedIn && tgEnabled
                      ? `${t.telegramConnected} · ${tgFileCount} ${t.telegramFilesCount}`
                      : t.telegramNavDesc}
                  </span>
                </span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <div className="h-px bg-black/10 dark:bg-white/10 ms-16" />

            <button
              type="button"
              onClick={() => openAdminPage('announcements')}
              className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-start hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-black dark:text-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black dark:text-white truncate">
                    {t.sectionAdmin} · {t.adminAnnouncementsSection}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {announcements.length > 0
                      ? `${announcements.length} ${t.itemsCount}`
                      : t.adminAnnouncementsDesc}
                  </span>
                </span>
              </span>
              <ChevronIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          </div>
        </section>
      )}

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0A0A0A] border border-black/15 dark:border-white/20 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-black dark:text-white">
              {t.installIOSGuideTitle}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {t.installIOSGuideBody}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
