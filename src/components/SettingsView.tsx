import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Download,
  Globe,
  HardDrive,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import type { AppLanguage, AppTheme, TranslationDict } from '../i18n';
import type { AuthUser } from './AuthModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  t: TranslationDict;
  theme: AppTheme;
  onThemeChange: (next: AppTheme) => void;
  language: AppLanguage;
  onLanguageChange: (next: AppLanguage) => void;
  historyCount: number;
  onClearHistory: () => void;
  user: AuthUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  apiBase: string;
}

const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  t,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  historyCount,
  onClearHistory,
  user,
  onOpenAuth,
  onSignOut,
  apiBase,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [clearedFeedback, setClearedFeedback] = useState(false);
  const [youtubeCookies, setYoutubeCookies] = useState('');
  const [youtubePoToken, setYoutubePoToken] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeMessage, setYoutubeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchYouTubeAuth = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('grove_auth_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setYoutubeCookies(data.youtubeCookies || '');
        setYoutubePoToken(data.youtubePoToken || '');
      }
    } catch {}
  };

  const saveYouTubeAuth = async () => {
    setYoutubeLoading(true);
    setYoutubeMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('grove_auth_token')}`,
        },
        body: JSON.stringify({ youtubeCookies, youtubePoToken }),
      });
      if (res.ok) {
        setYoutubeMessage({ type: 'success', text: t.youtubeSaved });
      } else {
        setYoutubeMessage({ type: 'error', text: 'Failed to save' });
      }
    } catch {
      setYoutubeMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setYoutubeLoading(false);
    }
  };

  const testYouTubeAuth = async () => {
    setYoutubeLoading(true);
    setYoutubeMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/youtube-auth/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('grove_auth_token')}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setYoutubeMessage({ type: 'success', text: t.youtubeTestSuccess });
      } else {
        setYoutubeMessage({ type: 'error', text: `${t.youtubeTestFailed}: ${data.error}` });
      }
    } catch {
      setYoutubeMessage({ type: 'error', text: t.youtubeTestFailed });
    } finally {
      setYoutubeLoading(false);
    }
  };

  // Load YouTube auth on mount if admin
  React.useEffect(() => {
    if (user?.role === 'admin') {
      fetchYouTubeAuth();
    }
  }, [user]);

  const ChevronIcon = t.dir === 'rtl' ? ChevronLeft : ChevronRight;

  const handleClear = () => {
    onClearHistory();
    setClearedFeedback(true);
    setTimeout(() => setClearedFeedback(false), 1800);
  };

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
              <div className="text-base font-semibold text-black dark:text-white truncate">
                {user ? user.displayName : t.guestName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {user ? `${t.signedInAs} · ${user.email}` : t.guestSubtitle}
              </div>
            </div>
          </div>

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

      {/* Section 4: App */}
      <section aria-labelledby="settings-engine">
        <h2
          id="settings-engine"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {t.sectionAppServer}
        </h2>
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
          {!isInstalled && (isInstallable || isIOS) && (
            <>
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
              <div className="h-px bg-black/10 dark:bg-white/10 ms-11" />
            </>
          )}

          <div className="min-h-[52px] px-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm font-medium text-black dark:text-white">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.aboutLabel}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{t.aboutValue}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Section 5: YouTube Authentication (Admin Only) */}
      {user?.role === 'admin' && (
        <section aria-labelledby="settings-youtube">
          <h2
            id="settings-youtube"
            className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2"
          >
            <span className="text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30">{t.adminOnly}</span>
            {t.sectionYouTube}
          </h2>
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.youtubeCookiesDesc}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.youtubeCookiesLabel}</label>
                <textarea
                  value={youtubeCookies}
                  onChange={(e) => setYoutubeCookies(e.target.value)}
                  placeholder={t.youtubeCookiesPlaceholder}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
              </div>
              <div className="h-px bg-black/10 dark:bg-white/10" />
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.youtubePoTokenLabel}</label>
                <input
                  type="password"
                  value={youtubePoToken}
                  onChange={(e) => setYoutubePoToken(e.target.value)}
                  placeholder={t.youtubePoTokenPlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-sm text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.youtubePoTokenDesc}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={saveYouTubeAuth}
                  disabled={youtubeLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold disabled:opacity-50"
                >
                  {youtubeLoading ? '...' : t.youtubeSaveBtn}
                </button>
                <button
                  type="button"
                  onClick={testYouTubeAuth}
                  disabled={youtubeLoading}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black text-black dark:text-white text-sm font-semibold disabled:opacity-50"
                >
                  {t.youtubeTestBtn}
                </button>
              </div>
              {youtubeMessage && (
                <div className={`text-xs p-2 rounded-lg ${youtubeMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                  {youtubeMessage.text}
                </div>
              )}
            </div>
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
