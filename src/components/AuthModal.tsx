import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Mail, Lock, User as UserIcon, X } from 'lucide-react';
import type { TranslationDict } from '../i18n';

const GOOGLE_SVG = (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.41 2.67 1.49 6.57l3.66 2.84C6.02 6.82 8.76 5 12 5z" />
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.66-5.02 3.66-8.73z" />
    <path fill="#FBBC05" d="M5.15 14.59A7.12 7.12 0 0 1 4.78 12c0-.9.15-1.77.37-2.59L1.49 6.57A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.49 5.43l3.66-2.84z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.24 0-5.98-1.82-6.85-4.41l-3.66 2.84C3.41 21.33 7.39 24 12 24z" />
  </svg>
);

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  provider: 'email' | 'google';
  role?: 'user' | 'admin';
  preferences?: {
    theme?: 'dark' | 'light';
    language?: 'en' | 'fa' | 'ru' | 'zh';
    defaultQuality?: string;
  };
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  t: TranslationDict;
  apiBase: string;
  onAuthenticated: (token: string, user: AuthUser) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential?: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  t,
  apiBase,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleHint, setGoogleHint] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGoogleHint(false);
    let cancelled = false;

    fetch(`${apiBase}/api/auth/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { googleConfigured?: boolean; googleClientId?: string | null } | null) => {
        if (!cancelled && data?.googleConfigured && data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {
        // Keep null if offline
      });

    return () => {
      cancelled = true;
    };
  }, [open, apiBase]);

  useEffect(() => {
    if (!open || !googleClientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp) => {
          if (!resp.credential) return;
          setLoading(true);
          setError(null);
          try {
            const res = await fetch(`${apiBase}/api/auth/google`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'GroveSave',
              },
              body: JSON.stringify({ credential: resp.credential }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || 'Google sign-in failed.');
            } else {
              onAuthenticated(data.token, data.user);
              onClose();
            }
          } catch {
            setError('Connection failed.');
          } finally {
            setLoading(false);
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        max_width: 320,
        text: 'continue_with',
        logo_alignment: 'center',
      });

      // Apply our custom styles to the Google button after render
      const applyCustomStyles = () => {
        const btn = googleBtnRef.current?.querySelector('div[role="button"]') as HTMLElement;
        if (btn) {
          btn.style.cssText += `
            border-radius: 12px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1) !important;
            transition: transform 0.1s ease, box-shadow 0.1s ease !important;
          `;
          btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(0.99)';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08) !important';
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1) !important';
          });
        }
      };
      // Google renders asynchronously, so try a few times
      setTimeout(applyCustomStyles, 50);
      setTimeout(applyCustomStyles, 200);
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [open, googleClientId, apiBase, onAuthenticated, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || password.length < 6) {
      setError(t.authErrorRequired);
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'GroveSave',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          displayName: mode === 'register' ? displayName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.authErrorRequired);
      } else {
        onAuthenticated(data.token, data.user);
        onClose();
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0A0A0A] border border-black/15 dark:border-white/20 p-6 neon-white-box max-h-[90dvh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">
                  {t.authModalTitle}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t.authModalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5">
              {googleClientId ? (
                <div
                  ref={googleBtnRef}
                  className="flex justify-center min-h-[44px]"
                  style={{
                    // Subtle wrapper to match our design
                    overflow: 'hidden',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setGoogleHint((v) => !v)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/25 bg-white dark:bg-zinc-950 text-black dark:text-white font-medium text-sm flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.99] transition shadow-sm hover:shadow-md"
                >
                  {GOOGLE_SVG}
                  <span className="whitespace-nowrap">{t.continueWithGoogle}</span>
                </button>
              )}

              {googleHint && !googleClientId && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {t.googleNotConfigured}
                </p>
              )}
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/20 to-transparent" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">{t.orUseEmail}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 mb-4 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition ${
                  mode === 'login'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {t.modeSignIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold transition ${
                  mode === 'register'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {t.modeRegister}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <label className="block">
                  <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    {t.displayNameLabel}
                  </span>
                  <div className="relative group">
                    <UserIcon className="w-4 h-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white absolute top-1/2 -translate-y-1/2 start-3.5 transition-colors" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full min-h-[48px] ps-10 pe-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/15 dark:border-white/20 text-sm text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all duration-150 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      placeholder="CJ"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.emailLabel}
                </span>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 absolute top-1/2 -translate-y-1/2 start-3.5 transition-colors" />
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[48px] ps-10 pe-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/15 dark:border-white/20 text-sm text-black dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-150 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    placeholder="name@gmail.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  {t.passwordLabel}
                </span>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-zinc-400 group-focus-within:text-amber-500 absolute top-1/2 -translate-y-1/2 start-3.5 transition-colors" />
                  <input
                    type="password"
                    dir="ltr"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[48px] ps-10 pe-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-black/15 dark:border-white/20 text-sm text-black dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 transition-all duration-150 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    placeholder="••••••"
                  />
                </div>
              </label>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium pt-1 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] mt-1 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{mode === 'login' ? t.submitSignIn : t.submitRegister}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] mt-3 text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              {t.continueAsGuest}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
