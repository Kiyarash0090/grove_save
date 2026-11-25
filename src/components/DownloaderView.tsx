import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  Check,
  ClipboardPaste,
  CloudDownload,
  Film,
  Loader2,
  Music,
  Search,
  X,
} from 'lucide-react';
import type { TranslationDict } from '../i18n';

export interface MediaMetadata {
  url: string;
  title: string;
  author: string;
  durationSeconds: number | null;
  thumbnail: string | null;
  providerGlow: 'red' | 'default';
  qualities: string[];
  engineMode?: 'live' | 'preview';
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

  const [imgFailed, setImgFailed] = useState(false);
  const lastInspectedRef = useRef<string>('');
  const pollTimerRef = useRef<number | null>(null);

  const isRedGlow = isYouTubeUrlString(urlInput) || media?.providerGlow === 'red';

  useEffect(() => {
    onYouTubeGlowChange(isRedGlow);
  }, [isRedGlow, onYouTubeGlowChange]);

  useEffect(() => {
    setSelectedQuality(defaultQuality);
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
        setMedia({
          url: normalized,
          title: data.title,
          author: data.author,
          durationSeconds: data.durationSeconds,
          thumbnail: data.thumbnail,
          providerGlow: data.providerGlow === 'red' ? 'red' : 'default',
          qualities: Array.isArray(data.qualities)
            ? data.qualities
            : ['2160p', '1080p', '720p', '480p', '360p', 'audio'],
          engineMode: data.engineMode,
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
    setSelectedQuality(q);
    if (readyJob && readyJob.quality !== q) {
      setJobStage('idle');
      setReadyJob(null);
      setSavedConfirmed(false);
    }
  };

  const startAppDownload = async (
    targetUrl: string,
    title: string,
    quality: string,
    thumb: string | null,
    author: string
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
        body: JSON.stringify({ url: targetUrl, quality, title }),
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

  const triggerFileSaveFromSite = (jobId: string) => {
    const link = document.createElement('a');
    link.href = `${apiBase}/api/media/files/${encodeURIComponent(jobId)}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSavedConfirmed(true);
  };

  const handleHistoryDownload = async (item: SavedItem) => {
    if (item.jobId) {
      try {
        const check = await fetch(`${apiBase}/api/media/jobs/${encodeURIComponent(item.jobId)}`);
        if (check.ok) {
          const data = (await check.json()) as { status?: string };
          if (data.status === 'ready') {
            triggerFileSaveFromSite(item.jobId);
            return;
          }
        }
      } catch {
        // Re-prepare below if expired
      }
    }
    setUrlInput(item.url);
    setSelectedQuality(item.quality);
    startAppDownload(item.url, item.title, item.quality, item.thumbnail, item.author);
  };

  const handleSubmitInspect = (e: React.FormEvent) => {
    e.preventDefault();
    inspectUrl(urlInput);
  };

  const availableQualities = media?.qualities || ['2160p', '1080p', '720p', '480p', '360p', 'audio'];
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
                <div className="w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center">
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
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-sm sm:text-base font-bold text-black dark:text-white line-clamp-2 leading-snug">
                    {media.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
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
              </div>

              {/* Quality Selection */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {t.selectQuality}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availableQualities.map((q) => {
                    const meta = t.qualityLabels[q] || { label: q, sub: '' };
                    const active = selectedQuality === q;
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
                        <span className="text-xs font-bold font-mono tabular-nums whitespace-nowrap flex items-center gap-1">
                          {q === 'audio' && <Music className="w-3 h-3" />}
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

              {/* Step 1 -> Step 2 Action Area */}
              <div className="space-y-2.5">
                {jobStage === 'ready' && readyJob ? (
                  <button
                    type="button"
                    onClick={() => triggerFileSaveFromSite(readyJob.jobId)}
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
                        selectedQuality,
                        media.thumbnail,
                        media.author
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
