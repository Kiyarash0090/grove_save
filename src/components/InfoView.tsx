import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Bot,
  Camera,
  ChevronDown,
  Clapperboard,
  Film,
  Globe,
  Info,
  Layers,
  Link2,
  Megaphone,
  Music,
  Palette,
  Play,
  Send,
  Share2,
  Sparkles,
  UserCheck,
  Youtube,
} from 'lucide-react';
import type { AppLanguage, TranslationDict } from '../i18n';

const PLATFORM_ICON_COLORS: Record<string, string> = {
  youtube: 'text-red-500',
  instagram: 'text-[#dd2a7b]',
  tiktok: 'text-cyan-400',
  x: 'text-sky-400',
  pinterest: 'text-[#e60023]',
  telegram: 'text-[#0088cc]',
};

const BOT_ICON_COLORS: Record<string, string> = {
  media: 'text-[#0088cc]',
  music: 'text-[#1db954]',
  youtube: 'text-red-500',
  video: 'text-[#ff6b35]',
};

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
  iconColor?: string;
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
    iconColor: 'text-[#0088cc]',
  },
  {
    brandTitle: 'Grove Music',
    subtitleKey: 'infoBotMusicDesc',
    handle: '@grove_SpotifyDl_bot',
    url: 'https://t.me/grove_SpotifyDl_bot',
    icon: 'music',
    iconColor: 'text-[#1db954]',
  },
  {
    brandTitle: 'Grove YouTube',
    subtitleKey: 'infoBotYoutubeDesc',
    handle: '@Grove_YoutubeDl_bot',
    url: 'https://t.me/Grove_YoutubeDl_bot',
    icon: 'youtube',
    iconColor: 'text-red-500',
  },
  {
    brandTitle: 'Grove PH',
    subtitleKey: 'infoBotPhDesc',
    handle: '@Grove_phdl_bot',
    url: 'https://t.me/Grove_phdl_bot',
    icon: 'video',
    iconColor: 'text-[#ff6b35]',
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
  const [showFeatures, setShowFeatures] = useState(false);
  const [featureFilter, setFeatureFilter] = useState<'all' | 'platforms' | 'general'>('all');

  const renderBotIcon = (kind: TelegramBotEntry['icon'], colorClass?: string) => {
    const resolvedColor = colorClass || BOT_ICON_COLORS[kind] || 'text-black dark:text-white';
    switch (kind) {
      case 'music':
        return <Music className={`w-4 h-4 ${resolvedColor}`} />;
      case 'youtube':
        return <Youtube className={`w-4 h-4 ${resolvedColor}`} />;
      case 'video':
        return <Film className={`w-4 h-4 ${resolvedColor}`} />;
      default:
        return <Bot className={`w-4 h-4 ${resolvedColor}`} />;
    }
  };

  const renderPlatformIcon = (
    id: TranslationDict['infoFeaturesPlatforms'][number]['id']
  ) => {
    const colorClass = PLATFORM_ICON_COLORS[id] || 'text-black dark:text-white';
    switch (id) {
      case 'youtube':
        return <Youtube className={`w-4 h-4 ${colorClass}`} />;
      case 'instagram':
        return <Camera className={`w-4 h-4 ${colorClass}`} />;
      case 'tiktok':
        return <Clapperboard className={`w-4 h-4 ${colorClass}`} />;
      case 'x':
        return <Share2 className={`w-4 h-4 ${colorClass}`} />;
      case 'pinterest':
        return (
          <svg
            className={`w-4 h-4 ${colorClass}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12.017 2C6.486 2 2 6.486 2 12.017c0 4.249 2.64 7.878 6.364 9.338-.087-.793-.166-2.012.035-2.879.181-.781 1.169-4.956 1.169-4.956s-.298-.597-.298-1.48c0-1.387.804-2.422 1.805-2.422.851 0 1.262.639 1.262 1.405 0 .856-.545 2.136-.826 3.321-.235.993.498 1.803 1.477 1.803 1.773 0 3.136-1.87 3.136-4.568 0-2.388-1.716-4.058-4.167-4.058-2.838 0-4.504 2.129-4.504 4.33 0 .858.33 1.778.742 2.279.082.099.093.186.069.286-.076.313-.244.993-.277 1.132-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.531 0 10.017-4.486 10.017-10.017C22.034 6.486 17.548 2 12.017 2z" />
          </svg>
        );
      case 'telegram':
        return <Send className={`w-4 h-4 ${colorClass}`} />;
      default:
        return <Globe className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  const renderGeneralIcon = (id: string) => {
    switch (id) {
      case 'download-flow':
        return <Link2 className="w-4 h-4 text-black dark:text-white" />;
      case 'player-tools':
        return <Play className="w-4 h-4 text-black dark:text-white" />;
      case 'account-history':
        return <UserCheck className="w-4 h-4 text-black dark:text-white" />;
      default:
        return <Palette className="w-4 h-4 text-black dark:text-white" />;
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

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowFeatures((prev) => !prev)}
              aria-expanded={showFeatures}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold inline-flex items-center justify-between sm:justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>{t.infoFeaturesBtn}</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showFeatures ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showFeatures && (
              <motion.div
                key="app-features-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-1 border-t border-black/10 dark:border-white/10 space-y-4">
                  {/* Category Filter */}
                  <div
                    role="tablist"
                    aria-label={t.infoFeaturesBtn}
                    className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5"
                  >
                    {(
                      [
                        { id: 'all', label: t.infoFeaturesTabAll },
                        { id: 'platforms', label: t.infoFeaturesTabPlatforms },
                        { id: 'general', label: t.infoFeaturesTabGeneral },
                      ] as const
                    ).map((tab) => {
                      const active = featureFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setFeatureFilter(tab.id)}
                          className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Section A: Supported Platforms */}
                  {(featureFilter === 'all' || featureFilter === 'platforms') && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-0.5">
                        {t.infoFeaturesPlatformsTitle}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {t.infoFeaturesPlatforms.map((platform) => (
                          <div
                            key={platform.id}
                            className="rounded-xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                                  {renderPlatformIcon(platform.id)}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-black dark:text-white truncate">
                                    {platform.name}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {platform.badge}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <ul className="space-y-1.5">
                              {platform.items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section B: General Public Features */}
                  {(featureFilter === 'all' || featureFilter === 'general') && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-0.5">
                        {t.infoFeaturesGeneralTitle}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {t.infoFeaturesGeneral.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 p-3.5 space-y-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                                {renderGeneralIcon(group.id)}
                              </span>
                              <div className="text-xs font-bold text-black dark:text-white">
                                {group.title}
                              </div>
                            </div>
                            <ul className="space-y-1.5">
                              {group.items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                  {renderBotIcon(bot.icon, bot.iconColor)}
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
