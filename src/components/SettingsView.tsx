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
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [clearedFeedback, setClearedFeedback] = useState(false);

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
