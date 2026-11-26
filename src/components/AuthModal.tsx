import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Mail, Lock, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import type { TranslationDict } from '../i18n';

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

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

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

            <div className="mt-5 mb-4">
              <div className="rounded-2xl border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] px-3.5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-black dark:text-white">
                    {t.privateAuthTitle}
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    {t.privateAuthSubtitle}
                  </p>
                </div>
              </div>
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
