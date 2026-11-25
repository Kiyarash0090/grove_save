import React from 'react';
import {
  ArrowUpRight,
  Bot,
  Film,
  Info,
  Megaphone,
  Music,
  Send,
  Sparkles,
  Youtube,
} from 'lucide-react';
import type { AppLanguage, TranslationDict } from '../i18n';

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: number;
}

interface InfoViewProps {
  t: TranslationDict;
  language: AppLanguage;
  announcements: AnnouncementItem[];
}

interface TelegramBotEntry {
  brandTitle: string;
  subtitleKey: 'infoBotMediaDesc' | 'infoBotMusicDesc' | 'infoBotYoutubeDesc' | 'infoBotPhDesc';
  handle: string;
  url: string;
  icon: 'media' | 'music' | 'youtube' | 'video';
}

const CREATOR_CHANNEL_URL = 'https://t.me/GROVE_STREET_BOT1';
const CREATOR_CHANNEL_HANDLE = '@GROVE_STREET_BOT1';

const TELEGRAM_BOTS: TelegramBotEntry[] = [
  {
    brandTitle: 'Grove Media',
    subtitleKey: 'infoBotMediaDesc',
    handle: '@Groove_media_dl_bot',
    url: 'https://t.me/Groove_media_dl_bot',
    icon: 'media',
  },
  {
    brandTitle: 'Grove Music',
    subtitleKey: 'infoBotMusicDesc',
    handle: '@grove_SpotifyDl_bot',
    url: 'https://t.me/grove_SpotifyDl_bot',
    icon: 'music',
  },
  {
    brandTitle: 'Grove YouTube',
    subtitleKey: 'infoBotYoutubeDesc',
    handle: '@Grove_YoutubeDl_bot',
    url: 'https://t.me/Grove_YoutubeDl_bot',
    icon: 'youtube',
  },
  {
    brandTitle: 'Grove PH',
    subtitleKey: 'infoBotPhDesc',
    handle: '@Grove_phdl_bot',
    url: 'https://t.me/Grove_phdl_bot',
    icon: 'video',
  },
];

function formatAnnouncementDate(ts: number, language: AppLanguage): string {
  if (!ts) return '';
  try {
    const locale =
      language === 'fa'
        ? 'fa-IR'
        : language === 'ru'
          ? 'ru-RU'
          : language === 'zh'
            ? 'zh-CN'
            : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export const InfoView: React.FC<InfoViewProps> = ({ t, language, announcements }) => {
  const renderBotIcon = (kind: TelegramBotEntry['icon']) => {
    switch (kind) {
      case 'music':
        return <Music className="w-4 h-4 text-black dark:text-white" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-black dark:text-white" />;
      case 'video':
        return <Film className="w-4 h-4 text-black dark:text-white" />;
      default:
        return <Bot className="w-4 h-4 text-black dark:text-white" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-28 space-y-6">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          {t.infoTitle}
        </h1>
      </div>

      {/* Section 1: Announcements Header & Feed */}
      <section aria-labelledby="info-announcements">
        <div className="px-4 pb-2 flex items-center justify-between gap-2">
          <h2
            id="info-announcements"
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>{t.announcementsTitle}</span>
          </h2>
          {announcements.length > 0 && (
            <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              {announcements.length}
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden">
          {announcements.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {t.announcementsEmpty}
            </div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {announcements.map((item) => (
                <article key={item.id} className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-black dark:bg-white shrink-0" />
                      <h3 className="text-sm font-semibold text-black dark:text-white truncate">
                        {item.title || t.announcementsTitle}
                      </h3>
                    </div>
                    <time
                      dateTime={new Date(item.createdAt).toISOString()}
                      className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0"
                    >
                      {formatAnnouncementDate(item.createdAt, language)}
                    </time>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words ps-4">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: App Info & Short Description */}
      <section aria-labelledby="info-about">
        <h2
          id="info-about"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{t.infoAboutTitle}</span>
        </h2>
        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="grove-wordmark text-base font-bold text-black dark:text-white">
                Grove Save
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.aboutValue}
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {t.infoAboutBody}
          </p>
        </div>
      </section>

      {/* Section 3: Creator Team Telegram Channel */}
      <section aria-labelledby="info-channel">
        <h2
          id="info-channel"
          className="px-4 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          {t.infoChannelTitle}
        </h2>
        <a
          href={CREATOR_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 p-4 hover:border-black/30 dark:hover:border-white/35 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-black dark:text-white truncate">
                  {t.infoChannelTitle}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {t.infoChannelDesc}
                </div>
                <div dir="ltr" className="text-xs font-mono text-black dark:text-white mt-1">
                  {CREATOR_CHANNEL_HANDLE}
                </div>
              </div>
            </div>
            <span className="min-h-[36px] px-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 group-hover:opacity-90 transition-opacity">
              <span>{t.infoOpenTelegram}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </a>
      </section>

      {/* Section 4: Telegram Bots Directory */}
      <section aria-labelledby="info-bots">
        <div className="px-4 pb-2 space-y-0.5">
          <h2
            id="info-bots"
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {t.infoBotsTitle}
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {t.infoBotsDesc}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 dark:bg-[#0A0A0A] border border-black/10 dark:border-white/15 overflow-hidden divide-y divide-black/10 dark:divide-white/10">
          {TELEGRAM_BOTS.map((bot) => (
            <a
              key={bot.url}
              href={bot.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[68px] px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  {renderBotIcon(bot.icon)}
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      dir="ltr"
                      className="grove-wordmark text-sm font-bold text-black dark:text-white tracking-tight"
                    >
                      {bot.brandTitle}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700 text-xs" aria-hidden="true">
                      •
                    </span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {t[bot.subtitleKey]}
                    </span>
                  </span>
                  <span
                    dir="ltr"
                    className="block text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate text-start"
                  >
                    {bot.handle}
                  </span>
                </span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
