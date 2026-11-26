import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, Info, Moon, Settings, Sun, User, WifiOff } from 'lucide-react';
import { TRANSLATIONS, type AppLanguage, type AppTheme } from './i18n';
import { DownloaderView, type ProviderGlow, type SavedItem } from './components/DownloaderView';
import { InfoView, type AnnouncementItem } from './components/InfoView';
import { SettingsView } from './components/SettingsView';
import { AuthModal, type AuthUser } from './components/AuthModal';
import { useOnlineStatus } from './hooks/usePWAInstall';

type TabIndex = 0 | 1 | 2;

const GUEST_HISTORY_KEY = 'grove_guest_history';
const LEGACY_HISTORY_KEY = 'grove_history';
const SEEN_ANNOUNCEMENT_KEY = 'grove_seen_announcement';

// Guests do not keep a history: signed-out visitors always start with an empty
// list, and any entries left behind by an older build are dropped once.
function clearGuestHistory(): void {
  try {
    localStorage.removeItem(GUEST_HISTORY_KEY);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Storage can be unavailable (private mode); nothing to clean up then.
  }
}

function normalizeDefaultQuality(q: string | undefined): string {
  if (q && ['2160p', '1080p', '720p', '480p', '360p'].includes(q)) {
    return q;
  }
  return '1080p';
}

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
    return normalizeDefaultQuality(localStorage.getItem('grove_quality') || undefined);
  });
  // Signed-in users get their history from the database on mount; guests never
  // get one, so the list always starts empty.
  const [history, setHistory] = useState<SavedItem[]>([]);

  // Auth token stays in React memory only; persistent reload sessions use HttpOnly cookie + DB
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [providerGlow, setProviderGlow] = useState<ProviderGlow>('default');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [seenAnnouncementKey, setSeenAnnouncementKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SEEN_ANNOUNCEMENT_KEY);
    } catch {
      return null;
    }
  });
  const authEpochRef = useRef(0);

  const isOnline = useOnlineStatus();
  const t = TRANSLATIONS[language];
  const apiBase = '';

  const buildAuthHeaders = useCallback(
    (withJson = false, tokenOverride?: string | null): Record<string, string> => {
      const headers: Record<string, string> = {
        'X-Requested-With': 'GroveSave',
      };
      if (withJson) {
        headers['Content-Type'] = 'application/json';
      }
      const activeToken = tokenOverride !== undefined ? tokenOverride : authToken;
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      return headers;
    },
    [authToken]
  );

  const applyUserPreferences = useCallback((authedUser: AuthUser) => {
    if (!authedUser.preferences) return;
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
      setDefaultQuality(normalizeDefaultQuality(authedUser.preferences.defaultQuality));
    }
  }, []);

  const loadUserHistoryFromDb = useCallback(
    async (tokenOverride?: string | null) => {
      try {
        const res = await fetch(`${apiBase}/api/user/history`, {
          credentials: 'include',
          headers: buildAuthHeaders(false, tokenOverride),
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: SavedItem[] };
          if (Array.isArray(data.items)) {
            setHistory(data.items);
          }
        }
      } catch {
        // Ignore transient offline error
      }
    },
    [apiBase, buildAuthHeaders]
  );

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

  // Drop any history an older build left in localStorage for signed-out visitors.
  useEffect(() => {
    if (!user) clearGuestHistory();
  }, [user]);

  // Hydrate persistent HttpOnly cookie session from database once on initial page load / reload
  useEffect(() => {
    try {
      localStorage.removeItem('grove_auth_token');
      localStorage.removeItem('grove_user');
    } catch {}

    let cancelled = false;
    const epochAtStart = authEpochRef.current;

    fetch(`${apiBase}/api/auth/me`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'GroveSave' },
    })
      .then(async (res) => {
        if (res.status === 401) return { unauthenticated: true as const };
        if (!res.ok) return null;
        return (await res.json()) as { user?: AuthUser };
      })
      .then((data) => {
        if (cancelled || !data || authEpochRef.current !== epochAtStart) return;
        if ('unauthenticated' in data) {
          setUser(null);
          setAuthToken(null);
          setHistory([]);
          clearGuestHistory();
          return;
        }
        if (data.user) {
          setUser(data.user);
          applyUserPreferences(data.user);
          void loadUserHistoryFromDb(null);
        }
      })
      .catch(() => {
        // Keep current state when offline
      });

    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount so login/logout state updates never re-trigger /api/auth/me without the new token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/announcements`, {
        headers: { 'X-Requested-With': 'GroveSave' },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: AnnouncementItem[] };
      if (Array.isArray(data.items)) {
        setAnnouncements(data.items);
      }
    } catch {
      // Ignore offline/transient announcement fetch errors
    }
  }, [apiBase]);

  useEffect(() => {
    void loadAnnouncements();
    const onFocus = () => {
      void loadAnnouncements();
    };
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(() => {
      void loadAnnouncements();
    }, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [loadAnnouncements]);

  const latestAnnouncementKey =
    announcements.length > 0 ? `${announcements[0].id}:${announcements[0].createdAt}` : null;

  const hasUnreadAnnouncement = Boolean(
    latestAnnouncementKey && seenAnnouncementKey !== latestAnnouncementKey
  );

  useEffect(() => {
    if (activeTab === 1 && latestAnnouncementKey && seenAnnouncementKey !== latestAnnouncementKey) {
      setSeenAnnouncementKey(latestAnnouncementKey);
      try {
        localStorage.setItem(SEEN_ANNOUNCEMENT_KEY, latestAnnouncementKey);
      } catch {
        // Ignore private storage errors
      }
    }
  }, [activeTab, latestAnnouncementKey, seenAnnouncementKey]);

  const syncPreferencesToServer = async (
    nextTheme: AppTheme,
    nextLang: AppLanguage,
    nextQuality: string
  ) => {
    if (!user) return;
    try {
      await fetch(`${apiBase}/api/user/preferences`, {
        method: 'PUT',
        credentials: 'include',
        headers: buildAuthHeaders(true),
        body: JSON.stringify({
          theme: nextTheme,
          language: nextLang,
          defaultQuality: normalizeDefaultQuality(nextQuality),
        }),
      });
    } catch {
      // Ignore transient network errors on preference sync
    }
  };

  const handleThemeChange = (next: AppTheme) => {
    setTheme(next);
    void syncPreferencesToServer(next, language, defaultQuality);
  };

  const handleLanguageChange = (next: AppLanguage) => {
    setLanguage(next);
    void syncPreferencesToServer(theme, next, defaultQuality);
  };

  const handleDefaultQualityChange = (next: string) => {
    const normalized = normalizeDefaultQuality(next);
    setDefaultQuality(normalized);
    void syncPreferencesToServer(theme, language, normalized);
  };

  const handleAuthenticated = (token: string, authedUser: AuthUser) => {
    authEpochRef.current += 1;
    setAuthToken(token);
    setUser(authedUser);
    applyUserPreferences(authedUser);
    void loadUserHistoryFromDb(token);
  };

  // History belongs to signed-in accounts only: guests save nothing at all, and
  // signed-in users stay de-duplicated and capped at 50 entries.
  const handleAddHistory = (item: SavedItem) => {
    if (!user) return;

    setHistory((prev) => {
      const filtered = prev.filter((h) => !(h.url === item.url && h.quality === item.quality));
      return [item, ...filtered].slice(0, 50);
    });

    fetch(`${apiBase}/api/user/history`, {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: SavedItem[] } | null) => {
        if (data?.items) {
          setHistory(data.items);
        }
      })
      .catch(() => {});
  };

  const handleClearHistory = () => {
    setHistory([]);
    if (user) {
      fetch(`${apiBase}/api/user/history`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildAuthHeaders(),
      }).catch(() => {});
    } else {
      clearGuestHistory();
    }
  };

  const handleSignOut = async () => {
    authEpochRef.current += 1;
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(),
      });
    } catch {}
    setAuthToken(null);
    setUser(null);
    // Signing out drops the stored history too: guests never see one.
    setHistory([]);
    clearGuestHistory();
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
    const goForward = isRtl ? dx > 0 : dx < 0;
    if (goForward) {
      if (activeTab === 0) switchTab(1);
      else if (activeTab === 1) switchTab(2);
    } else {
      if (activeTab === 2) switchTab(1);
      else if (activeTab === 1) switchTab(0);
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
          className={`animate-radiant-float absolute top-[-140px] left-1/2 w-[560px] sm:w-[760px] h-[360px] rounded-full blur-[110px] transition-all duration-700 ${
            providerGlow === 'red'
              ? 'bg-red-500/25 dark:bg-red-600/30'
              : providerGlow === 'instagram'
                ? 'bg-gradient-to-r from-[#f58529]/30 via-[#dd2a7b]/35 to-[#8134af]/30 dark:from-[#f58529]/30 dark:via-[#dd2a7b]/35 dark:to-[#8134af]/32'
                : 'bg-zinc-400/25 dark:bg-white/15'
          }`}
        />
        <div
          className={`absolute bottom-[-160px] left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full blur-[120px] transition-all duration-700 ${
            providerGlow === 'red'
              ? 'bg-red-500/15 dark:bg-red-600/15'
              : providerGlow === 'instagram'
                ? 'bg-gradient-to-r from-[#8134af]/20 via-[#dd2a7b]/22 to-[#f58529]/18 dark:from-[#8134af]/22 dark:via-[#dd2a7b]/24 dark:to-[#f58529]/18'
                : 'bg-zinc-300/20 dark:bg-white/10'
          }`}
        />
      </div>

      {/* Modern Minimalist Frosted Glass Header */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl backdrop-saturate-150 bg-white/50 dark:bg-black/45 border-b border-black/[0.07] dark:border-white/[0.12] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-6 backdrop-blur-xl bg-white/20 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => switchTab(0)}
            className="group min-h-[44px] px-1.5 -ms-1.5 rounded-xl flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-85 active:scale-[0.98]"
          >
            <span className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 4v11" />
                <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
                <path d="M5 19h14" />
              </svg>
            </span>
            <span className="grove-wordmark text-lg sm:text-xl font-bold text-black dark:text-white tracking-tight">
              Grove Save
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t.themeWhite : t.themeBlack}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-black/10 dark:border-white/12 bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-95 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => (user ? switchTab(2) : setAuthModalOpen(true))}
              aria-label={t.sectionAccount}
              className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 ${
                user
                  ? 'px-2.5 border border-black/10 dark:border-white/12 bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white hover:bg-black/[0.07] dark:hover:bg-white/[0.1]'
                  : 'px-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90'
              }`}
            >
              {user ? (
                <>
                  <span className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline text-xs font-semibold max-w-[110px] truncate">
                    {user.displayName}
                  </span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{t.modeSignIn}</span>
                </>
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
                onProviderGlowChange={setProviderGlow}
                isGuest={!user}
                isAdmin={user?.role === 'admin'}
                authToken={authToken}
              />
            </motion.div>
          ) : activeTab === 1 ? (
            <motion.div
              key="tab-info"
              initial={{ opacity: 0, x: swipeDir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDir * -24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <InfoView
                t={t}
                language={language}
                announcements={announcements}
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
                defaultQuality={defaultQuality}
                onDefaultQualityChange={handleDefaultQualityChange}
                historyCount={history.length}
                onClearHistory={handleClearHistory}
                user={user}
                authToken={authToken}
                onOpenAuth={() => setAuthModalOpen(true)}
                onSignOut={handleSignOut}
                apiBase={apiBase}
                announcements={announcements}
                onAnnouncementsChange={setAnnouncements}
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

      {/* Floating White-Neon Footer Dock (Download Tab + Info Tab + Settings Tab) */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-14 px-2.5 rounded-full bg-white/55 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 border border-white/75 dark:border-white/20 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.1] neon-dock flex items-center gap-2"
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
          aria-label={t.tabInfoLabel}
          aria-current={activeTab === 1 ? 'page' : undefined}
          className={`relative min-h-[44px] min-w-[56px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            activeTab === 1
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-[0_0_20px_rgba(255,255,255,0.45)]'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Info className="w-5 h-5" />
          {hasUnreadAnnouncement && (
            <span
              aria-hidden="true"
              className="absolute top-2 end-3 w-2 h-2 rounded-full bg-black dark:bg-white shadow-[0_0_6px_rgba(0,0,0,0.45)] dark:shadow-[0_0_8px_rgba(255,255,255,0.9)]"
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab(2)}
          aria-label={t.tabSettingsLabel}
          aria-current={activeTab === 2 ? 'page' : undefined}
          className={`relative min-h-[44px] min-w-[56px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
            activeTab === 2
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
