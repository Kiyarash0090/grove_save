import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, Moon, Settings, Sun, User, WifiOff } from 'lucide-react';
import { TRANSLATIONS, type AppLanguage, type AppTheme } from './i18n';
import { DownloaderView, type SavedItem } from './components/DownloaderView';
import { SettingsView } from './components/SettingsView';
import { AuthModal, type AuthUser } from './components/AuthModal';
import { useOnlineStatus } from './hooks/usePWAInstall';

type TabIndex = 0 | 1;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const [swipeDir, setSwipeDir] = useState<1 | -1>(1);
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('grove_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('grove_lang');
    if (saved === 'fa' || saved === 'ru' || saved === 'zh' || saved === 'en') {
      return saved;
    }
    return 'en';
  });
  const [defaultQuality, setDefaultQuality] = useState<string>(() => {
    return localStorage.getItem('grove_quality') || '1080p';
  });
  const [history, setHistory] = useState<SavedItem[]>(() => {
    try {
      const raw = localStorage.getItem('grove_history');
      return raw ? (JSON.parse(raw) as SavedItem[]) : [];
    } catch {
      return [];
    }
  });

  // Load auth token from localStorage on initial render
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('grove_auth_token');
    }
    return null;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grove_user');
      if (saved) {
        try {
          return JSON.parse(saved) as AuthUser;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isRedGlow, setIsRedGlow] = useState(false);

  const isOnline = useOnlineStatus();
  const t = TRANSLATIONS[language];
  const apiBase = '';

  // Sync theme with <html> and <meta name="theme-color">
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('grove_theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    }
  }, [theme]);

  // Sync language & RTL direction with <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = t.dir;
    localStorage.setItem('grove_lang', language);
  }, [language, t.dir]);

  useEffect(() => {
    localStorage.setItem('grove_quality', defaultQuality);
  }, [defaultQuality]);

  useEffect(() => {
    localStorage.setItem('grove_history', JSON.stringify(history));
  }, [history]);

  const syncPreferencesToServer = async (
    nextTheme: AppTheme,
    nextLang: AppLanguage,
    nextQuality: string
  ) => {
    if (!authToken) return;
    try {
      await fetch(`${apiBase}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          theme: nextTheme,
          language: nextLang,
          defaultQuality: nextQuality,
        }),
      });
    } catch {
      // Ignore transient network errors on preference sync
    }
  };

  const handleThemeChange = (next: AppTheme) => {
    setTheme(next);
    syncPreferencesToServer(next, language, defaultQuality);
  };

  const handleLanguageChange = (next: AppLanguage) => {
    setLanguage(next);
    syncPreferencesToServer(theme, next, defaultQuality);
  };

  const handleAuthenticated = (token: string, authedUser: AuthUser) => {
    setAuthToken(token);
    setUser(authedUser);
    localStorage.setItem('grove_auth_token', token);
    localStorage.setItem('grove_user', JSON.stringify(authedUser));
    if (authedUser.preferences) {
      if (authedUser.preferences.theme === 'dark' || authedUser.preferences.theme === 'light') {
        setTheme(authedUser.preferences.theme);
      }
      if (
        authedUser.preferences.language === 'en' ||
        authedUser.preferences.language === 'fa' ||
        authedUser.preferences.language === 'ru' ||
        authedUser.preferences.language === 'zh'
      ) {
        setLanguage(authedUser.preferences.language);
      }
      if (authedUser.preferences.defaultQuality) {
        setDefaultQuality(authedUser.preferences.defaultQuality);
      }
    }
  };

  // Prevent duplicate history entries
  const handleAddHistory = (item: SavedItem) => {
    setHistory((prev) => {
      // Check if URL already exists in history
      const exists = prev.some((h) => h.url === item.url);
      if (exists) return prev;
      return [item, ...prev].slice(0, 25);
    });
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('grove_auth_token');
    localStorage.removeItem('grove_user');
  };

  const switchTab = (next: TabIndex) => {
    if (next === activeTab) return;
    setSwipeDir(next > activeTab ? 1 : -1);
    setActiveTab(next);
  };

  // Finger / Touch swipe navigation across pages
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Require clear horizontal swipe (> 56px and horizontal dominant)
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.25) return;

    const isRtl = t.dir === 'rtl';
    if (isRtl) {
      if (dx > 0 && activeTab === 0) switchTab(1);
      else if (dx < 0 && activeTab === 1) switchTab(0);
    } else {
      if (dx < 0 && activeTab === 0) switchTab(1);
      else if (dx > 0 && activeTab === 1) switchTab(0);
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative min-h-dvh bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 overflow-x-clip"
    >
      {/* Animated Radiant Background Glow */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`animate-radiant-float absolute top-[-140px] left-1/2 w-[560px] sm:w-[760px] h-[360px] rounded-full blur-[110px] transition-colors duration-700 ${
            isRedGlow
              ? 'bg-red-500/25 dark:bg-red-600/30'
              : 'bg-zinc-400/25 dark:bg-white/15'
          }`}
        />
        <div
          className={`absolute bottom-[-160px] left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full blur-[120px] transition-colors duration-700 ${
            isRedGlow
              ? 'bg-red-500/15 dark:bg-red-600/15'
              : 'bg-zinc-300/20 dark:bg-white/10'
          }`}
        />
      </div>

      {/* Compact Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => switchTab(0)}
            className="grove-wordmark text-2xl sm:text-3xl text-white select-none whitespace-nowrap shrink-0 cursor-pointer"
          >
            grove save
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t.themeWhite : t.themeBlack}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => (user ? switchTab(1) : setAuthModalOpen(true))}
              aria-label={t.sectionAccount}
              className="min-h-[44px] min-w-[44px] px-2 flex items-center justify-center rounded-xl text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
            >
              {user ? (
                <span className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Swipeable Viewport */}
      <main className="relative z-10 px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait" custom={swipeDir}>
          {activeTab === 0 ? (
            <motion.div
              key="tab-download"
              initial={{ opacity: 0, x: swipeDir * -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDir * 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <DownloaderView
                t={t}
                apiBase={apiBase}
                defaultQuality={defaultQuality}
                history={history}
                onAddHistory={handleAddHistory}
                onYouTubeGlowChange={setIsRedGlow}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, x: swipeDir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDir * -24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <SettingsView
                t={t}
                theme={theme}
                onThemeChange={handleThemeChange}
                language={language}
                onLanguageChange={handleLanguageChange}
                historyCount={history.length}
                onClearHistory={() => setHistory([])}
                user={user}
                onOpenAuth={() => setAuthModalOpen(true)}
                onSignOut={handleSignOut}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 rounded-xl bg-black text-white dark:bg-white dark:text-black px-3.5 py-2 text-xs font-medium flex items-center gap-2 shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {/* Floating White-Neon Footer Dock (Icon-Only Download Tab + Settings Tab) */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-14 px-2.5 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xl neon-dock flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => switchTab(0)}
          aria-label={t.tabDownloadLabel}
          aria-current={activeTab === 0 ? 'page' : undefined}
          className={`relative min-h-[44px] min-w-[56px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            activeTab === 0
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-[0_0_20px_rgba(255,255,255,0.45)]'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <ArrowDownToLine className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => switchTab(1)}
          aria-label={t.tabSettingsLabel}
          aria-current={activeTab === 1 ? 'page' : undefined}
          className={`relative min-h-[44px] min-w-[56px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            activeTab === 1
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-[0_0_20px_rgba(255,255,255,0.45)]'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      {/* Account Auth Modal (Google + Email/Password + Guest) */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        t={t}
        apiBase={apiBase}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
