import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  Captions,
  Check,
  ChevronDown,
  ClipboardPaste,
  CloudDownload,
  Film,
  Link2,
  Loader2,
  Music,
  Play,
  Search,
  Send,
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

export interface MediaMetadata {
  url: string;
  title: string;
  author: string;
  durationSeconds: number | null;
  thumbnail: string | null;
  providerGlow: 'red' | 'default';
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

interface DownloaderViewProps {
  t: TranslationDict;
  apiBase: string;
  defaultQuality: string;
  history: SavedItem[];
  onAddHistory: (item: SavedItem) => void;
  onYouTubeGlowChange: (isRed: boolean) => void;
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
  onYouTubeGlowChange,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeTimeRef = useRef<number>(0);

  const lastInspectedRef = useRef<string>('');
  const pollTimerRef = useRef<number | null>(null);

  const isRedGlow = isYouTubeUrlString(urlInput) || media?.providerGlow === 'red';

  useEffect(() => {
    onYouTubeGlowChange(isRedGlow);
  }, [isRedGlow, onYouTubeGlowChange]);

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

    if (lastInspectedRef.current === normalized && media) return;
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
        setMedia({
          url: normalized,
          title: data.title,
          author: data.author,
          durationSeconds: data.durationSeconds,
          thumbnail: data.thumbnail,
          providerGlow: data.providerGlow === 'red' ? 'red' : 'default',
          qualities: filteredQualities.length ? filteredQualities : ['1080p', '720p', '480p', '360p'],
          engineMode: data.engineMode,
          audioTracks,
          manualSubtitles,
          autoSubtitles,
        });
      }
    } catch {
      setErrorMsg(t.inspectFailed);
      setMedia(null);
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
      if (text) {
        setUrlInput(text.trim());
        await inspectUrl(text.trim());
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

  const triggerFileSaveFromSite = (jobId: string, fileId?: string | null) => {
    const link = document.createElement('a');
    link.href = fileId
      ? `${apiBase}/api/download/${encodeURIComponent(fileId)}`
      : `${apiBase}/api/media/files/${encodeURIComponent(jobId)}`;
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
    const nextQuality = item.quality === 'audio' ? '1080p' : item.quality;
    setUrlInput(item.url);
    setSelectedQuality(nextQuality);
    setAudioOnlyMode(item.quality === 'audio');
    startAppDownload(item.url, item.title, item.quality, item.thumbnail, item.author);
  };

  const handleSubmitInspect = (e: React.FormEvent) => {
    e.preventDefault();
    inspectUrl(urlInput);
  };

  const availableQualities = (media?.qualities || ['2160p', '1080p', '720p', '480p', '360p']).filter(
    (q) => q !== 'audio'
  );
  const effectiveDownloadQuality = audioOnlyMode ? 'audio' : selectedQuality;
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

        {/* Link Input Card with Dynamic White / Red Neon Aura */}
        <form onSubmit={handleSubmitInspect} className="relative">
          <div
            aria-hidden="true"
            className={`absolute -inset-2 rounded-3xl blur-2xl transition-all duration-500 pointer-events-none ${
              isRedGlow
                ? 'bg-red-600/35 dark:bg-red-600/45 opacity-100 scale-[1.01]'
                : 'bg-black/5 dark:bg-white/20 opacity-85'
            }`}
          />

          <div
            className={`relative rounded-2xl p-3 bg-white dark:bg-[#080808] transition-all duration-300 ${
              isRedGlow ? 'neon-red-box' : 'neon-white-box'
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
                  aria-label={showPlayer ? t.hidePlayer : t.watchOnline}
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
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition flex items-center justify-center">
                    <span className="w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow">
                      <Play className="w-4 h-4 fill-current ms-0.5" />
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
                      <span aria-hidden="true">·</span>
                      <span>{jobStage === 'ready' ? t.readyInApp : t.readyToSave}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayerError(null);
                      setShowPlayer((v) => !v);
                    }}
                    className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition active:scale-[0.98] ${
                      showPlayer
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white dark:bg-black text-black dark:text-white border-black/15 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{showPlayer ? t.hidePlayer : t.watchOnline}</span>
                  </button>
                </div>
              </div>

              {/* Inline Online Video Player */}
              {showPlayer && (
                <div className="rounded-xl overflow-hidden bg-black border border-black/15 dark:border-white/20">
                  <video
                    ref={videoRef}
                    key={`${media.url}|${selectedQuality}|${selectedAudioFormatId}`}
                    src={`${apiBase}/api/media/stream?url=${encodeURIComponent(media.url)}&quality=${encodeURIComponent(
                      selectedQuality === 'audio' ? '360p' : selectedQuality
                    )}${selectedAudioFormatId ? `&audioFormatId=${encodeURIComponent(selectedAudioFormatId)}` : ''}`}
                    poster={media.thumbnail || undefined}
                    controls
                    playsInline
                    autoPlay
                    crossOrigin="anonymous"
                    onLoadedMetadata={() => {
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
                    onError={() => setPlayerError(t.downloadFailed)}
                    className="w-full aspect-video bg-black"
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
                  {playerError && (
                    <div className="px-3 py-2 text-xs text-red-400 bg-red-950/50 border-t border-red-900/50">
                      {playerError}
                    </div>
                  )}
                </div>
              )}

              {/* Quality Selection (Video Resolutions Only) */}
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

              {/* Sectioned Audio Tracks & Audio-Only (MP3) Mode */}
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
                      isRedGlow
                        ? 'bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.45)] hover:bg-red-500'
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
                      isRedGlow
                        ? 'bg-red-600 text-white shadow-[0_0_28px_rgba(220,38,38,0.45)] hover:bg-red-500'
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
                        isRedGlow ? 'bg-red-500' : 'bg-black dark:bg-white'
                      }`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Saved History Column */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 sm:p-5 space-y-4">
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
                {t.emptySavesDesc}
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
                      <span>{item.quality}</span>
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
