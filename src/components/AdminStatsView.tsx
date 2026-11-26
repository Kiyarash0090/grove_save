import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Cpu,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Users,
} from 'lucide-react';
import type { TranslationDict } from '../i18n';

export interface AdminStatsPayload {
  generatedAt: number;
  overview: {
    totalUsers: number;
    adminUsers: number;
    regularUsers: number;
    googleUsers: number;
    emailUsers: number;
    newUsers24h: number;
    newUsers7d: number;
    newUsers30d: number;
    activeSessions: number;
    expiredSessions: number;
    totalSavedHistoryItems: number;
    totalSavedHistoryBytes: number;
    uniqueSavedUrls: number;
    telegramActiveFiles: number;
    telegramActiveBytes: number;
    telegramDeletedFiles: number;
    announcementsCount: number;
    eventsTotal: number;
    inspectsTotal: number;
    downloadsStarted: number;
    downloadsCompleted: number;
    downloadErrors: number;
    streamsTotal: number;
    completedBytes: number;
    events24h: number;
    downloads24h: number;
    downloads7d: number;
    downloads30d: number;
    guestEvents: number;
    registeredEvents: number;
  };
  platforms: Array<{
    platform: string;
    historyCount: number;
    historyBytes: number;
    telegramCount: number;
    telegramBytes: number;
    inspectCount: number;
    downloadCount: number;
    errorCount: number;
  }>;
  qualities: Array<{
    quality: string;
    count: number;
    totalBytes: number;
  }>;
  dailyActivity: Array<{
    date: string;
    inspects: number;
    downloads: number;
    errors: number;
    newUsers: number;
    historySaved: number;
  }>;
  userPreferences: {
    languages: Record<string, number>;
    themes: Record<string, number>;
    defaultQualities: Record<string, number>;
  };
  recentUsers: Array<{
    id: string;
    displayName: string;
    email: string;
    provider: string;
    role: string;
    language: string;
    theme: string;
    defaultQuality: string;
    historyCount: number;
    createdAt: number;
    updatedAt: number;
  }>;
  recentDownloads: Array<{
    id: string;
    title: string;
    author: string;
    platform: string;
    quality: string;
    sizeBytes: number;
    savedAt: string;
    createdAt: number;
    userEmail: string | null;
    userDisplayName: string | null;
  }>;
  liveJobs: {
    total: number;
    downloading: number;
    processing: number;
    ready: number;
    error: number;
    cancelled: number;
    items: Array<{
      id: string;
      title: string;
      platform: string;
      quality: string;
      ext: string;
      status: string;
      progress: number;
      downloadedBytes: number;
      totalBytes: number | null;
      createdAt: number;
    }>;
  };
  storageAndCache: {
    dbFileBytes: number;
    dbWalBytes: number;
    cacheDirFiles: number;
    cacheDirBytes: number;
    ytDlpCacheFiles: number;
    ytDlpCacheBytes: number;
    backupFiles: number;
    backupBytes: number;
    memoryCaches: {
      youtubeInspect: number;
      youtubeRawInfo: number;
      youtubeSubtitle: number;
      streamResolve: number;
      instagramInfo: number;
      pinterestResolve: number;
      telegramResolved: number;
    };
  };
  services: {
    xray: {
      enabled: boolean;
      running: boolean;
      profilesCount: number;
      testedOkCount: number;
      activeProfileName: string | null;
      lastError: string | null;
    };
    potProvider: {
      enabled: boolean;
      mode: string;
      running: boolean;
      installed: boolean;
      denoInstalled: boolean;
    };
    telegram: {
      enabled: boolean;
      uploadEnabled: boolean;
      mode: string;
      signedIn: boolean;
      account: string | null;
      channel: string;
      lastError: string | null;
    };
    youtubeCookiesConfigured: boolean;
    logs: {
      total: number;
      info: number;
      warn: number;
      error: number;
    };
  };
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    osTotalMemBytes: number;
    osFreeMemBytes: number;
    cpuCount: number;
    loadAvg1m: number;
  };
}

interface AdminStatsViewProps {
  t: TranslationDict;
  stats: AdminStatsPayload | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

function formatDateShort(ts: number, locale: string): string {
  if (!ts) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  pinterest: 'Pinterest',
  telegram: 'Telegram',
  other: 'Other',
};

const LANG_LABELS: Record<string, string> = {
  fa: 'فارسی',
  en: 'English',
  ru: 'Русский',
  zh: '中文',
};

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({
  t,
  stats,
  loading,
  error,
  onBack,
  onRefresh,
}) => {
  const [userSearch, setUserSearch] = useState('');
  const [downloadSearch, setDownloadSearch] = useState('');

  const BackArrowIcon = t.dir === 'rtl' ? ArrowRight : ArrowLeft;
  const locale = t.dir === 'rtl' ? 'fa-IR' : 'en-US';
  const numFmt = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmtNum = (n: number) => numFmt.format(Math.max(0, Math.round(n || 0)));

  const themeLabels: Record<string, string> = useMemo(
    () => ({
      dark: t.themeBlack,
      light: t.themeWhite,
      spring: t.themeSpring,
      summer: t.themeSummer,
      autumn: t.themeAutumn,
      winter: t.themeWinter,
      shiraz: t.themeShiraz,
      pastelDark: t.themePastelDark,
    }),
    [t]
  );

  const filteredUsers = useMemo(() => {
    if (!stats) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return stats.recentUsers;
    return stats.recentUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.provider.toLowerCase().includes(q)
    );
  }, [stats, userSearch]);

  const filteredDownloads = useMemo(() => {
    if (!stats) return [];
    const q = downloadSearch.trim().toLowerCase();
    if (!q) return stats.recentDownloads;
    return stats.recentDownloads.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.platform.toLowerCase().includes(q) ||
        d.quality.toLowerCase().includes(q) ||
        (d.userEmail || '').toLowerCase().includes(q)
    );
  }, [stats, downloadSearch]);

  const dailyPeak = useMemo(() => {
    if (!stats) return 1;
    let max = 1;
    for (const day of stats.dailyActivity) {
      const total = day.inspects + day.downloads + day.historySaved;
      if (total > max) max = total;
    }
    return max;
  }, [stats]);

  const platformGrandTotal = useMemo(() => {
    if (!stats) return 1;
    const sum = stats.platforms.reduce(
      (acc, p) => acc + p.historyCount + p.downloadCount + p.inspectCount + p.telegramCount,
      0
    );
    return Math.max(1, sum);
  }, [stats]);

  const qualityGrandTotal = useMemo(() => {
    if (!stats) return 1;
    return Math.max(
      1,
      stats.qualities.reduce((acc, q) => acc + q.count, 0)
    );
  }, [stats]);

  return (
    <div className="max-w-4xl mx-auto pb-28 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-[#0A0A0A] text-black dark:text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
        >
          <BackArrowIcon className="w-4 h-4 shrink-0" />
          <span>{t.backToSettings}</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 shrink-0" />
          )}
          <span>{t.statsRefreshBtn}</span>
        </button>
      </div>

      {/* Page Heading */}
      <div className="px-1">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.sectionAdmin}</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 shrink-0" />
            <span>{t.adminStatsSection}</span>
          </h1>
          {stats && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {t.statsLastUpdated}: {formatDateShort(stats.generatedAt, locale)}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t.adminStatsDesc}</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[40px] px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition whitespace-nowrap"
          >
            {t.statsRetryBtn}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !stats && (
        <div className="space-y-4">
          <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <div className="h-3 w-20 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-7 w-16 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-3 w-28 rounded bg-black/10 dark:bg-white/10" />
              </div>
            ))}
          </div>
          <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 h-44 animate-pulse" />
        </div>
      )}

      {stats && (
        <>
          {/* 1. Overview Key Metrics */}
          <section aria-labelledby="stats-overview-heading">
            <h2
              id="stats-overview-heading"
              className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
            >
              {t.statsOverviewHeading}
            </h2>
            <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px sm:bg-black/10 sm:dark:bg-white/10 overflow-hidden">
              {/* Users */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsUsersTotal}</span>
                  <Users className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {fmtNum(stats.overview.totalUsers)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsAdminsCount}: {fmtNum(stats.overview.adminUsers)} · Google:{' '}
                  {fmtNum(stats.overview.googleUsers)} · Email: {fmtNum(stats.overview.emailUsers)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsNew24h}: +{fmtNum(stats.overview.newUsers24h)} · {t.statsNew7d}: +
                  {fmtNum(stats.overview.newUsers7d)} · {t.statsNew30d}: +{fmtNum(stats.overview.newUsers30d)}
                </div>
              </div>

              {/* Active Sessions */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsActiveSessions}</span>
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {fmtNum(stats.overview.activeSessions)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsRegisteredEvents}: {fmtNum(stats.overview.registeredEvents)} · {t.statsGuestEvents}:{' '}
                  {fmtNum(stats.overview.guestEvents)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsAnnouncementsLabel}: {fmtNum(stats.overview.announcementsCount)}
                </div>
              </div>

              {/* Saved History */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsSavedDownloads}</span>
                  <Download className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {fmtNum(stats.overview.totalSavedHistoryItems)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {formatBytes(stats.overview.totalSavedHistoryBytes)} · {t.statsUniqueLinks}:{' '}
                  {fmtNum(stats.overview.uniqueSavedUrls)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsCompletedCount}: {fmtNum(stats.overview.downloadsCompleted)} (
                  {formatBytes(stats.overview.completedBytes)})
                </div>
              </div>

              {/* Tracked Activity */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsTrackedEvents}</span>
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {fmtNum(stats.overview.eventsTotal)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsInspectsCount}: {fmtNum(stats.overview.inspectsTotal)} · {t.statsStreamsCount}:{' '}
                  {fmtNum(stats.overview.streamsTotal)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsNew24h}: {fmtNum(stats.overview.events24h)} · {t.statsErrorsCount}:{' '}
                  {fmtNum(stats.overview.downloadErrors)}
                </div>
              </div>

              {/* Telegram Storage */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsTelegramStorage}</span>
                  <Server className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {fmtNum(stats.overview.telegramActiveFiles)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {formatBytes(stats.overview.telegramActiveBytes)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsNew24h}: {fmtNum(stats.overview.downloads24h)} · {t.statsNew7d}:{' '}
                  {fmtNum(stats.overview.downloads7d)} · {t.statsNew30d}: {fmtNum(stats.overview.downloads30d)}
                </div>
              </div>

              {/* Database & Disk Cache */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t.statsStorageHeading}</span>
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-mono">
                  {formatBytes(
                    stats.storageAndCache.dbFileBytes +
                      stats.storageAndCache.cacheDirBytes +
                      stats.storageAndCache.ytDlpCacheBytes
                  )}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  DB: {formatBytes(stats.storageAndCache.dbFileBytes)} · {t.statsCacheDirLabel}:{' '}
                  {formatBytes(stats.storageAndCache.cacheDirBytes)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {t.statsBackupsLabel}: {fmtNum(stats.storageAndCache.backupFiles)} (
                  {formatBytes(stats.storageAndCache.backupBytes)})
                </div>
              </div>
            </div>
          </section>

          {/* 2. 14-Day Daily Activity Chart */}
          <section aria-labelledby="stats-daily-heading">
            <div className="px-4 pb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="stats-daily-heading"
                className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t.statsDailyActivityHeading}
              </h2>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t.statsDailyActivityDesc}
              </span>
            </div>
            <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span>{t.statsCompletedCount}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/75 inline-block" />
                  <span>{t.statsInspectsCount}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 inline-block" />
                  <span>{t.statsSavedDownloads}</span>
                </span>
              </div>

              <div className="grid grid-cols-14 gap-1.5 sm:gap-2 items-end h-36 pt-3">
                {stats.dailyActivity.map((day) => {
                  const totalDay = day.downloads + day.inspects + day.historySaved;
                  const dlH = Math.round((day.downloads / dailyPeak) * 100);
                  const insH = Math.round((day.inspects / dailyPeak) * 100);
                  const histH = Math.round((day.historySaved / dailyPeak) * 100);
                  return (
                    <div
                      key={day.date}
                      title={`${day.date} · ${t.statsCompletedCount}: ${day.downloads} · ${t.statsInspectsCount}: ${day.inspects} · ${t.statsSavedDownloads}: ${day.historySaved}`}
                      className="flex flex-col items-center justify-end h-full gap-1 group"
                    >
                      <span className="text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {totalDay > 0 ? totalDay : ''}
                      </span>
                      <div className="w-full flex-1 flex items-end justify-center gap-0.5 rounded-t bg-black/[0.04] dark:bg-white/[0.04] p-0.5">
                        {day.downloads > 0 && (
                          <div
                            className="flex-1 bg-emerald-500 rounded-t-sm min-h-[3px]"
                            style={{ height: `${Math.max(4, dlH)}%` }}
                          />
                        )}
                        {day.inspects > 0 && (
                          <div
                            className="flex-1 bg-sky-500/80 rounded-t-sm min-h-[3px]"
                            style={{ height: `${Math.max(4, insH)}%` }}
                          />
                        )}
                        {day.historySaved > 0 && (
                          <div
                            className="flex-1 bg-amber-500/80 rounded-t-sm min-h-[3px]"
                            style={{ height: `${Math.max(4, histH)}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Platforms & Qualities Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section aria-labelledby="stats-platforms-heading">
              <h2
                id="stats-platforms-heading"
                className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t.statsPlatformsHeading}
              </h2>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 overflow-hidden">
                {stats.platforms.map((item) => {
                  const totalItem =
                    item.historyCount + item.downloadCount + item.inspectCount + item.telegramCount;
                  const pct = Math.round((totalItem / platformGrandTotal) * 100);
                  const totalBytes = item.historyBytes + item.telegramBytes;
                  return (
                    <div key={item.platform} className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-black dark:text-white">
                          {PLATFORM_LABELS[item.platform] || item.platform}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
                          {fmtNum(totalItem)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-black dark:bg-white transition-all"
                          style={{ width: `${Math.max(totalItem > 0 ? 3 : 0, pct)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {t.statsSavedDownloads}: {fmtNum(item.historyCount)} · {t.statsInspectsCount}:{' '}
                        {fmtNum(item.inspectCount)} · {t.statsCompletedCount}: {fmtNum(item.downloadCount)}
                        {totalBytes > 0 ? ` · ${formatBytes(totalBytes)}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="stats-qualities-heading">
              <h2
                id="stats-qualities-heading"
                className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
              >
                {t.statsQualitiesHeading}
              </h2>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 overflow-hidden">
                {stats.qualities.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {t.statsEmptyList}
                  </div>
                ) : (
                  stats.qualities.slice(0, 8).map((q) => {
                    const pct = Math.round((q.count / qualityGrandTotal) * 100);
                    return (
                      <div key={q.quality} className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-semibold text-black dark:text-white font-mono">
                            {q.quality}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
                            {fmtNum(q.count)} ({pct}%)
                            {q.totalBytes > 0 ? ` · ${formatBytes(q.totalBytes)}` : ''}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.max(q.count > 0 ? 3 : 0, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* 4. User Preferences Breakdown */}
          <section aria-labelledby="stats-prefs-heading">
            <h2
              id="stats-prefs-heading"
              className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
            >
              {t.statsPreferencesHeading}
            </h2>
            <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:gap-px md:bg-black/10 md:dark:bg-white/10 overflow-hidden">
              {/* Languages */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-2">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t.statsLanguagesLabel}
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(stats.userPreferences.languages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count]) => (
                      <div key={code} className="flex items-center justify-between text-xs">
                        <span className="text-black dark:text-white">{LANG_LABELS[code] || code}</span>
                        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          {fmtNum(count)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(stats.userPreferences.languages).length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.statsEmptyList}</p>
                  )}
                </div>
              </div>

              {/* Themes */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-2">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t.statsThemesLabel}
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(stats.userPreferences.themes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-black dark:text-white">{themeLabels[key] || key}</span>
                        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          {fmtNum(count)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(stats.userPreferences.themes).length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.statsEmptyList}</p>
                  )}
                </div>
              </div>

              {/* Default Qualities */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0A0A0A] space-y-2">
                <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t.statsDefaultQualitiesLabel}
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(stats.userPreferences.defaultQualities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([qual, count]) => (
                      <div key={qual} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-black dark:text-white">{qual}</span>
                        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          {fmtNum(count)}
                        </span>
                      </div>
                    ))}
                  {Object.keys(stats.userPreferences.defaultQualities).length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.statsEmptyList}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 5. Storage, Services & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storage & Caches */}
            <section aria-labelledby="stats-storage-detail">
              <h2
                id="stats-storage-detail"
                className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{t.statsStorageHeading}</span>
              </h2>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 overflow-hidden text-xs">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.statsDatabaseLabel}</span>
                  <span className="font-mono tabular-nums text-black dark:text-white font-semibold">
                    {formatBytes(stats.storageAndCache.dbFileBytes)} (+
                    {formatBytes(stats.storageAndCache.dbWalBytes)} WAL)
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.statsCacheDirLabel}</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {fmtNum(stats.storageAndCache.cacheDirFiles)} files ·{' '}
                    {formatBytes(stats.storageAndCache.cacheDirBytes)}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.statsYtDlpCacheLabel}</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {fmtNum(stats.storageAndCache.ytDlpCacheFiles)} files ·{' '}
                    {formatBytes(stats.storageAndCache.ytDlpCacheBytes)}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.statsBackupsLabel}</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {fmtNum(stats.storageAndCache.backupFiles)} ·{' '}
                    {formatBytes(stats.storageAndCache.backupBytes)}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-1">
                  <div className="text-zinc-600 dark:text-zinc-300">{t.statsMemoryCachesLabel}</div>
                  <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    YT Inspect: {stats.storageAndCache.memoryCaches.youtubeInspect} · YT Info:{' '}
                    {stats.storageAndCache.memoryCaches.youtubeRawInfo} · Stream:{' '}
                    {stats.storageAndCache.memoryCaches.streamResolve} · Subtitles:{' '}
                    {stats.storageAndCache.memoryCaches.youtubeSubtitle} · IG:{' '}
                    {stats.storageAndCache.memoryCaches.instagramInfo} · Pin:{' '}
                    {stats.storageAndCache.memoryCaches.pinterestResolve} · TG:{' '}
                    {stats.storageAndCache.memoryCaches.telegramResolved}
                  </div>
                </div>
              </div>
            </section>

            {/* Services & System */}
            <section aria-labelledby="stats-services-detail">
              <h2
                id="stats-services-detail"
                className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  {t.statsServicesHeading} · {t.statsSystemHeading}
                </span>
              </h2>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 overflow-hidden text-xs">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">Xray VPN</span>
                  <span className="font-mono tabular-nums text-black dark:text-white text-end">
                    {stats.services.xray.running ? t.statsActive : t.statsInactive} ·{' '}
                    {fmtNum(stats.services.xray.testedOkCount)}/{fmtNum(stats.services.xray.profilesCount)}{' '}
                    {stats.services.xray.activeProfileName ? `· ${stats.services.xray.activeProfileName}` : ''}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">PO Token Provider</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {stats.services.potProvider.running ? t.statsActive : t.statsInactive} ·{' '}
                    {stats.services.potProvider.mode}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">Telegram Storage · YouTube Cookies</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {stats.services.telegram.signedIn ? t.statsActive : t.statsInactive} ·{' '}
                    {stats.services.youtubeCookiesConfigured ? t.statsConfigured : t.statsNotConfigured}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.adminLogsTitle}</span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {fmtNum(stats.services.logs.total)} ({t.adminLogsInfo}: {fmtNum(stats.services.logs.info)} ·{' '}
                    {t.adminLogsWarn}: {fmtNum(stats.services.logs.warn)} · {t.adminLogsError}:{' '}
                    {fmtNum(stats.services.logs.error)})
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {t.statsUptimeLabel} · {t.statsNodeVersionLabel}
                  </span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {formatUptime(stats.system.uptimeSeconds)} · {stats.system.nodeVersion} ({stats.system.arch})
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {t.statsRamUsageLabel} · {t.statsCpuLoadLabel}
                  </span>
                  <span className="font-mono tabular-nums text-black dark:text-white">
                    {formatBytes(stats.system.rssBytes)} / {formatBytes(stats.system.osTotalMemBytes)} ·{' '}
                    {stats.system.cpuCount}c ({stats.system.loadAvg1m})
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* 6. Live Jobs (when active/present) */}
          {stats.liveJobs.total > 0 && (
            <section aria-labelledby="stats-live-jobs">
              <div className="px-4 pb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id="stats-live-jobs"
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                >
                  {t.statsLiveJobsHeading}
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  Total: {stats.liveJobs.total} · Active:{' '}
                  {stats.liveJobs.downloading + stats.liveJobs.processing} · Ready: {stats.liveJobs.ready} ·
                  Error: {stats.liveJobs.error}
                </span>
              </div>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 overflow-hidden">
                {stats.liveJobs.items.map((job) => (
                  <div key={job.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-black dark:text-white truncate">{job.title}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                        {PLATFORM_LABELS[job.platform] || job.platform} · {job.quality}.{job.ext} ·{' '}
                        {job.status} ({job.progress}%)
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-zinc-600 dark:text-zinc-300 shrink-0">
                      {formatBytes(job.totalBytes ?? job.downloadedBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 7. Recent Users & Recent Downloads Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <section aria-labelledby="stats-recent-users">
              <div className="px-4 pb-2 flex items-center justify-between gap-2">
                <h2
                  id="stats-recent-users"
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                >
                  {t.statsRecentUsersHeading}
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {fmtNum(filteredUsers.length)}
                </span>
              </div>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
                <div className="p-3 border-b border-black/10 dark:border-white/10">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={t.statsSearchUsersPlaceholder}
                      className="w-full min-h-[38px] ps-9 pe-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs text-black dark:text-white placeholder:text-zinc-400 outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>
                <div className="divide-y divide-black/10 dark:divide-white/10 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      {t.statsEmptyList}
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-black dark:text-white truncate">
                            {u.displayName} {u.role === 'admin' ? `(${t.statsAdminsCount})` : ''}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {u.email} · {u.provider} · {LANG_LABELS[u.language] || u.language}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-xs font-mono tabular-nums text-black dark:text-white">
                            {fmtNum(u.historyCount)}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                            {formatDateShort(u.createdAt, locale)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Recent Downloads */}
            <section aria-labelledby="stats-recent-downloads">
              <div className="px-4 pb-2 flex items-center justify-between gap-2">
                <h2
                  id="stats-recent-downloads"
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                >
                  {t.statsRecentDownloadsHeading}
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {fmtNum(filteredDownloads.length)}
                </span>
              </div>
              <div className="theme-surface rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
                <div className="p-3 border-b border-black/10 dark:border-white/10">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                    <input
                      type="text"
                      value={downloadSearch}
                      onChange={(e) => setDownloadSearch(e.target.value)}
                      placeholder={t.statsSearchDownloadsPlaceholder}
                      className="w-full min-h-[38px] ps-9 pe-3 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs text-black dark:text-white placeholder:text-zinc-400 outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>
                <div className="divide-y divide-black/10 dark:divide-white/10 max-h-96 overflow-y-auto">
                  {filteredDownloads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      {t.statsEmptyList}
                    </div>
                  ) : (
                    filteredDownloads.map((d) => (
                      <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-black dark:text-white truncate">
                            {d.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {PLATFORM_LABELS[d.platform] || d.platform} · {d.quality}
                            {d.userDisplayName || d.userEmail ? ` · ${d.userDisplayName || d.userEmail}` : ''}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-xs font-mono tabular-nums text-black dark:text-white">
                            {formatBytes(d.sizeBytes)}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                            {formatDateShort(d.createdAt, locale)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
