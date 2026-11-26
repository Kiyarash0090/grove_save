import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  Captions,
  Check,
  ChevronDown,
  ClipboardPaste,
  CloudDownload,
  Copy,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Music,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  Terminal,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type { TranslationDict } from '../i18n';

export interface MediaAudioTrack {
  formatId: string;
  language: string;
  label: string;
  ext: string;
  abr: number | null;
  isDefault: boolean;
}

export interface MediaSubtitleTrack {
  lang: string;
  label: string;
  isAuto: boolean;
}

export type ProviderGlow = 'default' | 'red' | 'instagram' | 'tiktok' | 'x';

export interface MediaMetadata {
  url: string;
  title: string;
  author: string;
  durationSeconds: number | null;
  thumbnail: string | null;
  providerGlow: ProviderGlow;
  isVertical?: boolean;
  mediaKind?: string;
  hasVideo?: boolean;
  itemCount?: number;
  qualities: string[];
  engineMode?: 'live' | 'preview';
  audioTracks?: MediaAudioTrack[];
  manualSubtitles?: MediaSubtitleTrack[];
  autoSubtitles?: MediaSubtitleTrack[];
}

export interface SavedItem {
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

interface ReadyJob {
  jobId: string;
  url: string;
  title: string;
  author: string;
  quality: string;
  sizeBytes: number;
  thumbnail: string | null;
  fileId?: string | null;
  downloadPath?: string;
}

interface AdminLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
}

interface DownloaderViewProps {
  t: TranslationDict;
  apiBase: string;
  defaultQuality: string;
  history: SavedItem[];
  onAddHistory: (item: SavedItem) => void;
  onProviderGlowChange: (glow: ProviderGlow) => void;
  isGuest?: boolean;
  isAdmin?: boolean;
  authToken?: string | null;
}

export function extractClientYouTubeId(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id =
        (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v' || parts[0] === 'vi') &&
        parts[1]
          ? parts[1]
          : parts[0];
      return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
    }
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{6,15}$/.test(v)) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (
        (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v' || parts[0] === 'vi') &&
        parts[1]
      ) {
        return /^[a-zA-Z0-9_-]{6,15}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isYouTubeShortsUrlString(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
    const host = parsed.hostname.toLowerCase();
    if (
      !host.includes('youtube.com') &&
      !host.includes('youtube-nocookie.com') &&
      host !== 'youtu.be' &&
      !host.endsWith('.youtu.be')
    ) {
      return false;
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[0] === 'shorts' && Boolean(parts[1]);
  } catch {
    return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/shorts\//i.test(raw);
  }
}

export function isYouTubeUrlString(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  if (!lower) return false;
  try {
    const parsed = new URL(lower.startsWith('http') ? lower : `https://${lower}`);
    const h = parsed.hostname;
    return (
      h === 'youtu.be' ||
      h.endsWith('.youtu.be') ||
      h === 'youtube.com' ||
      h.endsWith('.youtube.com') ||
      h.endsWith('.youtube-nocookie.com')
    );
  } catch {
    return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/.test(lower);
  }
}

export function isInstagramUrlString(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  if (!lower) return false;
  try {
    const parsed = new URL(lower.startsWith('http') ? lower : `https://${lower}`);
    const h = parsed.hostname;
    return (
      h === 'instagram.com' ||
      h === 'www.instagram.com' ||
      h === 'm.instagram.com' ||
      h === 'instagr.am' ||
      h.endsWith('.instagram.com')
    );
  } catch {
    return /(?:instagram\.com|instagr\.am)/.test(lower);
  }
}

export function isTikTokUrlString(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  if (!lower) return false;
  try {
    const parsed = new URL(lower.startsWith('http') ? lower : `https://${lower}`);
    const h = parsed.hostname;
    return h === 'tiktok.com' || h.endsWith('.tiktok.com');
  } catch {
    return /tiktok\.com/.test(lower);
  }
}

export function isXUrlString(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  if (!lower) return false;
  try {
    const parsed = new URL(lower.startsWith('http') ? lower : `https://${lower}`);
    const h = parsed.hostname;
    return (
      h === 'x.com' ||
      h.endsWith('.x.com') ||
      h === 'twitter.com' ||
      h.endsWith('.twitter.com') ||
      h === 'fxtwitter.com' ||
      h === 'vxtwitter.com' ||
      h === 'fixupx.com' ||
      h === 't.co'
    );
  } catch {
    return /(?:x\.com|twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com|t\.co)/.test(lower);
  }
}

function formatDuration(sec: number | null): string | null {
  if (sec === null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DownloaderView: React.FC<DownloaderViewProps> = ({
  t,
  apiBase,
  defaultQuality,
  history,
  onAddHistory,
  onProviderGlowChange,
  isGuest = false,
  isAdmin = false,
  authToken = null,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [selectedQuality, setSelectedQuality] = useState(defaultQuality);
  const [inspecting, setInspecting] = useState(false);
  const [media, setMedia] = useState<MediaMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [jobStage, setJobStage] = useState<'idle' | 'downloading' | 'processing' | 'ready'>('idle');
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobBytes, setJobBytes] = useState<number>(0);
  const [readyJob, setReadyJob] = useState<ReadyJob | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [imgFailed, setImgFailed] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  const [selectedAudioFormatId, setSelectedAudioFormatId] = useState<string>('');
  const [selectedSubtitle, setSelectedSubtitle] = useState<MediaSubtitleTrack | null>(null);
  const [subFilter, setSubFilter] = useState('');
  const [showAutoSubs, setShowAutoSubs] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerRetryNonce, setPlayerRetryNonce] = useState(0);
  const [useYoutubeEmbed, setUseYoutubeEmbed] = useState(false);
  const [embedYoutubeId, setEmbedYoutubeId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeTimeRef = useRef<number>(0);

  const lastInspectedRef = useRef<string>('');
  const pollTimerRef = useRef<number | null>(null);

  const [adminLogs, setAdminLogs] = useState<AdminLogEntry[]>([]);
  const [adminLogLevel, setAdminLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [adminLogsPaused, setAdminLogsPaused] = useState(false);
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);
  const [adminLogsCopied, setAdminLogsCopied] = useState(false);
  const adminLogBoxRef = useRef<HTMLDivElement | null>(null);
  const adminLogStickBottomRef = useRef<boolean>(true);

  const buildAdminHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'GroveSave',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
  };

  const fetchAdminLogs = async (silent = false) => {
    if (!isAdmin) return;
    if (!silent) setAdminLogsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/logs?limit=250`, {
        method: 'GET',
        credentials: 'include',
        headers: buildAdminHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { logs?: AdminLogEntry[] };
      if (Array.isArray(data.logs)) {
        setAdminLogs(data.logs);
      }
    } catch {
      // ignore transient network errors on background log polling
    } finally {
      if (!silent) setAdminLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setAdminLogs([]);
      return;
    }
    void fetchAdminLogs(false);
    if (adminLogsPaused) return;
    const intervalId = window.setInterval(() => {
      void fetchAdminLogs(true);
    }, 3000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAdmin, authToken, apiBase, adminLogsPaused]);

  const filteredAdminLogs =
    adminLogLevel === 'all'
      ? adminLogs
      : adminLogs.filter((entry) => entry.level === adminLogLevel);

  useEffect(() => {
    const box = adminLogBoxRef.current;
    if (!box || !adminLogStickBottomRef.current) return;
    box.scrollTop = box.scrollHeight;
  }, [filteredAdminLogs.length, adminLogLevel]);

  const handleAdminLogScroll = () => {
    const box = adminLogBoxRef.current;
    if (!box) return;
    const distanceFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
    adminLogStickBottomRef.current = distanceFromBottom < 32;
  };

  const handleClearAdminLogs = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/logs`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildAdminHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { logs?: AdminLogEntry[] };
        setAdminLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyAdminLogs = async () => {
    if (filteredAdminLogs.length === 0) return;
    const text = filteredAdminLogs
      .map((entry) => {
        const time = entry.timestamp.slice(11, 19);
        return `${time} [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setAdminLogsCopied(true);
      window.setTimeout(() => setAdminLogsCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const providerGlow: ProviderGlow =
    isYouTubeUrlString(urlInput) || media?.providerGlow === 'red'
      ? 'red'
      : isInstagramUrlString(urlInput) || media?.providerGlow === 'instagram'
        ? 'instagram'
        : isTikTokUrlString(urlInput) || media?.providerGlow === 'tiktok'
          ? 'tiktok'
          : isXUrlString(urlInput) || media?.providerGlow === 'x'
            ? 'x'
            : 'default';

  useEffect(() => {
    onProviderGlowChange(providerGlow);
  }, [providerGlow, onProviderGlowChange]);

  useEffect(() => {
    setSelectedQuality(defaultQuality === 'audio' ? '1080p' : defaultQuality);
  }, [defaultQuality]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const inspectUrl = async (targetRaw: string) => {
    const trimmed = targetRaw.trim();
    if (!trimmed) return;
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    try {
      const check = new URL(normalized);
      if (check.protocol !== 'http:' && check.protocol !== 'https:') {
        setErrorMsg(t.invalidUrlError);
        return;
      }
    } catch {
      setErrorMsg(t.invalidUrlError);
      return;
    }

    if (lastInspectedRef.current === normalized && (media || inspecting)) return;
    lastInspectedRef.current = normalized;

    stopPolling();
    setInspecting(true);
    setErrorMsg(null);
    setJobStage('idle');
    setReadyJob(null);
    setSavedConfirmed(false);
    setImgFailed(false);
    setShowPlayer(false);
    setAudioOnlyMode(false);
    setPlayerError(null);
    setUseYoutubeEmbed(false);
    setEmbedYoutubeId(null);
    setSelectedAudioFormatId('');
    setSelectedSubtitle(null);
    setSubFilter('');
    setShowAutoSubs(false);
    resumeTimeRef.current = 0;

    try {
      const res = await fetch(`${apiBase}/api/media/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || t.inspectFailed);
        setMedia(null);
        lastInspectedRef.current = '';
      } else {
        const audioTracks: MediaAudioTrack[] = Array.isArray(data.audioTracks) ? data.audioTracks : [];
        const manualSubtitles: MediaSubtitleTrack[] = Array.isArray(data.manualSubtitles)
          ? data.manualSubtitles
          : [];
        const autoSubtitles: MediaSubtitleTrack[] = Array.isArray(data.autoSubtitles) ? data.autoSubtitles : [];
        const defaultTrack = audioTracks.find((tr) => tr.isDefault) || audioTracks[0];
        setSelectedAudioFormatId(defaultTrack ? defaultTrack.formatId : '');
        setShowAutoSubs(manualSubtitles.length === 0 && autoSubtitles.length > 0);
        const filteredQualities = Array.isArray(data.qualities)
          ? (data.qualities as string[]).filter((q) => q !== 'audio')
          : ['2160p', '1080p', '720p', '480p', '360p'];
        const normalizedQualities = filteredQualities.length
          ? filteredQualities
          : ['1080p', '720p', '480p', '360p'];
        const nextGlow: ProviderGlow =
          data.providerGlow === 'red'
            ? 'red'
            : data.providerGlow === 'instagram'
              ? 'instagram'
              : 'default';
        setSelectedQuality((prev) => (normalizedQualities.includes(prev) ? prev : normalizedQualities[0]));
        setMedia({
          url: normalized,
          title: data.title,
          author: data.author,
          durationSeconds: data.durationSeconds,
          thumbnail: data.thumbnail,
          providerGlow: nextGlow,
          isVertical: Boolean(data.isVertical) || isYouTubeShortsUrlString(normalized),
          mediaKind: typeof data.mediaKind === 'string' ? data.mediaKind : undefined,
          hasVideo: typeof data.hasVideo === 'boolean' ? data.hasVideo : true,
          itemCount: typeof data.itemCount === 'number' ? data.itemCount : undefined,
          qualities: normalizedQualities,
          engineMode: data.engineMode,
          audioTracks,
          manualSubtitles,
          autoSubtitles,
        });
      }
    } catch {
      setErrorMsg(t.inspectFailed);
      setMedia(null);
      lastInspectedRef.current = '';
    } finally {
      setInspecting(false);
    }
  };

  useEffect(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setMedia(null);
      setErrorMsg(null);
      setJobStage('idle');
      setReadyJob(null);
      lastInspectedRef.current = '';
      stopPolling();
      return;
    }
    if (!/^https?:\/\/[^\s.]+\.[^\s]+/i.test(trimmed)) return;
    if (lastInspectedRef.current === trimmed) return;
    const timer = setTimeout(() => {
      inspectUrl(trimmed);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput]);

  const handlePaste = async () => {
    setErrorMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text?.trim();
      if (trimmed) {
        setUrlInput(trimmed);
        await inspectUrl(trimmed);
      }
    } catch {
      setErrorMsg(t.clipboardBlocked);
    }
  };

  const handleClear = () => {
    stopPolling();
    setUrlInput('');
    setMedia(null);
    setErrorMsg(null);
    setJobStage('idle');
    setReadyJob(null);
    setSavedConfirmed(false);
    lastInspectedRef.current = '';
  };

  const handleQualitySelect = (q: string) => {
    if (videoRef.current && showPlayer) {
      resumeTimeRef.current = videoRef.current.currentTime || 0;
    }
    setPlayerError(null);
    setUseYoutubeEmbed(false);
    setAudioOnlyMode(false);
    setSelectedQuality(q);
    if (readyJob && readyJob.quality !== q) {
      setJobStage('idle');
      setReadyJob(null);
      setSavedConfirmed(false);
    }
  };

  const handleAudioTrackSelect = (formatId: string) => {
    if (videoRef.current && showPlayer) {
      resumeTimeRef.current = videoRef.current.currentTime || 0;
    }
    setPlayerError(null);
    setUseYoutubeEmbed(false);
    setSelectedAudioFormatId(formatId);
    if (readyJob) {
      setJobStage('idle');
      setReadyJob(null);
      setSavedConfirmed(false);
    }
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !showPlayer) return;
    const tracks = vid.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = selectedSubtitle ? 'showing' : 'disabled';
    }
  }, [selectedSubtitle, showPlayer]);

  const startAppDownload = async (
    targetUrl: string,
    title: string,
    quality: string,
    thumb: string | null,
    author: string,
    audioFormatId?: string
  ) => {
    stopPolling();
    setJobStage('downloading');
    setJobProgress(4);
    setJobBytes(0);
    setReadyJob(null);
    setSavedConfirmed(false);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiBase}/api/media/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          quality,
          title,
          author,
          ...(audioFormatId ? { audioFormatId } : {}),
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error || 'Prepare failed');
      }

      const jobId = data.jobId;
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const statusRes = await fetch(`${apiBase}/api/media/jobs/${encodeURIComponent(jobId)}`);
          if (!statusRes.ok) {
            throw new Error('Status failed');
          }
          const job = (await statusRes.json()) as {
            status: 'downloading' | 'processing' | 'ready' | 'error';
            progress: number;
            downloadedBytes: number;
            totalBytes: number | null;
            error?: string;
            fileId?: string | null;
            downloadPath?: string;
          };

          setJobProgress(job.progress || 0);
          setJobBytes(job.downloadedBytes || 0);

          if (job.status === 'processing') {
            setJobStage('processing');
          } else if (job.status === 'downloading') {
            setJobStage('downloading');
          } else if (job.status === 'ready') {
            stopPolling();
            const finalSize = job.totalBytes || job.downloadedBytes || 0;
            const completed: ReadyJob = {
              jobId,
              url: targetUrl,
              title,
              author,
              quality,
              sizeBytes: finalSize,
              thumbnail: thumb,
              fileId: job.fileId ?? null,
              downloadPath: job.downloadPath,
            };
            setReadyJob(completed);
            setJobProgress(100);
            setJobStage('ready');

            // Prevent duplicate history entries - only add if not already in history
            onAddHistory({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              jobId,
              url: targetUrl,
              title,
              author,
              quality,
              sizeBytes: finalSize,
              thumbnail: thumb,
              savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          } else if (job.status === 'error') {
            stopPolling();
            setJobStage('idle');
            setErrorMsg(job.error || t.downloadFailed);
          }
        } catch {
          stopPolling();
          setJobStage('idle');
          setErrorMsg(t.downloadFailed);
        }
      }, 350);
    } catch {
      setJobStage('idle');
      setErrorMsg(t.downloadFailed);
    }
  };

  const isTelegramReady = Boolean(readyJob?.fileId);

  const triggerFileSaveFromSite = async (jobId: string, fileId?: string | null) => {
    const href = fileId
      ? `${apiBase}/api/download/${encodeURIComponent(fileId)}`
      : `${apiBase}/api/media/files/${encodeURIComponent(jobId)}`;
    // The endpoint answers failures with JSON. Triggering the save blindly would
    // make the browser store that error document as `<uuid>.json`, so check the
    // link first and surface the real message instead.
    try {
      const probe = await fetch(href, { method: 'HEAD' });
      if (!probe.ok) {
        // Errors are JSON, so a one-byte range request reads the reason without
        // pulling the media itself.
        let detail = '';
        try {
          const failed = await fetch(href, { headers: { Range: 'bytes=0-0' } });
          const body = (await failed.json()) as { error?: string };
          if (typeof body?.error === 'string') detail = body.error;
        } catch {
          // Not JSON or not reachable: fall back to the generic message.
        }
        setErrorMsg(detail || t.downloadFailed);
        return;
      }
    } catch {
      setErrorMsg(t.downloadFailed);
      return;
    }
    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSavedConfirmed(true);
  };

  const copyReadyDownloadLink = async () => {
    if (!readyJob) return;
    const path = readyJob.downloadPath
      ? `${apiBase}${readyJob.downloadPath}`
      : `${apiBase}/api/media/files/${encodeURIComponent(readyJob.jobId)}`;
    const absolute = /^https?:\/\//i.test(path) ? path : `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setSavedConfirmed(true);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setErrorMsg(t.clipboardBlocked);
    }
  };

  const handleHistoryDownload = async (item: SavedItem) => {
    if (item.jobId) {
      try {
        const check = await fetch(`${apiBase}/api/media/jobs/${encodeURIComponent(item.jobId)}`);
        if (check.ok) {
          const data = (await check.json()) as { status?: string; fileId?: string | null };
          if (data.status === 'ready') {
            triggerFileSaveFromSite(item.jobId, data.fileId);
            return;
          }
        }
      } catch {
        // Re-prepare below if expired
      }
    }
    const nextQuality =
      item.quality === 'audio' || item.quality === 'best'
        ? defaultQuality === 'audio'
          ? '1080p'
          : defaultQuality
        : item.quality;
    setUrlInput(item.url);
    setSelectedQuality(nextQuality);
    setAudioOnlyMode(item.quality === 'audio');
    startAppDownload(item.url, item.title, item.quality, item.thumbnail, item.author);
  };

  const handleSubmitInspect = (e: React.FormEvent) => {
    e.preventDefault();
    inspectUrl(urlInput);
  };

  const isSocialMedia = Boolean(
    media &&
      (['instagram', 'tiktok', 'x'].includes(media.providerGlow) ||
        isInstagramUrlString(media.url) ||
        isTikTokUrlString(media.url) ||
        isXUrlString(media.url))
  ) ||
    isInstagramUrlString(urlInput) ||
    isTikTokUrlString(urlInput) ||
    isXUrlString(urlInput);

  const availableQualities = (media?.qualities || ['2160p', '1080p', '720p', '480p', '360p']).filter(
    (q) => q !== 'audio' && q !== 'best'
  );
  const effectiveDownloadQuality = audioOnlyMode
    ? 'audio'
    : isSocialMedia || availableQualities.length === 0
      ? 'best'
      : selectedQuality;
  const isBusy = jobStage === 'downloading' || jobStage === 'processing';

  return (
    <div className="max-w-6xl mx-auto pb-28 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Main Downloader Column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2 pt-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black dark:text-white text-balance">
            {t.heroTitle}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
            {t.heroSubtitle}
          </p>
        </div>

        {/* Link Input Card with Dynamic White / Red / Instagram Neon Aura */}
        <form onSubmit={handleSubmitInspect} className="relative">
          <div
            aria-hidden="true"
            className={`absolute -inset-2 rounded-3xl blur-2xl transition-all duration-500 pointer-events-none ${
              providerGlow === 'red'
                ? 'bg-red-600/35 dark:bg-red-600/45 opacity-100 scale-[1.01]'
                : providerGlow === 'instagram'
                  ? 'bg-gradient-to-r from-[#f58529]/45 via-[#dd2a7b]/50 to-[#8134af]/45 dark:from-[#f58529]/50 dark:via-[#dd2a7b]/55 dark:to-[#8134af]/50 opacity-100 scale-[1.01]'
                  : providerGlow === 'tiktok'
                    ? 'bg-gradient-to-r from-[#25f4ee]/45 via-[#fe2c55]/50 to-[#25f4ee]/45 dark:from-[#25f4ee]/50 dark:via-[#fe2c55]/55 dark:to-[#25f4ee]/50 opacity-100 scale-[1.01]'
                    : providerGlow === 'x'
                      ? 'bg-gradient-to-r from-[#1da1f2]/45 via-[#00b4d8]/50 to-[#1da1f2]/45 dark:from-[#1da1f2]/50 dark:via-[#00b4d8]/55 dark:to-[#1da1f2]/50 opacity-100 scale-[1.01]'
                      : 'bg-black/5 dark:bg-white/20 opacity-85'
            }`}
          />

          <div
            className={`relative rounded-2xl p-3 backdrop-blur-2xl backdrop-saturate-150 bg-white/60 dark:bg-white/[0.06] border border-white/75 dark:border-white/15 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.08] transition-all duration-300 ${
              providerGlow === 'red'
                ? 'neon-red-box'
                : providerGlow === 'instagram'
                  ? 'neon-instagram-box'
                  : providerGlow === 'tiktok'
                    ? 'neon-tiktok-box'
                    : providerGlow === 'x'
                      ? 'neon-x-box'
                      : 'neon-white-box'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="url"
                dir="ltr"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t.linkPlaceholder}
                aria-label={t.linkPlaceholder}
                className="flex-1 min-w-0 min-h-[48px] px-3 bg-transparent text-sm sm:text-base text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />

              {urlInput ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label={t.clear}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="min-h-[44px] px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95 transition whitespace-nowrap shrink-0"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{t.paste}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={inspecting || !urlInput.trim()}
                aria-label={t.analyze}
                className="min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                {inspecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{inspecting ? t.analyzing : t.analyze}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Subtle theme-matched monochrome supported platform icons */}
        <div
          aria-label="YouTube, Instagram, TikTok, X"
          className="flex items-center justify-center gap-3 pt-0.5 text-black/35 dark:text-white/35 select-none"
        >
          <span
            title="YouTube"
            className={`inline-flex items-center transition-colors duration-200 cursor-pointer ${
              isYouTubeUrlString(urlInput) || media?.providerGlow === 'red'
                ? 'text-red-500 scale-110'
                : 'hover:text-red-500 dark:hover:text-red-400'
            }`}
          >
            <svg
              className="w-4 h-4 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-50" aria-hidden="true" />
          <span
            title="Instagram"
            className={`inline-flex items-center transition-colors duration-200 cursor-pointer ${
              isInstagramUrlString(urlInput) || media?.providerGlow === 'instagram'
                ? 'text-[#dd2a7b] scale-110'
                : 'hover:text-[#dd2a7b] dark:hover:text-[#f43f5e]'
            }`}
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-50" aria-hidden="true" />
          <span
            title="TikTok"
            className={`inline-flex items-center transition-colors duration-200 cursor-pointer ${
              isTikTokUrlString(urlInput)
                ? 'text-cyan-400 scale-110'
                : 'hover:text-cyan-400 dark:hover:text-cyan-300'
            }`}
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3z" />
            </svg>
          </span>
          <span className="w-1 h-1 rounded-full bg-current opacity-50" aria-hidden="true" />
          <span
            title="X"
            className={`inline-flex items-center transition-colors duration-200 cursor-pointer ${
              isXUrlString(urlInput)
                ? 'text-sky-400 scale-110'
                : 'hover:text-sky-400 dark:hover:text-sky-300'
            }`}
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </span>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Loading Shimmer */}
        <AnimatePresence mode="wait">
          {inspecting && !media && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl p-4 bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 space-y-4 animate-pulse"
            >
              <div className="flex gap-4">
                <div className="w-28 h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </motion.div>
          )}

          {media && (
            <motion.div
              key={media.url}
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-4 sm:p-5 bg-zinc-50 dark:bg-[#0A0A0A] border border-black/15 dark:border-white/20 space-y-5"
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerError(null);
                    setShowPlayer((v) => !v);
                  }}
                  aria-label={
                    media.hasVideo === false
                      ? showPlayer
                        ? t.hideImage
                        : t.viewImage
                      : showPlayer
                        ? t.hidePlayer
                        : t.watchOnline
                  }
                  className="group relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center"
                >
                  {media.thumbnail && !imgFailed ? (
                    <img
                      src={media.thumbnail}
                      alt={media.title}
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black text-white/70">
                      {media.hasVideo === false ? <ImageIcon className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                    </div>
                  )}
                  <span className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition flex items-center justify-center">
                    <span className="w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow">
                      {media.hasVideo === false ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ms-0.5" />
                      )}
                    </span>
                  </span>
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-black dark:text-white line-clamp-2 leading-snug">
                      {media.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <span className="truncate max-w-[180px]">{media.author}</span>
                      {formatDuration(media.durationSeconds) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatDuration(media.durationSeconds)}
                          </span>
                        </>
                      )}
                      {media.hasVideo === false && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{t.imagePostLabel}</span>
                        </>
                      )}
                      {media.itemCount && media.itemCount > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {media.itemCount} {t.carouselZipLabel}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{jobStage === 'ready' ? t.readyInApp : t.readyToSave}</span>
                    </div>
                  </div>

                  {(media.hasVideo !== false || Boolean(media.thumbnail)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerError(null);
                        setUseYoutubeEmbed(false);
                        setShowPlayer((v) => !v);
                      }}
                      className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition active:scale-[0.98] ${
                        showPlayer
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                          : 'bg-white dark:bg-black text-black dark:text-white border-black/15 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40'
                      }`}
                    >
                      {media.hasVideo === false ? (
                        <ImageIcon className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {media.hasVideo === false
                          ? showPlayer
                            ? t.hideImage
                            : t.viewImage
                          : showPlayer
                            ? t.hidePlayer
                            : t.watchOnline}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Online Video Player or Image Preview */}
              {showPlayer && media.hasVideo === false && media.thumbnail && (
                <div className="rounded-xl overflow-hidden bg-black/95 border border-black/15 dark:border-white/20 flex items-center justify-center max-h-[420px]">
                  <img
                    src={media.thumbnail}
                    alt={media.title}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-[420px] object-contain"
                  />
                </div>
              )}

              {showPlayer && media.hasVideo !== false && (() => {
                const effectiveStreamQuality = isInstagramUrlString(media.url)
                  ? 'best'
                  : selectedQuality === 'audio'
                    ? '360p'
                    : selectedQuality;
                const matchingReadyJobId =
                  readyJob &&
                  readyJob.url === media.url &&
                  readyJob.quality === effectiveStreamQuality
                    ? readyJob.jobId
                    : '';
                const streamSrc = `${apiBase}/api/media/stream?url=${encodeURIComponent(
                  media.url
                )}&quality=${encodeURIComponent(effectiveStreamQuality)}${
                  selectedAudioFormatId ? `&audioFormatId=${encodeURIComponent(selectedAudioFormatId)}` : ''
                }${matchingReadyJobId ? `&jobId=${encodeURIComponent(matchingReadyJobId)}` : ''}${
                  playerRetryNonce > 0 ? `&_r=${playerRetryNonce}` : ''
                }`;
                const ytFallbackId = embedYoutubeId || extractClientYouTubeId(media.url);

                const handleVideoError = async () => {
                  let detail = '';
                  let ytIdFromServer: string | null = null;
                  try {
                    const probe = await fetch(streamSrc, {
                      headers: { Range: 'bytes=0-0' },
                    });
                    const ct = (probe.headers.get('content-type') || '').toLowerCase();
                    if (!probe.ok || ct.includes('application/json')) {
                      const body = (await probe.json()) as { error?: string; youtubeId?: string };
                      if (typeof body?.error === 'string' && body.error.trim()) {
                        detail = body.error.trim();
                      }
                      if (typeof body?.youtubeId === 'string' && /^[a-zA-Z0-9_-]{6,15}$/.test(body.youtubeId)) {
                        ytIdFromServer = body.youtubeId;
                      }
                    } else {
                      void probe.body?.cancel().catch(() => {});
                    }
                  } catch {
                    // Fall back to generic streamFailed message
                  }
                  if (ytIdFromServer) setEmbedYoutubeId(ytIdFromServer);
                  setPlayerError(detail ? `${t.streamFailed} (${detail})` : t.streamFailed);
                };

                const isVerticalVideo = Boolean(media.isVertical) || isYouTubeShortsUrlString(media.url);

                return (
                  <div className="rounded-xl overflow-hidden bg-black border border-black/15 dark:border-white/20">
                    {useYoutubeEmbed && ytFallbackId ? (
                      <iframe
                        key={`yt-embed-${ytFallbackId}`}
                        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytFallbackId)}?autoplay=1&rel=0`}
                        title={media.title}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        className={
                          isVerticalVideo
                            ? 'w-full max-w-[360px] mx-auto aspect-[9/16] max-h-[72vh] bg-black border-0 block'
                            : 'w-full aspect-video bg-black border-0'
                        }
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        key={`${media.url}|${effectiveStreamQuality}|${selectedAudioFormatId}|${playerRetryNonce}`}
                        src={streamSrc}
                        poster={media.thumbnail || undefined}
                        controls
                        playsInline
                        autoPlay
                        crossOrigin={selectedSubtitle ? 'anonymous' : undefined}
                        onLoadedData={() => setPlayerError(null)}
                        onCanPlay={() => setPlayerError(null)}
                        onLoadedMetadata={() => {
                          setPlayerError(null);
                          if (videoRef.current && resumeTimeRef.current > 0) {
                            try {
                              videoRef.current.currentTime = resumeTimeRef.current;
                            } catch {}
                            resumeTimeRef.current = 0;
                          }
                          if (videoRef.current && selectedSubtitle && videoRef.current.textTracks[0]) {
                            videoRef.current.textTracks[0].mode = 'showing';
                          }
                        }}
                        onError={() => void handleVideoError()}
                        className={
                          isVerticalVideo
                            ? 'w-full max-h-[72vh] bg-black object-contain'
                            : 'w-full aspect-video bg-black'
                        }
                      >
                        {selectedSubtitle && (
                          <track
                            key={`${selectedSubtitle.lang}-${selectedSubtitle.isAuto ? 'a' : 'm'}`}
                            kind="subtitles"
                            srcLang={selectedSubtitle.lang}
                            label={selectedSubtitle.label}
                            src={`${apiBase}/api/media/subtitle?url=${encodeURIComponent(
                              media.url
                            )}&lang=${encodeURIComponent(selectedSubtitle.lang)}&auto=${
                              selectedSubtitle.isAuto ? '1' : '0'
                            }`}
                            default
                          />
                        )}
                      </video>
                    )}
                    {playerError && !useYoutubeEmbed && (
                      <div className="px-3 py-2.5 text-xs text-red-300 bg-red-950/60 border-t border-red-900/50 flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 leading-relaxed">{playerError}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPlayerError(null);
                              setPlayerRetryNonce((n) => n + 1);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold transition"
                          >
                            {t.retryPlayback}
                          </button>
                          {ytFallbackId && (
                            <button
                              type="button"
                              onClick={() => {
                                setPlayerError(null);
                                setUseYoutubeEmbed(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition"
                            >
                              {t.youtubeEmbedFallback}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quality Selection (Video Resolutions Only - hidden for Social media direct downloads) */}
              {!isSocialMedia && availableQualities.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {t.selectQuality}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {availableQualities.map((q) => {
                    const meta = t.qualityLabels[q] || { label: q, sub: '' };
                    const active = !audioOnlyMode && selectedQuality === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleQualitySelect(q)}
                        className={`min-h-[52px] px-2 py-2 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition active:scale-[0.97] disabled:opacity-60 ${
                          active
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[0_0_18px_rgba(255,255,255,0.28)]'
                            : 'bg-white dark:bg-black text-black dark:text-white border-black/10 dark:border-white/15 hover:border-black/30 dark:hover:border-white/40'
                        }`}
                      >
                        <span className="text-xs font-bold font-mono tabular-nums whitespace-nowrap">
                          {meta.label}
                        </span>
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            active ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {meta.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Sectioned Audio Tracks & Audio-Only (MP3) Mode */}
              {(media.hasVideo !== false || (media.audioTracks && media.audioTracks.length > 0)) && (
              <div className="space-y-2.5 pt-1 border-t border-black/10 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{t.audioTracksSection}</span>
                    {media.audioTracks && media.audioTracks.length > 0 && (
                      <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                        ({media.audioTracks.length})
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setAudioOnlyMode((prev) => !prev);
                      if (readyJob) {
                        setJobStage('idle');
                        setReadyJob(null);
                        setSavedConfirmed(false);
                      }
                    }}
                    className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 ${
                      audioOnlyMode
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white dark:bg-black text-black dark:text-white border-black/15 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>{t.audioOnlyLabel}</span>
                  </button>
                </div>

                {audioOnlyMode && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {t.audioOnlyDesc}
                  </p>
                )}

                {media.audioTracks && media.audioTracks.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {media.audioTracks.map((track) => {
                      const active = selectedAudioFormatId === track.formatId;
                      return (
                        <button
                          key={track.formatId}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAudioTrackSelect(track.formatId)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border text-start flex flex-col justify-center gap-0.5 transition active:scale-[0.98] disabled:opacity-60 ${
                            active
                              ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                              : 'bg-white dark:bg-black text-black dark:text-white border-black/10 dark:border-white/15 hover:border-black/30 dark:hover:border-white/40'
                          }`}
                        >
                          <span className="text-xs font-semibold truncate w-full">{track.label}</span>
                          <span
                            className={`text-[10px] font-mono tabular-nums ${
                              active ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {track.language.toUpperCase()}
                            {track.abr ? ` · ${track.abr}k` : ` · ${track.ext.toUpperCase()}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              )}

              {/* Sectioned Subtitles (Manual Subtitles & Auto-Generated Captions) */}
              {((media.manualSubtitles && media.manualSubtitles.length > 0) ||
                (media.autoSubtitles && media.autoSubtitles.length > 0)) && (() => {
                const manualList = media.manualSubtitles || [];
                const autoList = media.autoSubtitles || [];
                const qFilter = subFilter.trim().toLowerCase();
                const filteredManual = qFilter
                  ? manualList.filter(
                      (s) => s.label.toLowerCase().includes(qFilter) || s.lang.toLowerCase().includes(qFilter)
                    )
                  : manualList;
                const filteredAuto = qFilter
                  ? autoList.filter(
                      (s) => s.label.toLowerCase().includes(qFilter) || s.lang.toLowerCase().includes(qFilter)
                    )
                  : autoList;
                const totalSubs = manualList.length + autoList.length;

                return (
                  <div className="space-y-3 pt-1 border-t border-black/10 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Captions className="w-3.5 h-3.5" />
                        <span>
                          {t.subtitlesSection} ({totalSubs})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSubtitle(null)}
                        className={`min-h-[36px] px-3 rounded-lg border text-xs font-semibold transition ${
                          selectedSubtitle === null
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                            : 'bg-white dark:bg-black text-zinc-600 dark:text-zinc-300 border-black/10 dark:border-white/15'
                        }`}
                      >
                        {t.subtitlesOff}
                      </button>
                    </div>

                    {totalSubs > 8 && (
                      <input
                        type="search"
                        value={subFilter}
                        onChange={(e) => setSubFilter(e.target.value)}
                        placeholder={t.filterLanguagesPlaceholder}
                        className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      />
                    )}

                    {/* Manual / Official Subtitles Sub-section */}
                    {manualList.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {t.manualSubtitlesLabel} ({filteredManual.length})
                        </div>
                        {filteredManual.length === 0 ? (
                          <p className="text-xs text-zinc-400">{t.noSubtitlesFound}</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredManual.map((sub) => {
                              const active =
                                selectedSubtitle?.lang === sub.lang && !selectedSubtitle.isAuto;
                              const subDownloadUrl = `${apiBase}/api/media/subtitle?url=${encodeURIComponent(
                                media.url
                              )}&lang=${encodeURIComponent(sub.lang)}&auto=0&download=1`;
                              return (
                                <div
                                  key={`m-${sub.lang}`}
                                  className={`flex items-center rounded-xl border overflow-hidden transition ${
                                    active
                                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                      : 'bg-white dark:bg-black text-black dark:text-white border-black/10 dark:border-white/15'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubtitle(sub);
                                      if (!showPlayer) setShowPlayer(true);
                                    }}
                                    className="flex-1 min-w-0 min-h-[44px] px-3 text-start flex items-center justify-between gap-2"
                                  >
                                    <span className="text-xs font-medium truncate">{sub.label}</span>
                                    <span
                                      className={`text-[10px] font-mono uppercase shrink-0 ${
                                        active ? 'opacity-80' : 'text-zinc-400'
                                      }`}
                                    >
                                      {sub.lang}
                                    </span>
                                  </button>
                                  <a
                                    href={subDownloadUrl}
                                    download={`subtitle_${sub.lang}.vtt`}
                                    aria-label={`${t.downloadSubtitle} (${sub.label})`}
                                    title={t.downloadSubtitle}
                                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center border-s transition ${
                                      active
                                        ? 'border-white/20 dark:border-black/20 hover:bg-white/10 dark:hover:bg-black/10'
                                        : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10'
                                    }`}
                                  >
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auto-Generated Captions Sub-section */}
                    {autoList.length > 0 && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowAutoSubs((v) => !v)}
                          className="w-full min-h-[40px] px-2 rounded-lg flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition"
                        >
                          <span>
                            {t.autoSubtitlesLabel} ({filteredAuto.length})
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              showAutoSubs || qFilter.length > 0 ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {(showAutoSubs || qFilter.length > 0) && (
                          filteredAuto.length === 0 ? (
                            <p className="text-xs text-zinc-400 px-2">{t.noSubtitlesFound}</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pe-1">
                              {filteredAuto.map((sub) => {
                                const active =
                                  selectedSubtitle?.lang === sub.lang && selectedSubtitle.isAuto;
                                const subDownloadUrl = `${apiBase}/api/media/subtitle?url=${encodeURIComponent(
                                  media.url
                                )}&lang=${encodeURIComponent(sub.lang)}&auto=1&download=1`;
                                return (
                                  <div
                                    key={`a-${sub.lang}`}
                                    className={`flex items-center rounded-xl border overflow-hidden transition ${
                                      active
                                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                        : 'bg-white dark:bg-black text-black dark:text-white border-black/10 dark:border-white/15'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubtitle(sub);
                                        if (!showPlayer) setShowPlayer(true);
                                      }}
                                      className="flex-1 min-w-0 min-h-[44px] px-3 text-start flex items-center justify-between gap-2"
                                    >
                                      <span className="text-xs font-medium truncate">{sub.label}</span>
                                      <span
                                        className={`text-[10px] font-mono uppercase shrink-0 ${
                                          active ? 'opacity-80' : 'text-zinc-400'
                                        }`}
                                      >
                                        {sub.lang}
                                      </span>
                                    </button>
                                    <a
                                      href={subDownloadUrl}
                                      download={`subtitle_${sub.lang}.vtt`}
                                      aria-label={`${t.downloadSubtitle} (${sub.label})`}
                                      title={t.downloadSubtitle}
                                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center border-s transition ${
                                        active
                                          ? 'border-white/20 dark:border-black/20 hover:bg-white/10 dark:hover:bg-black/10'
                                          : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10'
                                      }`}
                                    >
                                      <ArrowDownToLine className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Step 1 -> Step 2 Action Area */}
              <div className="space-y-2.5">
                {jobStage === 'ready' && readyJob ? (
                  <button
                    type="button"
                    onClick={() => triggerFileSaveFromSite(readyJob.jobId, readyJob.fileId)}
                    className={`w-full min-h-[54px] px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition active:scale-[0.98] ${
                      providerGlow === 'red'
                        ? 'bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.45)] hover:bg-red-500'
                        : providerGlow === 'instagram'
                          ? 'bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_0_28px_rgba(221,42,123,0.45)] hover:brightness-110'
                          : providerGlow === 'tiktok'
                            ? 'bg-gradient-to-r from-[#25f4ee] via-[#fe2c55] to-[#25f4ee] text-black dark:text-white shadow-[0_0_28px_rgba(37,244,238,0.45)] hover:brightness-110'
                            : providerGlow === 'x'
                              ? 'bg-gradient-to-r from-[#1da1f2] via-[#00b4d8] to-[#1da1f2] text-white shadow-[0_0_28px_rgba(29,161,242,0.45)] hover:brightness-110'
                              : 'bg-black text-white dark:bg-white dark:text-black shadow-[0_0_24px_rgba(255,255,255,0.35)] hover:opacity-90'
                    }`}
                  >
                    {savedConfirmed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <ArrowDownToLine className="w-5 h-5" />
                    )}
                    <span>
                      {savedConfirmed ? t.savedToDevice : t.saveFromSite}
                      {readyJob.sizeBytes > 0 ? ` (${formatBytes(readyJob.sizeBytes)})` : ''}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      startAppDownload(
                        media.url,
                        media.title,
                        effectiveDownloadQuality,
                        media.thumbnail,
                        media.author,
                        selectedAudioFormatId || undefined
                      )
                    }
                    className={`w-full min-h-[54px] px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-80 ${
                      providerGlow === 'red'
                        ? 'bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.45)] hover:bg-red-500'
                        : providerGlow === 'instagram'
                          ? 'bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-[0_0_28px_rgba(221,42,123,0.45)] hover:brightness-110'
                          : providerGlow === 'tiktok'
                            ? 'bg-gradient-to-r from-[#25f4ee] via-[#fe2c55] to-[#25f4ee] text-black dark:text-white shadow-[0_0_28px_rgba(37,244,238,0.45)] hover:brightness-110'
                            : providerGlow === 'x'
                              ? 'bg-gradient-to-r from-[#1da1f2] via-[#00b4d8] to-[#1da1f2] text-white shadow-[0_0_28px_rgba(29,161,242,0.45)] hover:brightness-110'
                              : 'bg-black text-white dark:bg-white dark:text-black shadow-[0_0_24px_rgba(255,255,255,0.3)] hover:opacity-90'
                    }`}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono tabular-nums">
                          {jobStage === 'processing' ? t.processingMedia : t.downloadingToApp}{' '}
                          {jobProgress}%{jobBytes > 0 ? ` · ${formatBytes(jobBytes)}` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <CloudDownload className="w-5 h-5" />
                        <span>{t.prepareDownload}</span>
                      </>
                    )}
                  </button>
                )}

                {jobStage === 'ready' && readyJob && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyReadyDownloadLink}
                      className="flex-1 min-h-[44px] px-3 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      {linkCopied ? <Check className="w-4 h-4 shrink-0" /> : <Link2 className="w-4 h-4 shrink-0" />}
                      <span>{linkCopied ? t.linkCopied : t.copyDownloadLink}</span>
                    </button>
                    {isTelegramReady && (
                      <span className="min-h-[44px] px-3 rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05] text-[11px] font-medium text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 shrink-0" />
                        <span>Telegram</span>
                      </span>
                    )}
                  </div>
                )}

                {isBusy && (
                  <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
                    <motion.div
                      initial={{ width: '4%' }}
                      animate={{ width: `${jobProgress}%` }}
                      transition={{ duration: 0.2 }}
                      className={`h-full rounded-full ${
                        providerGlow === 'red'
                          ? 'bg-red-500'
                          : providerGlow === 'instagram'
                            ? 'bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af]'
                            : providerGlow === 'tiktok'
                              ? 'bg-gradient-to-r from-[#25f4ee] via-[#fe2c55] to-[#25f4ee]'
                              : providerGlow === 'x'
                                ? 'bg-gradient-to-r from-[#1da1f2] via-[#00b4d8] to-[#1da1f2]'
                                : 'bg-black dark:bg-white'
                      }`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Admin Logs (above History) + Saved History */}
      <div className="lg:col-span-5 space-y-6">
        {isAdmin && (
          <div className="rounded-2xl backdrop-blur-2xl backdrop-saturate-150 bg-white/60 dark:bg-white/[0.05] border border-black/10 dark:border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.14)] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-black dark:text-white shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-black dark:text-white truncate">
                  {t.adminLogsTitle}
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                  ({filteredAdminLogs.length})
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdminLogsPaused((prev) => !prev)}
                  title={adminLogsPaused ? t.adminLogsResume : t.adminLogsPause}
                  aria-label={adminLogsPaused ? t.adminLogsResume : t.adminLogsPause}
                  className={`h-8 px-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                    adminLogsPaused
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {adminLogsPaused ? (
                    <Play className="w-3 h-3" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                  <span>{adminLogsPaused ? t.adminLogsPause : t.adminLogsResume}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyAdminLogs}
                  disabled={filteredAdminLogs.length === 0}
                  title={adminLogsCopied ? t.adminLogsCopied : t.adminLogsCopy}
                  aria-label={adminLogsCopied ? t.adminLogsCopied : t.adminLogsCopy}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 transition active:scale-95"
                >
                  {adminLogsCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => void fetchAdminLogs(false)}
                  title={t.adminLogsRefresh}
                  aria-label={t.adminLogsRefresh}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLogsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearAdminLogs()}
                  title={t.adminLogsClear}
                  aria-label={t.adminLogsClear}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/5 dark:border-white/10">
              {(
                [
                  { id: 'all', label: t.adminLogsAll },
                  { id: 'info', label: t.adminLogsInfo },
                  { id: 'warn', label: t.adminLogsWarn },
                  { id: 'error', label: t.adminLogsError },
                ] as const
              ).map((tab) => {
                const active = adminLogLevel === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAdminLogLevel(tab.id)}
                    className={`h-7 rounded-lg text-[11px] font-semibold transition ${
                      active
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div
              ref={adminLogBoxRef}
              onScroll={handleAdminLogScroll}
              dir="ltr"
              className="h-64 overflow-y-auto rounded-xl bg-zinc-950/90 dark:bg-black/60 border border-black/15 dark:border-white/10 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 space-y-1.5 text-left"
            >
              {filteredAdminLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-sans">
                  {t.adminLogsEmpty}
                </div>
              ) : (
                filteredAdminLogs.map((entry) => {
                  const timeStr = entry.timestamp.length >= 19 ? entry.timestamp.slice(11, 19) : entry.timestamp;
                  const levelCls =
                    entry.level === 'error'
                      ? 'text-red-400 bg-red-500/15 border-red-500/30'
                      : entry.level === 'warn'
                        ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                        : 'text-sky-300 bg-sky-500/15 border-sky-500/30';
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 border-b border-white/[0.05] pb-1 last:border-b-0 last:pb-0 break-words"
                    >
                      <span className="text-zinc-500 tabular-nums shrink-0">{timeStr}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 ${levelCls}`}
                      >
                        {entry.level}
                      </span>
                      <span className="text-zinc-400 shrink-0">[{entry.source}]</span>
                      <span
                        className={`min-w-0 flex-1 whitespace-pre-wrap break-all ${
                          entry.level === 'error'
                            ? 'text-red-200'
                            : entry.level === 'warn'
                              ? 'text-amber-100'
                              : 'text-zinc-200'
                        }`}
                      >
                        {entry.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl backdrop-blur-2xl backdrop-saturate-150 bg-white/60 dark:bg-white/[0.05] border border-black/10 dark:border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.14)] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-black dark:text-white">
              {t.recentSaves}
            </h2>
            <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              {history.length} {t.itemsCount}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-black/5 dark:bg-white/10 mx-auto flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-black dark:text-white">
                {t.emptySavesTitle}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                {isGuest ? t.emptySavesDescGuest : t.emptySavesDesc}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {history.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-900 shrink-0 flex items-center justify-center">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-black dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                      <span>{t.qualityLabels[item.quality]?.label || item.quality}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(item.sizeBytes)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.savedAt}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHistoryDownload(item)}
                    aria-label={t.reDownload}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
