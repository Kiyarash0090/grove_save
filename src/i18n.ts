import type { AppTheme } from './themes';
export type { AppTheme };
export type AppLanguage = 'en' | 'fa' | 'ru' | 'zh';

export interface TranslationDict {
  dir: 'ltr' | 'rtl';
  langName: string;
  heroTitle: string;
  heroSubtitle: string;
  linkPlaceholder: string;
  paste: string;
  clear: string;
  analyze: string;
  analyzing: string;
  selectQuality: string;
  qualityLabels: Record<string, { label: string; sub: string }>;
  downloadNow: string;
  prepareDownload: string;
  cancelDownload: string;
  downloadingToApp: string;
  processingMedia: string;
  saveFromSite: string;
  readyInApp: string;
  preparing: string;
  downloading: string;
  savedToDevice: string;
  copyDownloadLink: string;
  linkCopied: string;
  readyToSave: string;
  watchOnline: string;
  hidePlayer: string;
  viewImage: string;
  hideImage: string;
  viewPhotos: string;
  hidePhotos: string;
  previousPage: string;
  nextPage: string;
  pageLabel: string;
  videoTab: string;
  photosTab: string;
  carouselZipLabel: string;
  imagePostLabel: string;
  audioTracksSection: string;
  audioOnlyLabel: string;
  audioOnlyDesc: string;
  subtitlesSection: string;
  manualSubtitlesLabel: string;
  autoSubtitlesLabel: string;
  subtitlesOff: string;
  filterLanguagesPlaceholder: string;
  downloadSubtitle: string;
  noSubtitlesFound: string;
  recentSaves: string;
  emptySavesTitle: string;
  emptySavesDesc: string;
  emptySavesDescGuest: string;
  reDownload: string;
  historyPlay: string;
  historyDelete: string;
  historyTelegramStream: string;
  historyStreamLoading: string;
  historyStreamError: string;
  historyZipUnsupported: string;
  invalidUrlError: string;
  inspectFailed: string;
  downloadFailed: string;
  streamFailed: string;
  retryPlayback: string;
  youtubeEmbedFallback: string;
  clipboardBlocked: string;
  swipeHint: string;
  tabDownloadLabel: string;
  tabSettingsLabel: string;
  settingsTitle: string;
  sectionAccount: string;
  guestName: string;
  guestSubtitle: string;
  signedInAs: string;
  signInOrCreate: string;
  signOut: string;
  editDisplayName: string;
  displayNamePlaceholder: string;
  saveNameBtn: string;
  cancelBtn: string;
  displayNameSaved: string;
  displayNameRequiredError: string;
  displayNameUpdateFailed: string;
  sectionAppearance: string;
  themeLabel: string;
  themeBlack: string;
  themeWhite: string;
  themeSpring: string;
  themeSummer: string;
  themeAutumn: string;
  themeWinter: string;
  themeShiraz: string;
  themePastelDark: string;
  languageLabel: string;
  sectionDownloads: string;
  defaultQualityLabel: string;
  clearHistoryLabel: string;
  clearHistoryDone: string;
  itemsCount: string;
  sectionAppServer: string;
  installAppLabel: string;
  installAppAction: string;
  installIOSAction: string;
  installIOSGuideTitle: string;
  installIOSGuideBody: string;
  close: string;
  aboutLabel: string;
  aboutValue: string;
  authModalTitle: string;
  authModalSubtitle: string;
  continueWithGoogle: string;
  googleNotConfigured: string;
  orUseEmail: string;
  modeSignIn: string;
  modeRegister: string;
  displayNameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  submitSignIn: string;
  submitRegister: string;
  continueAsGuest: string;
  authErrorRequired: string;
  offlineBanner: string;
  // YouTube Auth Settings
  sectionYouTube: string;
  youtubeCookiesLabel: string;
  youtubeCookiesDesc: string;
  youtubeCookiesPlaceholder: string;
  youtubePoTokenLabel: string;
  youtubePoTokenDesc: string;
  youtubePoTokenPlaceholder: string;
  youtubeSaveBtn: string;
  youtubeSaved: string;
  youtubeTestBtn: string;
  youtubeTestSuccess: string;
  youtubeTestFailed: string;
  adminOnly: string;
  sectionAdmin: string;
  // Xray VPN Settings
  sectionXray: string;
  xrayEnableLabel: string;
  xrayEnableDesc: string;
  xrayConfigLabel: string;
  xrayConfigPlaceholder: string;
  xrayConfigDesc: string;
  xraySaveBtn: string;
  xrayTestBtn: string;
  xrayInstallBtn: string;
  xrayStatusConnected: string;
  xrayStatusStopped: string;
  xrayStatusNotInstalled: string;
  xraySavedMsg: string;
  xrayInstalledMsg: string;
  xrayTestSuccess: string;
  xrayTestFailed: string;
  xrayTestUrlLabel: string;
  xrayTestUrlDesc: string;
  xrayImportBtn: string;
  xrayImportMsg: string;
  xrayProfilesTitle: string;
  xrayTestAllBtn: string;
  xrayTestProfileBtn: string;
  xrayActivateBtn: string;
  xrayActiveLabel: string;
  xrayDeleteBtn: string;
  xrayProfilesEmpty: string;
  xrayTestedPass: string;
  xrayTestedFail: string;
  xrayTestConcurrencyLabel: string;
  xrayCancelTestBtn: string;
  xrayTestCancelledMsg: string;
  // bgutil PO Token Server Settings
  sectionPotProvider: string;
  potEnableLabel: string;
  potEnableDesc: string;
  potModeLabel: string;
  potModeManaged: string;
  potModeExternal: string;
  potBaseUrlLabel: string;
  potPortLabel: string;
  potStatusRunning: string;
  potStatusStopped: string;
  potStatusNotInstalled: string;
  potPluginMissing: string;
  potInstallBtn: string;
  potSaveBtn: string;
  potTestBtn: string;
  potSavedMsg: string;
  potInstalledMsg: string;
  potTestSuccess: string;
  potTestFailed: string;
  potJsRuntimeSection: string;
  potJsRuntimeDesc: string;
  potJsRuntimeModeLabel: string;
  potJsRuntimeAuto: string;
  potJsRuntimeDeno: string;
  potJsRuntimeNode: string;
  potDenoReady: string;
  potDenoMissing: string;
  potNodeReady: string;
  potInstallDenoBtn: string;
  potDenoInstalledMsg: string;
  potEjsRemoteLabel: string;
  potEjsRemoteDesc: string;
  // Admin sub-page navigation & moved cookies section
  backToSettings: string;
  potPluginReady: string;
  youtubeCookiesSection: string;
  youtubeSaveCookiesBtn: string;
  xrayNavDesc: string;
  potNavDesc: string;
  // Telegram storage
  sectionTelegram: string;
  telegramNavDesc: string;
  telegramEnableLabel: string;
  telegramEnableDesc: string;
  telegramUploadLabel: string;
  telegramUploadDesc: string;
  telegramDisklessActive: string;
  telegramDisklessInactiveHint: string;
  telegramNeedsChannel: string;
  telegramModeLabel: string;
  telegramModeUser: string;
  telegramModeBot: string;
  telegramApiIdLabel: string;
  telegramApiHashLabel: string;
  telegramBotTokenLabel: string;
  telegramChannelLabel: string;
  telegramChannelPlaceholder: string;
  telegramPhoneLabel: string;
  telegramPhonePlaceholder: string;
  telegramCodeLabel: string;
  telegramCodePlaceholder: string;
  telegramPasswordLabel: string;
  telegramPasswordPlaceholder: string;
  telegramSendCodeBtn: string;
  telegramSignInBtn: string;
  telegramSaveBtn: string;
  telegramTestBtn: string;
  telegramLogoutBtn: string;
  telegramConnected: string;
  telegramNotConnected: string;
  telegramCodeSent: string;
  telegramSignedInMsg: string;
  telegramSavedMsg: string;
  telegramTestSuccess: string;
  telegramTestFailed: string;
  telegramNeedPassword: string;
  telegramApiIdDesc: string;
  telegramStorageTitle: string;
  telegramStorageDesc: string;
  telegramFilesCount: string;
  telegramOpenFileBtn: string;
  telegramNoFiles: string;
  telegramAccountLabel: string;
  telegramSecretsHint: string;
  cachePurgeTitle: string;
  cachePurgeDesc: string;
  cachePurgeBtn: string;
  cachePurgeConfirm: string;
  cachePurgeDone: string;
  cachePurgeFailed: string;
  // Database backup
  dbBackupSection: string;
  dbBackupDesc: string;
  dbBackupBtn: string;
  dbBackupStats: string;
  dbBackupUsers: string;
  dbBackupHistory: string;
  dbBackupTelegram: string;
  dbBackupSize: string;
  dbBackupCreateBtn: string;
  dbBackupCreatedMsg: string;
  dbBackupRestoreBtn: string;
  dbBackupRestoredMsg: string;
  dbBackupServerTitle: string;
  dbBackupEmpty: string;
  // Info tab & Announcements
  tabInfoLabel: string;
  infoTitle: string;
  announcementsTitle: string;
  announcementsEmpty: string;
  infoAboutTitle: string;
  infoAboutBody: string;
  infoChannelTitle: string;
  infoChannelDesc: string;
  infoOpenTelegram: string;
  infoBotsTitle: string;
  infoBotsDesc: string;
  infoBotMediaDesc: string;
  infoBotMusicDesc: string;
  infoBotYoutubeDesc: string;
  infoBotPhDesc: string;
  infoFeaturesBtn: string;
  infoFeaturesTabAll: string;
  infoFeaturesTabPlatforms: string;
  infoFeaturesTabGeneral: string;
  infoFeaturesPlatformsTitle: string;
  infoFeaturesGeneralTitle: string;
  infoFeaturesPlatforms: {
    id: 'youtube' | 'instagram' | 'tiktok' | 'x' | 'pinterest' | 'telegram' | 'other';
    name: string;
    badge: string;
    items: string[];
  }[];
  infoFeaturesGeneral: {
    id: string;
    title: string;
    items: string[];
  }[];
  adminAnnouncementsSection: string;
  adminAnnouncementsDesc: string;
  announcementTitleLabel: string;
  announcementTitlePlaceholder: string;
  announcementBodyLabel: string;
  announcementBodyPlaceholder: string;
  announcementPublishBtn: string;
  announcementPublishedMsg: string;
  announcementDeleteBtn: string;
  announcementDeletedMsg: string;
  announcementEmptyAdmin: string;
  adminLogsTitle: string;
  adminLogsAll: string;
  adminLogsInfo: string;
  adminLogsWarn: string;
  adminLogsError: string;
  adminLogsRefresh: string;
  adminLogsClear: string;
  adminLogsCopy: string;
  adminLogsCopied: string;
  adminLogsPause: string;
  adminLogsResume: string;
  adminLogsEmpty: string;
  adminStatsSection: string;
  adminStatsDesc: string;
  statsRefreshBtn: string;
  statsLastUpdated: string;
  statsOverviewHeading: string;
  statsUsersTotal: string;
  statsActiveSessions: string;
  statsSavedDownloads: string;
  statsTrackedEvents: string;
  statsTelegramStorage: string;
  statsAnnouncementsLabel: string;
  statsAdminsCount: string;
  statsNew24h: string;
  statsNew7d: string;
  statsNew30d: string;
  statsUniqueLinks: string;
  statsInspectsCount: string;
  statsCompletedCount: string;
  statsStreamsCount: string;
  statsErrorsCount: string;
  statsGuestEvents: string;
  statsRegisteredEvents: string;
  statsDailyActivityHeading: string;
  statsDailyActivityDesc: string;
  statsPlatformsHeading: string;
  statsQualitiesHeading: string;
  statsPreferencesHeading: string;
  statsLanguagesLabel: string;
  statsThemesLabel: string;
  statsDefaultQualitiesLabel: string;
  statsStorageHeading: string;
  statsDatabaseLabel: string;
  statsCacheDirLabel: string;
  statsYtDlpCacheLabel: string;
  statsBackupsLabel: string;
  statsMemoryCachesLabel: string;
  statsServicesHeading: string;
  statsSystemHeading: string;
  statsUptimeLabel: string;
  statsRamUsageLabel: string;
  statsCpuLoadLabel: string;
  statsNodeVersionLabel: string;
  statsLiveJobsHeading: string;
  statsRecentUsersHeading: string;
  statsRecentDownloadsHeading: string;
  statsSearchUsersPlaceholder: string;
  statsSearchDownloadsPlaceholder: string;
  statsEmptyList: string;
  statsLoadError: string;
  statsRetryBtn: string;
  statsAllPeriods: string;
  statsActive: string;
  statsInactive: string;
  statsConfigured: string;
  statsNotConfigured: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationDict> = {
  en: {
    dir: 'ltr',
    langName: 'English',
    heroTitle: 'Save media at full quality',
    heroSubtitle: 'Paste any supported video or audio link below and save it directly to your device storage.',
    linkPlaceholder: 'Paste video or audio link...',
    paste: 'Paste',
    clear: 'Clear',
    analyze: 'Fetch Info',
    analyzing: 'Checking link...',
    selectQuality: 'Choose quality',
    qualityLabels: {
      '4320p': { label: '4320p', sub: '8K Ultra HD' },
      '2160p': { label: '2160p', sub: '4K Ultra HD' },
      '1440p': { label: '1440p', sub: '2K QHD' },
      '1080p': { label: '1080p', sub: 'Full HD' },
      '720p': { label: '720p', sub: 'HD' },
      '480p': { label: '480p', sub: 'Standard' },
      '360p': { label: '360p', sub: 'Compact' },
      '240p': { label: '240p', sub: 'Low' },
      '144p': { label: '144p', sub: 'Minimal' },
      best: { label: 'Original', sub: 'Best' },
      audio: { label: 'Audio', sub: 'MP3 320k' },
    },
    downloadNow: 'Save to Device',
    prepareDownload: 'Download to App',
    cancelDownload: 'Cancel',
    downloadingToApp: 'Downloading in app...',
    processingMedia: 'Processing file...',
    saveFromSite: 'Download File to Device',
    readyInApp: 'File ready in app',
    preparing: 'Preparing stream...',
    downloading: 'Saving file...',
    savedToDevice: 'Saved to device storage',
    copyDownloadLink: 'Copy download link',
    linkCopied: 'Link copied',
    readyToSave: 'Ready to save',
    watchOnline: 'Watch Online',
    hidePlayer: 'Hide Player',
    viewImage: 'Preview Photo',
    hideImage: 'Hide Photo',
    viewPhotos: 'View Photos',
    hidePhotos: 'Hide Photos',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageLabel: 'Page',
    videoTab: 'Video',
    photosTab: 'Photos',
    carouselZipLabel: 'items · ZIP',
    imagePostLabel: 'Photo',
    audioTracksSection: 'Audio Tracks',
    audioOnlyLabel: 'Audio Only (MP3)',
    audioOnlyDesc: 'Save MP3 audio from selected track',
    subtitlesSection: 'Subtitles & Captions',
    manualSubtitlesLabel: 'Subtitles',
    autoSubtitlesLabel: 'Auto-generated Captions',
    subtitlesOff: 'Off',
    filterLanguagesPlaceholder: 'Filter languages...',
    downloadSubtitle: 'Download VTT',
    noSubtitlesFound: 'No matching languages',
    recentSaves: 'Saved History',
    emptySavesTitle: 'No saved files yet',
    emptySavesDesc: 'Fetched media and downloaded files will appear here for quick access.',
    emptySavesDescGuest:
      'Guests do not keep a history. Sign in and saved files will appear here.',
    reDownload: 'Save again',
    historyPlay: 'Play',
    historyDelete: 'Remove from history',
    historyTelegramStream: 'Telegram Stream',
    historyStreamLoading: 'Connecting to Telegram stream...',
    historyStreamError: 'Could not stream this file from Telegram.',
    historyZipUnsupported: 'ZIP archives cannot be streamed. Use Download instead.',
    invalidUrlError: 'Please enter a valid http or https media link.',
    inspectFailed: 'Could not read link details. Check the link and try again.',
    downloadFailed: 'Download failed. Please check the link or backend connection.',
    streamFailed: 'Online playback failed. Check the link or server proxy/cookies.',
    retryPlayback: 'Retry',
    youtubeEmbedFallback: 'Watch via YouTube Player',
    clipboardBlocked: 'Clipboard access blocked. Paste directly into the box.',
    swipeHint: 'Swipe horizontally to switch between Download and Settings',
    tabDownloadLabel: 'Download',
    tabSettingsLabel: 'Settings',
    settingsTitle: 'Settings',
    sectionAccount: 'Account',
    guestName: 'Guest User',
    guestSubtitle: 'Using Grove Save without an account',
    signedInAs: 'Signed in',
    signInOrCreate: 'Sign in or Create Account',
    signOut: 'Sign Out',
    editDisplayName: 'Change name',
    displayNamePlaceholder: 'Enter your name',
    saveNameBtn: 'Save',
    cancelBtn: 'Cancel',
    displayNameSaved: 'Name updated',
    displayNameRequiredError: 'Please enter a valid name.',
    displayNameUpdateFailed: 'Could not update name. Try again.',
    sectionAppearance: 'Appearance & Language',
    themeLabel: 'Theme',
    themeBlack: 'Pure Black',
    themeWhite: 'Pure White',
    themeSpring: 'Spring',
    themeSummer: 'Summer',
    themeAutumn: 'Autumn',
    themeWinter: 'Winter',
    themeShiraz: 'Shiraz Wine',
    themePastelDark: 'Pastel Dark',
    languageLabel: 'Language',
    sectionDownloads: 'Downloads & Storage',
    defaultQualityLabel: 'Default Quality',
    clearHistoryLabel: 'Clear Saved History',
    clearHistoryDone: 'Cleared',
    itemsCount: 'items',
    sectionAppServer: 'App',
    installAppLabel: 'Android App Install',
    installAppAction: 'Install App',
    installIOSAction: 'Add to Home Screen',
    installIOSGuideTitle: 'Install on iPhone / iPad',
    installIOSGuideBody: 'Tap Share in Safari, then choose Add to Home Screen.',
    close: 'Close',
    aboutLabel: 'Engine',
    aboutValue: 'Ad-free · Built-in Server',
    authModalTitle: 'Your Account',
    authModalSubtitle: 'Sync preferences across devices or continue as guest.',
    continueWithGoogle: 'Continue with Google',
    googleNotConfigured: 'Google Client ID is not configured on this server yet. Use email & password below or set GOOGLE_CLIENT_ID.',
    orUseEmail: 'or with email',
    modeSignIn: 'Sign In',
    modeRegister: 'Create Account',
    displayNameLabel: 'Name',
    emailLabel: 'Email / Gmail',
    passwordLabel: 'Password',
    submitSignIn: 'Sign In',
    submitRegister: 'Create Account',
    continueAsGuest: 'Continue as Guest',
    authErrorRequired: 'Please enter a valid email and a password of at least 6 characters.',
    offlineBanner: 'Offline mode — connect to fetch or save media.',
    // YouTube Auth Settings
    sectionYouTube: 'YouTube Authentication',
    youtubeCookiesLabel: 'Cookies',
    youtubeCookiesDesc: 'Export cookies from browser (Netscape format) for age-restricted/private videos',
    youtubeCookiesPlaceholder: 'Paste cookies in Netscape format...',
    youtubePoTokenLabel: 'PO Token',
    youtubePoTokenDesc: 'Proof of Origin token from youtube.com (optional, for bot detection bypass)',
    youtubePoTokenPlaceholder: 'Paste PO token...',
    youtubeSaveBtn: 'Save YouTube Auth',
    youtubeSaved: 'YouTube authentication saved',
    youtubeTestBtn: 'Test Connection',
    youtubeTestSuccess: 'YouTube authentication working',
    youtubeTestFailed: 'YouTube authentication failed',
    adminOnly: 'Admin only',
    sectionAdmin: 'Admin Panel',
    sectionXray: 'Xray VPN Proxy',
    xrayEnableLabel: 'Route downloads via Xray VPN',
    xrayEnableDesc: 'All inspect and download requests route through local Xray tunnel when enabled.',
    xrayConfigLabel: 'Server Link or Xray JSON Config',
    xrayConfigPlaceholder: 'vless://... or vmess://... or trojan://... or ss://... or { "outbounds": [...] }',
    xrayConfigDesc: 'Supports vless://, vmess://, trojan://, ss:// share links or full Xray JSON.',
    xraySaveBtn: 'Save & Apply',
    xrayTestBtn: 'Test VPN',
    xrayInstallBtn: 'Install Xray Core',
    xrayStatusConnected: 'Connected',
    xrayStatusStopped: 'Disconnected',
    xrayStatusNotInstalled: 'Xray core not installed',
    xraySavedMsg: 'Xray VPN settings applied',
    xrayInstalledMsg: 'Xray core installed successfully',
    xrayTestSuccess: 'YouTube test download succeeded',
    xrayTestFailed: 'YouTube test download failed',
    xrayTestUrlLabel: 'Default Short YouTube Test Video',
    xrayTestUrlDesc: 'Each config test downloads this video at lowest quality through the config tunnel.',
    xrayImportBtn: 'Import Configs to List',
    xrayImportMsg: 'Configs imported',
    xrayProfilesTitle: 'Saved Server Configs',
    xrayTestAllBtn: 'Test All on YouTube',
    xrayTestProfileBtn: 'Test YouTube',
    xrayActivateBtn: 'Use',
    xrayActiveLabel: 'Active',
    xrayDeleteBtn: 'Remove',
    xrayProfilesEmpty: 'No server configs imported yet. Paste one or multiple links above and click Import.',
    xrayTestedPass: 'Downloaded',
    xrayTestedFail: 'Failed',
    xrayTestConcurrencyLabel: 'Concurrency',
    xrayCancelTestBtn: 'Cancel Test',
    xrayTestCancelledMsg: 'Test cancelled',
    sectionPotProvider: 'PO Token Server (bgutil-ytdlp-pot-provider)',
    potEnableLabel: 'Auto-generate YouTube PO Tokens',
    potEnableDesc: 'Runs bgutil-ytdlp-pot-provider HTTP server and supplies fresh PO Tokens to yt-dlp.',
    potModeLabel: 'Server Mode',
    potModeManaged: 'Built-in Server',
    potModeExternal: 'External URL',
    potBaseUrlLabel: 'Provider Base URL',
    potPortLabel: 'Local Server Port',
    potStatusRunning: 'Running',
    potStatusStopped: 'Stopped',
    potStatusNotInstalled: 'Server not installed',
    potPluginMissing: 'yt-dlp bgutil plugin missing',
    potInstallBtn: 'Install Server & Plugin',
    potSaveBtn: 'Save & Apply',
    potTestBtn: 'Test PO Token Server',
    potSavedMsg: 'PO Token server settings applied',
    potInstalledMsg: 'bgutil server & yt-dlp plugin installed',
    potTestSuccess: 'PO Token minted',
    potTestFailed: 'PO Token test failed',
    potJsRuntimeSection: 'YouTube JS Runtimes (Deno & Node.js)',
    potJsRuntimeDesc: 'Controls which JavaScript engine yt-dlp uses to solve YouTube player challenges (EJS).',
    potJsRuntimeModeLabel: 'Active JS Runtime',
    potJsRuntimeAuto: 'Deno + Node.js (Auto)',
    potJsRuntimeDeno: 'Deno Only',
    potJsRuntimeNode: 'Node.js Only',
    potDenoReady: 'Deno ready',
    potDenoMissing: 'Deno not installed',
    potNodeReady: 'Node.js ready',
    potInstallDenoBtn: 'Install Deno',
    potDenoInstalledMsg: 'Deno runtime installed and activated',
    potEjsRemoteLabel: 'Download EJS challenge scripts (ejs:github)',
    potEjsRemoteDesc: 'Allows yt-dlp to fetch the latest YouTube signature solver components from GitHub.',
    backToSettings: 'Back to Settings',
    potPluginReady: 'yt-dlp plugin ready',
    youtubeCookiesSection: 'YouTube Cookies',
    youtubeSaveCookiesBtn: 'Save Cookies',
    xrayNavDesc: 'Manage servers, proxy tunnel & YouTube tests',
    potNavDesc: 'bgutil server, yt-dlp plugin & YouTube cookies',
    sectionTelegram: 'Telegram Storage',
    telegramNavDesc: 'Store downloads in a Telegram channel & serve direct links',
    telegramEnableLabel: 'Telegram storage',
    telegramEnableDesc: 'Publish finished downloads to your Telegram channel instead of the server disk.',
    telegramUploadLabel: 'Upload downloads',
    telegramUploadDesc: 'When on, every finished download is uploaded to the channel and removed from the server disk.',
    telegramDisklessActive: 'Diskless upload on — files go straight to Telegram.',
    telegramDisklessInactiveHint: 'Uploads are not active yet — turn on Upload or set a channel.',
    telegramNeedsChannel: 'Uploads are on but no chat is set — downloads will fail instead of using the disk. Message the bot (or add it to a channel), then save the token again.',
    telegramModeLabel: 'Account type',
    telegramModeUser: 'User account',
    telegramModeBot: 'Bot',
    telegramApiIdLabel: 'API ID',
    telegramApiHashLabel: 'API hash',
    telegramBotTokenLabel: 'Bot token',
    telegramChannelLabel: 'Channel',
    telegramChannelPlaceholder: '@my_channel or https://t.me/my_channel',
    telegramPhoneLabel: 'Phone number',
    telegramPhonePlaceholder: '+15551234567',
    telegramCodeLabel: 'Login code',
    telegramCodePlaceholder: '12345',
    telegramPasswordLabel: 'Two-step password',
    telegramPasswordPlaceholder: 'Only if two-step verification is enabled',
    telegramSendCodeBtn: 'Send code',
    telegramSignInBtn: 'Sign in',
    telegramSaveBtn: 'Save settings',
    telegramTestBtn: 'Test channel',
    telegramLogoutBtn: 'Disconnect',
    telegramConnected: 'Connected',
    telegramNotConnected: 'Not connected',
    telegramCodeSent: 'Login code sent to your Telegram app',
    telegramSignedInMsg: 'Signed in to Telegram',
    telegramSavedMsg: 'Telegram settings saved',
    telegramTestSuccess: 'Channel reachable',
    telegramTestFailed: 'Channel test failed',
    telegramNeedPassword: 'Two-step verification is on — enter the password',
    telegramApiIdDesc: 'Create an app at my.telegram.org to get your API ID and API hash.',
    telegramStorageTitle: 'Stored files',
    telegramStorageDesc: 'Every published file is tracked in the database with its owner and channel location.',
    telegramFilesCount: 'files',
    telegramOpenFileBtn: 'Open',
    telegramNoFiles: 'No files have been published yet.',
    telegramAccountLabel: 'Account',
    telegramSecretsHint: 'Secrets are stored on the server and never sent back to the browser.',
    cachePurgeTitle: 'Server disk',
    cachePurgeDesc:
      'Telegram is the storage. This deletes every cached download left on the server disk; published files stay available from Telegram.',
    cachePurgeBtn: 'Clear server cache',
    cachePurgeConfirm: 'Delete every cached file from the server disk? Downloads already published to Telegram are not affected.',
    cachePurgeDone: 'Server cache cleared.',
    cachePurgeFailed: 'Could not clear the server cache.',
    dbBackupSection: 'Database backup',
    dbBackupDesc: 'Download a consistent copy of the SQLite database (users, history, Telegram file index).',
    dbBackupBtn: 'Download backup',
    dbBackupStats: 'Database',
    dbBackupUsers: 'users',
    dbBackupHistory: 'history',
    dbBackupTelegram: 'Telegram files',
    dbBackupSize: 'size',
    dbBackupCreateBtn: 'Save backup on server',
    dbBackupCreatedMsg: 'Backup saved on the server.',
    dbBackupRestoreBtn: 'Restore backup',
    dbBackupRestoredMsg: 'Database restored successfully. Page will reload.',
    dbBackupServerTitle: 'Backups on the server',
    dbBackupEmpty: 'No server backups yet.',
    tabInfoLabel: 'Info',
    infoTitle: 'Information',
    announcementsTitle: 'Announcements',
    announcementsEmpty: 'No announcements have been posted yet.',
    infoAboutTitle: 'About Grove Save',
    infoAboutBody:
      'Grove Save is an ad-free, high-speed media downloader for saving videos, reels, carousels, photos, and MP3 audio from YouTube, Instagram, TikTok, X, and popular platforms directly to your device, with inline streaming, subtitle selection, and audio track support.',
    infoChannelTitle: 'Creator Team Telegram Channel',
    infoChannelDesc: 'Follow official updates, announcements, and releases from the Grove team.',
    infoOpenTelegram: 'Open',
    infoBotsTitle: 'Our Telegram Bots',
    infoBotsDesc: 'Official Grove downloader bots on Telegram.',
    infoBotMediaDesc: 'All-in-One Media Downloader',
    infoBotMusicDesc: 'Music & Spotify Downloader',
    infoBotYoutubeDesc: 'YouTube Video Downloader',
    infoBotPhDesc: 'Adult Video Downloader',
    infoFeaturesBtn: 'App Features',
    infoFeaturesTabAll: 'All',
    infoFeaturesTabPlatforms: 'Platforms',
    infoFeaturesTabGeneral: 'General',
    infoFeaturesPlatformsTitle: 'Supported Platforms & Download Features',
    infoFeaturesGeneralTitle: 'General Public Features',
    infoFeaturesPlatforms: [
      {
        id: 'youtube',
        name: 'YouTube',
        badge: 'Videos & Shorts',
        items: [
          'Download videos & Shorts from 144p up to 4K / 8K (when available) or Original quality',
          'Extract audio-only MP3 (320k) and choose between dubbed or original audio tracks',
          'Download manual & auto-generated subtitles (VTT) or view captions in-player',
          'Inline online video playback with vertical Shorts view and player fallback',
        ],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        badge: 'Reels, Posts & Stories',
        items: [
          'Save Reels, video posts, and Stories at original quality',
          'Download single photo posts with instant inline photo preview',
          'Bundle multi-item carousels (photos & videos) into a single ZIP file',
          'Stream videos online directly before saving to your device',
        ],
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        badge: 'Videos & Slideshows',
        items: [
          'Download watermark-free TikTok videos at best available quality',
          'Save photo slideshows (packaged as ZIP) and single image posts',
          'Extract MP3 audio directly from TikTok clips',
          'Instant online video playback and thumbnail preview',
        ],
      },
      {
        id: 'x',
        name: 'X (Twitter)',
        badge: 'Videos, GIFs & Photos',
        items: [
          'Download tweet videos and GIFs at highest quality',
          'Save single photos or multi-photo posts (bundled as ZIP)',
          'Works seamlessly with x.com, twitter.com, fxtwitter.com, vxtwitter.com, and t.co links',
          'Built-in video streaming and photo preview',
        ],
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        badge: 'Pins, Videos, GIFs & Carousels',
        items: [
          'Save single image pins at highest resolution (Originals > 1200x > 736x)',
          'Download multi-slide carousel pins as ZIP with paginated all-image preview',
          'Download video pins (MP4 & HLS streams), animated GIFs, or extract MP3 audio',
          'Supports pinterest.com, international Pinterest domains, and pin.it short links',
        ],
      },
    ],
    infoFeaturesGeneral: [
      {
        id: 'download-flow',
        title: 'Smart Link & Download Flow',
        items: [
          'One-tap paste, automatic URL inspection, and live download progress with cancel support',
          'Save directly to device storage or copy the direct download link',
        ],
      },
      {
        id: 'player-tools',
        title: 'Built-in Player & Media Tools',
        items: [
          'Custom online video player with subtitle overlay and multi-audio track switching',
          'MP3 (320k) audio-only mode and searchable VTT subtitle list',
        ],
      },
      {
        id: 'account-history',
        title: 'Account & Saved History',
        items: [
          'Use instantly as a guest without signing in, or sign in with email/Google',
          'Keep your personal Saved History synced for quick re-downloads',
        ],
      },
      {
        id: 'ui-pwa',
        title: 'Design, Languages & App Install',
        items: [
          'Ad-free interface with Pure Black and Pure White themes',
          'Full support for English, Persian (RTL), Russian, and Chinese + installable PWA for Android & iOS',
        ],
      },
    ],
    adminAnnouncementsSection: 'Announcements',
    adminAnnouncementsDesc: 'Publish notices displayed in the Info tab for all users',
    announcementTitleLabel: 'Title (optional)',
    announcementTitlePlaceholder: 'e.g. Server update or new feature',
    announcementBodyLabel: 'Announcement text',
    announcementBodyPlaceholder: 'Write an announcement for all users...',
    announcementPublishBtn: 'Publish Announcement',
    announcementPublishedMsg: 'Announcement published for all users.',
    announcementDeleteBtn: 'Delete',
    announcementDeletedMsg: 'Announcement removed.',
    announcementEmptyAdmin: 'No announcements published yet.',
    adminLogsTitle: 'Application Logs',
    adminLogsAll: 'All',
    adminLogsInfo: 'Info',
    adminLogsWarn: 'Warn',
    adminLogsError: 'Error',
    adminLogsRefresh: 'Refresh',
    adminLogsClear: 'Clear',
    adminLogsCopy: 'Copy',
    adminLogsCopied: 'Copied',
    adminLogsPause: 'Pause',
    adminLogsResume: 'Live',
    adminLogsEmpty: 'No logs recorded yet.',
    adminStatsSection: 'Statistics',
    adminStatsDesc: 'Users, downloads, platforms, storage, and live system telemetry',
    statsRefreshBtn: 'Refresh',
    statsLastUpdated: 'Updated',
    statsOverviewHeading: 'Overview',
    statsUsersTotal: 'Registered Users',
    statsActiveSessions: 'Active Sessions',
    statsSavedDownloads: 'Saved History',
    statsTrackedEvents: 'Tracked Activity',
    statsTelegramStorage: 'Telegram Archive',
    statsAnnouncementsLabel: 'Announcements',
    statsAdminsCount: 'Admins',
    statsNew24h: '24h',
    statsNew7d: '7d',
    statsNew30d: '30d',
    statsUniqueLinks: 'Unique URLs',
    statsInspectsCount: 'Inspects',
    statsCompletedCount: 'Completed',
    statsStreamsCount: 'Streams',
    statsErrorsCount: 'Errors',
    statsGuestEvents: 'Guests',
    statsRegisteredEvents: 'Signed-in',
    statsDailyActivityHeading: '14-Day Activity',
    statsDailyActivityDesc: 'Daily link inspects, completed downloads, and new signups',
    statsPlatformsHeading: 'Platforms Breakdown',
    statsQualitiesHeading: 'Formats & Qualities',
    statsPreferencesHeading: 'User Preferences',
    statsLanguagesLabel: 'Languages',
    statsThemesLabel: 'Themes',
    statsDefaultQualitiesLabel: 'Default Quality',
    statsStorageHeading: 'Database, Disk & Caches',
    statsDatabaseLabel: 'SQLite Database',
    statsCacheDirLabel: 'Media Cache',
    statsYtDlpCacheLabel: 'yt-dlp Cache',
    statsBackupsLabel: 'Snapshots',
    statsMemoryCachesLabel: 'In-Memory Caches',
    statsServicesHeading: 'Services Status',
    statsSystemHeading: 'Server & Runtime',
    statsUptimeLabel: 'Uptime',
    statsRamUsageLabel: 'Process / System RAM',
    statsCpuLoadLabel: 'CPU & Load Avg',
    statsNodeVersionLabel: 'Runtime',
    statsLiveJobsHeading: 'Active & Recent Jobs',
    statsRecentUsersHeading: 'Recent Users',
    statsRecentDownloadsHeading: 'Recent Downloads',
    statsSearchUsersPlaceholder: 'Filter users by name or email...',
    statsSearchDownloadsPlaceholder: 'Filter downloads by title or platform...',
    statsEmptyList: 'No records yet.',
    statsLoadError: 'Could not load admin statistics.',
    statsRetryBtn: 'Retry',
    statsAllPeriods: 'All time',
    statsActive: 'Active',
    statsInactive: 'Off',
    statsConfigured: 'Configured',
    statsNotConfigured: 'Not set',
  },
  fa: {
    dir: 'rtl',
    langName: 'فارسی',
    heroTitle: 'ذخیره مستقیم رسانه با کیفیت دلخواه',
    heroSubtitle: 'لینک ویدیو یا فایل صوتی را در کادر زیر وارد کنید تا با کیفیت انتخابی در حافظه دستگاه ذخیره شود.',
    linkPlaceholder: 'لینک ویدیو یا صوت را وارد کنید...',
    paste: 'جایگذاری',
    clear: 'پاک کردن',
    analyze: 'بررسی لینک',
    analyzing: 'در حال بررسی لینک...',
    selectQuality: 'انتخاب کیفیت',
    qualityLabels: {
      '4320p': { label: '4320p', sub: 'کیفیت 8K' },
      '2160p': { label: '2160p', sub: 'کیفیت 4K' },
      '1440p': { label: '1440p', sub: 'کیفیت 2K' },
      '1080p': { label: '1080p', sub: 'فول اچ‌دی' },
      '720p': { label: '720p', sub: 'اچ‌دی' },
      '480p': { label: '480p', sub: 'معمولی' },
      '360p': { label: '360p', sub: 'کم‌حجم' },
      '240p': { label: '240p', sub: 'حجم پایین' },
      '144p': { label: '144p', sub: 'حداقل حجم' },
      best: { label: 'اصلی', sub: 'بهترین کیفیت' },
      audio: { label: 'صوت', sub: 'MP3 320k' },
    },
    downloadNow: 'ذخیره در حافظه گوشی',
    prepareDownload: 'دانلود فایل در برنامه',
    cancelDownload: 'لغو دانلود',
    downloadingToApp: 'در حال دانلود در برنامه...',
    processingMedia: 'در حال آماده‌سازی فایل...',
    saveFromSite: 'دانلود از سایت در حافظه گوشی',
    readyInApp: 'فایل در برنامه آماده شد',
    preparing: 'در حال آماده‌سازی...',
    downloading: 'در حال ذخیره فایل...',
    savedToDevice: 'در حافظه دستگاه ذخیره شد',
    copyDownloadLink: 'کپی لینک دانلود',
    linkCopied: 'لینک کپی شد',
    readyToSave: 'آماده برای ذخیره',
    watchOnline: 'پخش آنلاین',
    hidePlayer: 'بستن پخش‌کننده',
    viewImage: 'نمایش تصویر',
    hideImage: 'بستن تصویر',
    viewPhotos: 'نمایش تصاویر',
    hidePhotos: 'بستن تصاویر',
    previousPage: 'قبلی',
    nextPage: 'بعدی',
    pageLabel: 'صفحه',
    videoTab: 'ویدیو',
    photosTab: 'تصاویر',
    carouselZipLabel: 'مورد · ZIP',
    imagePostLabel: 'تصویر',
    audioTracksSection: 'زبان‌های صدا',
    audioOnlyLabel: 'فقط صوت (MP3)',
    audioOnlyDesc: 'دانلود فایل صوتی MP3 از صدای انتخاب‌شده',
    subtitlesSection: 'زیرنویس‌ها',
    manualSubtitlesLabel: 'زیرنویس‌های اصلی',
    autoSubtitlesLabel: 'زیرنویس خودکار یوتیوب',
    subtitlesOff: 'خاموش',
    filterLanguagesPlaceholder: 'جستجوی زبان...',
    downloadSubtitle: 'دانلود زیرنویس VTT',
    noSubtitlesFound: 'زبانی با این عنوان پیدا نشد',
    recentSaves: 'تاریخچه دانلودها',
    emptySavesTitle: 'هنوز فایلی ذخیره نشده',
    emptySavesDesc: 'رسانه‌های بررسی‌شده و دانلودهای شما برای دسترسی سریع اینجا نمایش داده می‌شوند.',
    emptySavesDescGuest:
      'حالت مهمان تاریخچه‌ای ندارد. پس از ورود، فایل‌های ذخیره‌شده اینجا نمایش داده می‌شوند.',
    reDownload: 'دانلود مجدد',
    historyPlay: 'پخش',
    historyDelete: 'حذف از تاریخچه',
    historyTelegramStream: 'استریم تلگرام',
    historyStreamLoading: 'در حال اتصال به استریم تلگرام...',
    historyStreamError: 'پخش استریم از تلگرام انجام نشد.',
    historyZipUnsupported: 'فایل ZIP قابل پخش نیست؛ از دکمه دانلود استفاده کنید.',
    invalidUrlError: 'لطفاً یک لینک معتبر با http یا https وارد کنید.',
    inspectFailed: 'دریافت اطلاعات لینک انجام نشد. لینک را بررسی کنید.',
    downloadFailed: 'دانلود ناموفق بود. اتصال سرور یا لینک را بررسی کنید.',
    streamFailed: 'پخش آنلاین ناموفق بود. لینک یا تنظیمات پروکسی و کوکی سرور را بررسی کنید.',
    retryPlayback: 'تلاش مجدد',
    youtubeEmbedFallback: 'پخش با پلیر یوتیوب',
    clipboardBlocked: 'دسترسی به کلیپ‌بورد مسدود است. لینک را دستی جایگذاری کنید.',
    swipeHint: 'برای جابه‌جایی بین صفحات انگشت خود را به چپ یا راست بکشید',
    tabDownloadLabel: 'دانلود',
    tabSettingsLabel: 'تنظیمات',
    settingsTitle: 'تنظیمات',
    sectionAccount: 'حساب کاربری',
    guestName: 'کاربر مهمان',
    guestSubtitle: 'استفاده از برنامه بدون ورود به حساب',
    signedInAs: 'وارد شده',
    signInOrCreate: 'ورود یا ساخت حساب کاربری',
    signOut: 'خروج از حساب',
    editDisplayName: 'تغییر نام',
    displayNamePlaceholder: 'نام جدید خود را وارد کنید',
    saveNameBtn: 'ذخیره',
    cancelBtn: 'انصراف',
    displayNameSaved: 'نام شما به‌روزرسانی شد',
    displayNameRequiredError: 'لطفاً یک نام معتبر وارد کنید.',
    displayNameUpdateFailed: 'تغییر نام انجام نشد. دوباره تلاش کنید.',
    sectionAppearance: 'ظاهر و زبان',
    themeLabel: 'تم برنامه',
    themeBlack: 'کاملاً سیاه',
    themeWhite: 'کاملاً سفید',
    themeSpring: 'بهار',
    themeSummer: 'تابستون',
    themeAutumn: 'پاییز',
    themeWinter: 'زمستون',
    themeShiraz: 'شراب شیراز',
    themePastelDark: 'دارک',
    languageLabel: 'زبان',
    sectionDownloads: 'دانلودها و حافظه',
    defaultQualityLabel: 'کیفیت پیش‌فرض',
    clearHistoryLabel: 'پاک کردن تاریخچه',
    clearHistoryDone: 'پاک شد',
    itemsCount: 'مورد',
    sectionAppServer: 'برنامه',
    installAppLabel: 'نصب وب‌اپلیکیشن اندروید',
    installAppAction: 'نصب برنامه',
    installIOSAction: 'افزودن به صفحه اصلی',
    installIOSGuideTitle: 'نصب در آیفون و آیپد',
    installIOSGuideBody: 'در مرورگر سافاری دکمه Share را بزنید و گزینه Add to Home Screen را انتخاب کنید.',
    close: 'بستن',
    aboutLabel: 'موتور پردازش',
    aboutValue: 'بدون تبلیغات · سرور داخلی',
    authModalTitle: 'حساب کاربری',
    authModalSubtitle: 'تنظیمات خود را همگام‌سازی کنید یا به عنوان مهمان ادامه دهید.',
    continueWithGoogle: 'ورود با گوگل',
    googleNotConfigured: 'شناسه Google Client ID هنوز روی سرور تنظیم نشده است. از جیمیل و رمز عبور پایین استفاده کنید.',
    orUseEmail: 'یا با جیمیل و رمز عبور',
    modeSignIn: 'ورود',
    modeRegister: 'ثبت‌نام',
    displayNameLabel: 'نام نمایشی',
    emailLabel: 'جیمیل / ایمیل',
    passwordLabel: 'رمز عبور',
    submitSignIn: 'ورود به حساب',
    submitRegister: 'ساخت حساب',
    continueAsGuest: 'ادامه به عنوان مهمان',
    authErrorRequired: 'لطفاً جیمیل معتبر و رمز عبور حداقل ۶ کاراکتری وارد کنید.',
    offlineBanner: 'حالت آفلاین — برای دریافت فایل به اینترنت متصل شوید.',
    // YouTube Auth Settings
    sectionYouTube: 'احراز هویت یوتیوب',
    youtubeCookiesLabel: 'کوکی‌ها',
    youtubeCookiesDesc: 'کوکی‌ها را از مرورگر صادر کنید (فرمت نتسکیپ) برای ویدیوهای محدود سنی/خصوصی',
    youtubeCookiesPlaceholder: 'کوکی‌ها را در فرمت نتسکیپ جایگذاری کنید...',
    youtubePoTokenLabel: 'توکن PO',
    youtubePoTokenDesc: 'توکن Proof of Origin از youtube.com (اختیاری، برای عبور از تشخیص ربات)',
    youtubePoTokenPlaceholder: 'توکن PO را جایگذاری کنید...',
    youtubeSaveBtn: 'ذخیره احراز هویت یوتیوب',
    youtubeSaved: 'احراز هویت یوتیوب ذخیره شد',
    youtubeTestBtn: 'تست اتصال',
    youtubeTestSuccess: 'احراز هویت یوتیوب کار می‌کند',
    youtubeTestFailed: 'احراز هویت یوتیوب ناموفق بود',
    adminOnly: 'فقط ادمین',
    sectionAdmin: 'پنل مدیریت',
    sectionXray: 'وی‌پی‌ان Xray',
    xrayEnableLabel: 'استفاده از وی‌پی‌ان Xray هنگام دانلود',
    xrayEnableDesc: 'در صورت فعال بودن، بررسی لینک و دانلودها از طریق تونل Xray انجام می‌شود.',
    xrayConfigLabel: 'لینک کانفیگ یا JSON کامل Xray',
    xrayConfigPlaceholder: 'vless://... یا vmess://... یا trojan://... یا ss://... یا کانفیگ JSON',
    xrayConfigDesc: 'پشتیبانی از لینک‌های vless://، vmess://، trojan://، ss:// و فایل کانفیگ JSON.',
    xraySaveBtn: 'ذخیره و اعمال',
    xrayTestBtn: 'تست وی‌پی‌ان',
    xrayInstallBtn: 'نصب هسته Xray',
    xrayStatusConnected: 'متصل',
    xrayStatusStopped: 'متوقف',
    xrayStatusNotInstalled: 'هسته Xray نصب نیست',
    xraySavedMsg: 'تنظیمات وی‌پی‌ان Xray اعمال شد',
    xrayInstalledMsg: 'هسته Xray با موفقیت نصب شد',
    xrayTestSuccess: 'دانلود تستی از یوتیوب با موفقیت انجام شد',
    xrayTestFailed: 'تست دانلود یوتیوب ناموفق بود',
    xrayTestUrlLabel: 'لینک ویدیوی کوتاه پیش‌فرض یوتیوب برای تست',
    xrayTestUrlDesc: 'تست هر کانفیگ این ویدیو را با پایین‌ترین کیفیت از طریق همان کانفیگ دانلود می‌کند.',
    xrayImportBtn: 'افزودن به لیست کانفیگ‌ها',
    xrayImportMsg: 'کانفیگ‌ها به لیست اضافه شدند',
    xrayProfilesTitle: 'لیست کانفیگ‌های ذخیره‌شده',
    xrayTestAllBtn: 'تست همه روی یوتیوب',
    xrayTestProfileBtn: 'تست یوتیوب',
    xrayActivateBtn: 'فعال‌سازی',
    xrayActiveLabel: 'فعال',
    xrayDeleteBtn: 'حذف',
    xrayProfilesEmpty: 'هنوز کانفیگی اضافه نشده است. لینک‌ها را خط‌به‌خط بالا وارد کنید و دکمه افزودن را بزنید.',
    xrayTestedPass: 'دانلود موفق',
    xrayTestedFail: 'ناموفق',
    xrayTestConcurrencyLabel: 'همزمانی تست',
    xrayCancelTestBtn: 'لغو تست',
    xrayTestCancelledMsg: 'تست لغو شد',
    sectionPotProvider: 'سرور PO Token (bgutil-ytdlp-pot-provider)',
    potEnableLabel: 'تولید خودکار PO Token برای یوتیوب',
    potEnableDesc: 'سرور bgutil-ytdlp-pot-provider را اجرا کرده و هنگام دانلود به yt-dlp متصل می‌کند.',
    potModeLabel: 'حالت سرور',
    potModeManaged: 'سرور داخلی برنامه',
    potModeExternal: 'آدرس سرور خارجی',
    potBaseUrlLabel: 'آدرس پایه سرور (Base URL)',
    potPortLabel: 'پورت لوکال سرور',
    potStatusRunning: 'در حال اجرا',
    potStatusStopped: 'متوقف',
    potStatusNotInstalled: 'سرور نصب نیست',
    potPluginMissing: 'افزونه bgutil برای yt-dlp نصب نیست',
    potInstallBtn: 'نصب سرور و افزونه',
    potSaveBtn: 'ذخیره و اعمال',
    potTestBtn: 'تست سرور PO Token',
    potSavedMsg: 'تنظیمات سرور PO Token اعمال شد',
    potInstalledMsg: 'سرور bgutil و افزونه yt-dlp نصب شد',
    potTestSuccess: 'توکن PO با موفقیت تولید شد',
    potTestFailed: 'تست سرور PO Token ناموفق بود',
    potJsRuntimeSection: 'موتورهای جاوااسکریپت یوتیوب (Deno و Node.js)',
    potJsRuntimeDesc: 'تعیین می‌کند yt-dlp برای حل چالش‌های پخش‌کننده یوتیوب (EJS) از کدام موتور استفاده کند.',
    potJsRuntimeModeLabel: 'موتور جاوااسکریپت فعال',
    potJsRuntimeAuto: 'Deno + Node.js (خودکار)',
    potJsRuntimeDeno: 'فقط Deno',
    potJsRuntimeNode: 'فقط Node.js',
    potDenoReady: 'Deno آماده است',
    potDenoMissing: 'Deno نصب نیست',
    potNodeReady: 'Node.js آماده است',
    potInstallDenoBtn: 'نصب Deno',
    potDenoInstalledMsg: 'موتور Deno نصب و فعال شد',
    potEjsRemoteLabel: 'دریافت اسکریپت‌های EJS از گیت‌هاب (ejs:github)',
    potEjsRemoteDesc: 'به yt-dlp اجازه می‌دهد جدیدترین ماژول‌های حل امضای یوتیوب را دریافت کند.',
    backToSettings: 'بازگشت به تنظیمات',
    potPluginReady: 'افزونه yt-dlp آماده است',
    youtubeCookiesSection: 'کوکی‌های یوتیوب',
    youtubeSaveCookiesBtn: 'ذخیره کوکی‌ها',
    xrayNavDesc: 'مدیریت سرورها، تونل وی‌پی‌ان و تست دانلود یوتیوب',
    potNavDesc: 'سرور bgutil، افزونه yt-dlp و کوکی‌های یوتیوب',
    sectionTelegram: 'ذخیره‌سازی تلگرام',
    telegramNavDesc: 'ذخیره دانلودها در کانال تلگرام و ساخت لینک مستقیم',
    telegramEnableLabel: 'ذخیره‌سازی روی تلگرام',
    telegramEnableDesc: 'دانلودهای آماده به‌جای دیسک سرور در کانال تلگرام منتشر می‌شوند.',
    telegramUploadLabel: 'آپلود دانلودها',
    telegramUploadDesc: 'وقتی روشن باشد، هر دانلود تمام‌شده به کانال آپلود و از دیسک سرور حذف می‌شود.',
    telegramDisklessActive: 'آپلود بدون دیسک فعال است — فایل‌ها مستقیم به تلگرام می‌روند.',
    telegramDisklessInactiveHint: 'آپلود هنوز فعال نیست — گزینه آپلود را روشن کنید یا کانال را تنظیم کنید.',
    telegramNeedsChannel: 'آپلود فعال است ولی چتی تعیین نشده — دانلودها بهجای دیسک، خطا میدهند. به ربات پیام بدهید (یا آن را به کانال اضافه کنید) و توکن را دوباره ذخیره کنید.',
    telegramModeLabel: 'نوع حساب',
    telegramModeUser: 'حساب کاربری',
    telegramModeBot: 'ربات',
    telegramApiIdLabel: 'API ID',
    telegramApiHashLabel: 'API hash',
    telegramBotTokenLabel: 'توکن ربات',
    telegramChannelLabel: 'کانال',
    telegramChannelPlaceholder: '@my_channel یا https://t.me/my_channel',
    telegramPhoneLabel: 'شماره تلفن',
    telegramPhonePlaceholder: '+989121234567',
    telegramCodeLabel: 'کد ورود',
    telegramCodePlaceholder: '12345',
    telegramPasswordLabel: 'رمز تأیید دو مرحله‌ای',
    telegramPasswordPlaceholder: 'فقط اگر تأیید دو مرحله‌ای فعال است',
    telegramSendCodeBtn: 'ارسال کد',
    telegramSignInBtn: 'ورود',
    telegramSaveBtn: 'ذخیره تنظیمات',
    telegramTestBtn: 'تست کانال',
    telegramLogoutBtn: 'قطع اتصال',
    telegramConnected: 'متصل',
    telegramNotConnected: 'متصل نیست',
    telegramCodeSent: 'کد ورود به تلگرام شما ارسال شد',
    telegramSignedInMsg: 'ورود به تلگرام انجام شد',
    telegramSavedMsg: 'تنظیمات تلگرام ذخیره شد',
    telegramTestSuccess: 'کانال در دسترس است',
    telegramTestFailed: 'تست کانال ناموفق بود',
    telegramNeedPassword: 'تأیید دو مرحله‌ای فعال است — رمز را وارد کنید',
    telegramApiIdDesc: 'برای دریافت API ID و API hash در my.telegram.org یک اپلیکیشن بسازید.',
    telegramStorageTitle: 'فایل‌های ذخیره‌شده',
    telegramStorageDesc: 'هر فایل منتشرشده همراه با مالک و محل کانال در دیتابیس ثبت می‌شود.',
    telegramFilesCount: 'فایل',
    telegramOpenFileBtn: 'باز کردن',
    telegramNoFiles: 'هنوز فایلی منتشر نشده است.',
    telegramAccountLabel: 'حساب',
    telegramSecretsHint: 'اطلاعات محرمانه روی سرور نگه‌داری می‌شود و هرگز به مرورگر بازگردانده نمی‌شود.',
    cachePurgeTitle: 'دیسک سرور',
    cachePurgeDesc:
      'دیسک برنامه همان تلگرام است. این دکمه هر فایل کش‌شده روی دیسک سرور را پاک می‌کند؛ فایل‌هایی که در تلگرام منتشر شده‌اند همچنان قابل دانلود می‌مانند.',
    cachePurgeBtn: 'پاک‌سازی کش سرور',
    cachePurgeConfirm:
      'همهٔ فایل‌های کش‌شده روی دیسک سرور حذف شوند؟ فایل‌های منتشرشده در تلگرام آسیبی نمی‌بینند.',
    cachePurgeDone: 'کش سرور پاک شد.',
    cachePurgeFailed: 'پاک‌سازی کش سرور انجام نشد.',
    dbBackupSection: 'بکاپ دیتابیس',
    dbBackupDesc: 'دریافت یک نسخه یکدست از دیتابیس SQLite (کاربران، تاریخچه و فهرست فایل‌های تلگرام).',
    dbBackupBtn: 'دانلود بکاپ',
    dbBackupStats: 'دیتابیس',
    dbBackupUsers: 'کاربر',
    dbBackupHistory: 'تاریخچه',
    dbBackupTelegram: 'فایل تلگرام',
    dbBackupSize: 'حجم',
    dbBackupCreateBtn: 'ذخیره بکاپ روی سرور',
    dbBackupCreatedMsg: 'بکاپ روی سرور ذخیره شد.',
    dbBackupRestoreBtn: 'وارد کردن بکاپ',
    dbBackupRestoredMsg: 'دیتابیس با موفقیت بازیابی شد. صفحه مجدداً بارگذاری می‌شود.',
    dbBackupServerTitle: 'بکاپ‌های روی سرور',
    dbBackupEmpty: 'هنوز بکاپی روی سرور ذخیره نشده است.',
    tabInfoLabel: 'اطلاعات',
    infoTitle: 'اطلاعات برنامه',
    announcementsTitle: 'اطلاعیه',
    announcementsEmpty: 'در حال حاضر اطلاعیه‌ای ثبت نشده است.',
    infoAboutTitle: 'درباره Grove Save',
    infoAboutBody:
      'Grove Save یک دانلودر سریع و بدون تبلیغات برای ذخیره مستقیم ویدیوها، ریلز، پست‌های چنداسلایدی، تصاویر و فایل صوتی MP3 از یوتیوب، اینستاگرام، تیک‌تاک، ایکس (X) و پلتفرم‌های محبوب است که امکانات پخش آنلاین، انتخاب زبان صدا و دانلود زیرنویس را هم ارائه می‌دهد.',
    infoChannelTitle: 'کانال تلگرامی تیم سازنده',
    infoChannelDesc: 'برای دریافت آخرین اخبار، آپدیت‌ها و اطلاعیه‌های تیم سازنده به کانال ما بپیوندید.',
    infoOpenTelegram: 'ورود به تلگرام',
    infoBotsTitle: 'ربات‌های تلگرامی ما',
    infoBotsDesc: 'ربات‌های رسمی دانلودر تیم Grove در تلگرام.',
    infoBotMediaDesc: 'دانلودر جامع رسانه',
    infoBotMusicDesc: 'دانلودر موزیک و اسپاتیفای',
    infoBotYoutubeDesc: 'دانلودر ویدیو یوتیوب',
    infoBotPhDesc: 'دانلودر ویدیو پورن',
    infoFeaturesBtn: 'قابلیت‌های برنامه',
    infoFeaturesTabAll: 'همه بخش‌ها',
    infoFeaturesTabPlatforms: 'پلتفرم‌ها',
    infoFeaturesTabGeneral: 'امکانات عمومی',
    infoFeaturesPlatformsTitle: 'قابلیت‌های دانلود بر اساس پلتفرم',
    infoFeaturesGeneralTitle: 'قابلیت‌های عمومی برنامه',
    infoFeaturesPlatforms: [
      {
        id: 'youtube',
        name: 'یوتیوب (YouTube)',
        badge: 'ویدیو و شورتس',
        items: [
          'دانلود ویدیوها و Shorts از کیفیت 144p تا 4K و 8K (در صورت وجود) یا کیفیت اصلی',
          'استخراج صوت خالص با فرمت MP3 (320k) و امکان انتخاب زبان صدای دوبله یا اصلی',
          'دریافت زیرنویس‌های دستی و خودکار (فرمت VTT) و نمایش زیرنویس روی پخش‌کننده',
          'پخش آنلاین مستقیم درون برنامه با نمایش عمودی برای Shorts',
        ],
      },
      {
        id: 'instagram',
        name: 'اینستاگرام (Instagram)',
        badge: 'ریلز، پست و استوری',
        items: [
          'دانلود ریلز، ویدیوها و استوری‌ها با کیفیت اصلی',
          'ذخیره تک‌عکس‌ها همراه با پیش‌نمایش مستقیم تصویر درون برنامه',
          'دانلود پست‌های چنداسلایدی (عکس و ویدیو) به‌صورت یکجا در قالب فایل ZIP',
          'امکان پخش آنلاین ویدیو پیش از ذخیره در حافظه گوشی',
        ],
      },
      {
        id: 'tiktok',
        name: 'تیک‌تاک (TikTok)',
        badge: 'ویدیو و اسلایدشو',
        items: [
          'دانلود ویدیوهای تیک‌تاک بدون واترمارک با بالاترین کیفیت موجود',
          'ذخیره پست‌های چندتصویری (در قالب ZIP) و تک‌تصویرها',
          'استخراج فایل صوتی MP3 از کلیپ‌های تیک‌تاک',
          'پخش آنلاین فوری و پیش‌نمایش تصویر بندانگشتی',
        ],
      },
      {
        id: 'x',
        name: 'ایکس / توییتر (X)',
        badge: 'ویدیو، گیف و تصویر',
        items: [
          'دانلود ویدیوها و گیف‌های پست‌ها با بهترین کیفیت',
          'ذخیره تک‌عکس و پست‌های چندتصویری (بسته‌بندی شده در فایل ZIP)',
          'پشتیبانی از لینک‌های x.com، twitter.com، fxtwitter.com، vxtwitter.com و t.co',
          'پیش‌نمایش عکس و پخش آنلاین ویدیو درون برنامه',
        ],
      },
      {
        id: 'pinterest',
        name: 'پینترست (Pinterest)',
        badge: 'پین، ویدیو، گیف و کاروسل',
        items: [
          'دانلود تک‌عکس پین‌ها با بالاترین کیفیت موجود (Originals > 1200x > 736x)',
          'دانلود کاروسل‌های چندتصویری با فایل ZIP همراه با پیش‌نمایش صفحه‌ای همه تصاویر',
          'دانلود پین‌های ویدیویی (MP4 و استریم HLS)، گیف متحرک و استخراج صوت MP3',
          'پشتیبانی کامل از لینک‌های pinterest و لینک‌های کوتاه pin.it',
        ],
      },
    ],
    infoFeaturesGeneral: [
      {
        id: 'download-flow',
        title: 'بررسی لینک و دانلود هوشمند',
        items: [
          'جایگذاری سریع لینک، نمایش حجم و جزئیات فایل و نوار پیشرفت زنده با امکان لغو دانلود',
          'ذخیره مستقیم در حافظه دستگاه یا کپی لینک دانلود با یک لمس',
        ],
      },
      {
        id: 'player-tools',
        title: 'پخش‌کننده داخلی و ابزارهای رسانه',
        items: [
          'پخش‌کننده اختصاصی آنلاین با پشتیبانی از زیرنویس و تغییر زبان صدا',
          'حالت دانلود فقط صوت (MP3 320k) و جستجوی سریع میان زبان‌های زیرنویس',
        ],
      },
      {
        id: 'account-history',
        title: 'حساب کاربری و تاریخچه',
        items: [
          'استفاده سریع به‌عنوان مهمان بدون نیاز به ثبت‌نام یا ورود با ایمیل و گوگل',
          'نگهداری تاریخچه دانلودها در حساب کاربری برای دسترسی و دانلود مجدد سریع',
        ],
      },
      {
        id: 'ui-pwa',
        title: 'طراحی، زبان و نصب برنامه',
        items: [
          'محیط کاملاً بدون تبلیغات با دو تم کاملاً سیاه و کاملاً سفید',
          'پشتیبانی از ۴ زبان (فارسی، انگلیسی، روسی، چینی) و قابلیت نصب به‌صورت وب‌اپ (PWA) روی اندروید و آیفون',
        ],
      },
    ],
    adminAnnouncementsSection: 'مدیریت اطلاعیه‌ها',
    adminAnnouncementsDesc: 'انتشار اطلاعیه در بخش اطلاعات برای نمایش به همه کاربران',
    announcementTitleLabel: 'عنوان اطلاعیه (اختیاری)',
    announcementTitlePlaceholder: 'مثلاً: آپدیت جدید برنامه یا اطلاعیه سرور',
    announcementBodyLabel: 'متن اطلاعیه',
    announcementBodyPlaceholder: 'متن اطلاعیه خود را برای همه کاربران بنویسید...',
    announcementPublishBtn: 'انتشار اطلاعیه',
    announcementPublishedMsg: 'اطلاعیه با موفقیت منتشر شد.',
    announcementDeleteBtn: 'حذف',
    announcementDeletedMsg: 'اطلاعیه حذف شد.',
    announcementEmptyAdmin: 'هنوز اطلاعیه‌ای منتشر نشده است.',
    adminLogsTitle: 'لاگ‌های برنامه',
    adminLogsAll: 'همه',
    adminLogsInfo: 'اطلاعات',
    adminLogsWarn: 'هشدار',
    adminLogsError: 'خطا',
    adminLogsRefresh: 'بروزرسانی',
    adminLogsClear: 'پاک کردن',
    adminLogsCopy: 'کپی',
    adminLogsCopied: 'کپی شد',
    adminLogsPause: 'توقف',
    adminLogsResume: 'زنده',
    adminLogsEmpty: 'هنوز لاگی ثبت نشده است.',
    adminStatsSection: 'آمار',
    adminStatsDesc: 'آمار کامل کاربران، دانلودها، پلتفرم‌ها، حافظه، کش و وضعیت سرور',
    statsRefreshBtn: 'بروزرسانی',
    statsLastUpdated: 'آخرین بروزرسانی',
    statsOverviewHeading: 'خلاصه آمار کلی',
    statsUsersTotal: 'کل کاربران',
    statsActiveSessions: 'نشست‌های فعال',
    statsSavedDownloads: 'تاریخچه ذخیره شده',
    statsTrackedEvents: 'رویدادهای ثبت شده',
    statsTelegramStorage: 'آرشیو تلگرام',
    statsAnnouncementsLabel: 'اطلاعیه‌ها',
    statsAdminsCount: 'ادمین',
    statsNew24h: '۲۴ ساعت',
    statsNew7d: '۷ روز',
    statsNew30d: '۳۰ روز',
    statsUniqueLinks: 'لینک یکتا',
    statsInspectsCount: 'بررسی لینک',
    statsCompletedCount: 'دانلود موفق',
    statsStreamsCount: 'پخش آنلاین',
    statsErrorsCount: 'خطا',
    statsGuestEvents: 'مهمان',
    statsRegisteredEvents: 'کاربر عضو',
    statsDailyActivityHeading: 'روند ۱۴ روز اخیر',
    statsDailyActivityDesc: 'تعداد بررسی لینک، دانلودهای موفق و کاربران جدید در هر روز',
    statsPlatformsHeading: 'آمار پلتفرم‌ها',
    statsQualitiesHeading: 'کیفیت‌ها و فرمت‌ها',
    statsPreferencesHeading: 'تنظیمات محبوب کاربران',
    statsLanguagesLabel: 'زبان‌ها',
    statsThemesLabel: 'تم‌ها',
    statsDefaultQualitiesLabel: 'کیفیت پیش‌فرض',
    statsStorageHeading: 'دیتابیس، فضای دیسک و کش',
    statsDatabaseLabel: 'دیتابیس SQLite',
    statsCacheDirLabel: 'کش فایل‌ها',
    statsYtDlpCacheLabel: 'کش yt-dlp',
    statsBackupsLabel: 'بکاپ‌ها',
    statsMemoryCachesLabel: 'کش‌های رم (حافظه موقت)',
    statsServicesHeading: 'وضعیت سرویس‌ها',
    statsSystemHeading: 'سخت‌افزار و سیستم',
    statsUptimeLabel: 'مدت فعالیت سرور',
    statsRamUsageLabel: 'مصرف رم فرآیند / کل',
    statsCpuLoadLabel: 'هسته پردازنده و بار',
    statsNodeVersionLabel: 'نسخه اجرا',
    statsLiveJobsHeading: 'صف پردازش و دانلودهای زنده',
    statsRecentUsersHeading: 'آخرین کاربران ثبت‌نامی',
    statsRecentDownloadsHeading: 'آخرین دانلودهای ثبت‌شده',
    statsSearchUsersPlaceholder: 'جستجوی کاربر با نام یا ایمیل...',
    statsSearchDownloadsPlaceholder: 'جستجوی دانلود با عنوان یا پلتفرم...',
    statsEmptyList: 'موردی ثبت نشده است.',
    statsLoadError: 'دریافت آمار پنل ادمین با خطا مواجه شد.',
    statsRetryBtn: 'تلاش مجدد',
    statsAllPeriods: 'کل زمان',
    statsActive: 'فعال',
    statsInactive: 'خاموش',
    statsConfigured: 'تنظیم شده',
    statsNotConfigured: 'تنظیم نشده',
  },
  ru: {
    dir: 'ltr',
    langName: 'Русский',
    heroTitle: 'Сохраняйте медиа в нужном качестве',
    heroSubtitle: 'Вставьте ссылку на видео или аудио ниже и сохраните файл прямо в память устройства.',
    linkPlaceholder: 'Вставьте ссылку на видео или аудио...',
    paste: 'Вставить',
    clear: 'Очистить',
    analyze: 'Проверить',
    analyzing: 'Проверка ссылки...',
    selectQuality: 'Выберите качество',
    qualityLabels: {
      '4320p': { label: '4320p', sub: '8K Ultra HD' },
      '2160p': { label: '2160p', sub: '4K Ultra HD' },
      '1440p': { label: '1440p', sub: '2K QHD' },
      '1080p': { label: '1080p', sub: 'Full HD' },
      '720p': { label: '720p', sub: 'HD' },
      '480p': { label: '480p', sub: 'Стандарт' },
      '360p': { label: '360p', sub: 'Компакт' },
      '240p': { label: '240p', sub: 'Низкое' },
      '144p': { label: '144p', sub: 'Минимум' },
      best: { label: 'Оригинал', sub: 'Лучшее' },
      audio: { label: 'Аудио', sub: 'MP3 320k' },
    },
    downloadNow: 'Сохранить на устройство',
    prepareDownload: 'Загрузить в приложение',
    cancelDownload: 'Отмена',
    downloadingToApp: 'Загрузка в приложение...',
    processingMedia: 'Обработка файла...',
    saveFromSite: 'Скачать файл на устройство',
    readyInApp: 'Файл готов в приложении',
    preparing: 'Подготовка потока...',
    downloading: 'Сохранение файла...',
    savedToDevice: 'Сохранено в память устройства',
    copyDownloadLink: 'Скопировать ссылку',
    linkCopied: 'Ссылка скопирована',
    readyToSave: 'Готово к сохранению',
    watchOnline: 'Смотреть онлайн',
    hidePlayer: 'Скрыть плеер',
    viewImage: 'Показать фото',
    hideImage: 'Скрыть фото',
    viewPhotos: 'Показать все фото',
    hidePhotos: 'Скрыть фото',
    previousPage: 'Назад',
    nextPage: 'Вперёд',
    pageLabel: 'Страница',
    videoTab: 'Видео',
    photosTab: 'Фото',
    carouselZipLabel: 'шт. · ZIP',
    imagePostLabel: 'Фото',
    audioTracksSection: 'Аудиодорожки',
    audioOnlyLabel: 'Только аудио (MP3)',
    audioOnlyDesc: 'Сохранить MP3 с выбранной дорожкой',
    subtitlesSection: 'Субтитры',
    manualSubtitlesLabel: 'Оригинальные субтитры',
    autoSubtitlesLabel: 'Автосубтитры',
    subtitlesOff: 'Выкл',
    filterLanguagesPlaceholder: 'Поиск языка...',
    downloadSubtitle: 'Скачать VTT',
    noSubtitlesFound: 'Языки не найдены',
    recentSaves: 'История загрузок',
    emptySavesTitle: 'Загрузок пока нет',
    emptySavesDesc: 'Проверенные и сохранённые медиафайлы появятся здесь.',
    emptySavesDescGuest:
      'У гостей история не сохраняется. Войдите, и файлы появятся здесь.',
    reDownload: 'Скачать снова',
    historyPlay: 'Воспроизвести',
    historyDelete: 'Удалить из истории',
    historyTelegramStream: 'Поток Telegram',
    historyStreamLoading: 'Подключение к потоку Telegram...',
    historyStreamError: 'Не удалось запустить поток из Telegram.',
    historyZipUnsupported: 'ZIP-архив нельзя воспроизвести в плеере — нажмите «Скачать».',
    invalidUrlError: 'Введите корректную ссылку http или https.',
    inspectFailed: 'Не удалось получить данные по ссылке.',
    downloadFailed: 'Ошибка загрузки. Проверьте ссылку или сервер.',
    streamFailed: 'Не удалось воспроизвести онлайн. Проверьте ссылку или прокси/cookies сервера.',
    retryPlayback: 'Повторить',
    youtubeEmbedFallback: 'Смотреть через плеер YouTube',
    clipboardBlocked: 'Доступ к буферу ограничен. Вставьте ссылку вручную.',
    swipeHint: 'Смахните влево или вправо для перехода между экранами',
    tabDownloadLabel: 'Загрузка',
    tabSettingsLabel: 'Настройки',
    settingsTitle: 'Настройки',
    sectionAccount: 'Аккаунт',
    guestName: 'Гость',
    guestSubtitle: 'Работа без входа в аккаунт',
    signedInAs: 'Вход выполнен',
    signInOrCreate: 'Войти или создать аккаунт',
    signOut: 'Выйти',
    editDisplayName: 'Изменить имя',
    displayNamePlaceholder: 'Введите новое имя',
    saveNameBtn: 'Сохранить',
    cancelBtn: 'Отмена',
    displayNameSaved: 'Имя обновлено',
    displayNameRequiredError: 'Введите корректное имя.',
    displayNameUpdateFailed: 'Не удалось обновить имя.',
    sectionAppearance: 'Оформление и язык',
    themeLabel: 'Тема',
    themeBlack: 'Чисто чёрная',
    themeWhite: 'Чисто белая',
    themeSpring: 'Весна',
    themeSummer: 'Лето',
    themeAutumn: 'Осень',
    themeWinter: 'Зима',
    themeShiraz: 'Вино Шираз',
    themePastelDark: 'Тёмный пастель',
    languageLabel: 'Язык',
    sectionDownloads: 'Загрузки и память',
    defaultQualityLabel: 'Качество по умолчанию',
    clearHistoryLabel: 'Очистить историю',
    clearHistoryDone: 'Очищено',
    itemsCount: 'шт.',
    sectionAppServer: 'Приложение',
    installAppLabel: 'Установить на Android',
    installAppAction: 'Установить',
    installIOSAction: 'На экран Домой',
    installIOSGuideTitle: 'Установка на iPhone / iPad',
    installIOSGuideBody: 'Нажмите «Поделиться» в Safari и выберите «На экран Домой».',
    close: 'Закрыть',
    aboutLabel: 'Движок',
    aboutValue: 'Без рекламы · Встроенный сервер',
    authModalTitle: 'Аккаунт',
    authModalSubtitle: 'Синхронизируйте настройки или оставайтесь гостем.',
    continueWithGoogle: 'Войти через Google',
    googleNotConfigured: 'Google Client ID не настроен на сервере. Войдите по почте и паролю ниже.',
    orUseEmail: 'или по почте',
    modeSignIn: 'Вход',
    modeRegister: 'Регистрация',
    displayNameLabel: 'Имя',
    emailLabel: 'Email / Gmail',
    passwordLabel: 'Пароль',
    submitSignIn: 'Войти',
    submitRegister: 'Создать',
    continueAsGuest: 'Продолжить как гость',
    authErrorRequired: 'Введите корректный email и пароль не менее 6 символов.',
    offlineBanner: 'Нет сети — подключитесь к интернету для загрузки.',
    // YouTube Auth Settings
    sectionYouTube: 'YouTube аутентификация',
    youtubeCookiesLabel: 'Cookies',
    youtubeCookiesDesc: 'Экспортируйте cookies из браузера (формат Netscape) для возрастно ограниченных/приватных видео',
    youtubeCookiesPlaceholder: 'Вставьте cookies в формате Netscape...',
    youtubePoTokenLabel: 'PO Token',
    youtubePoTokenDesc: 'Proof of Origin токен с youtube.com (опционально, для обхода обнаружения ботов)',
    youtubePoTokenPlaceholder: 'Вставьте PO токен...',
    youtubeSaveBtn: 'Сохранить YouTube аутентификацию',
    youtubeSaved: 'YouTube аутентификация сохранена',
    youtubeTestBtn: 'Тест соединения',
    youtubeTestSuccess: 'YouTube аутентификация работает',
    youtubeTestFailed: 'YouTube аутентификация не удалась',
    adminOnly: 'Только для админа',
    sectionAdmin: 'Панель админа',
    sectionXray: 'Xray VPN прокси',
    xrayEnableLabel: 'Загружать через Xray VPN',
    xrayEnableDesc: 'При включении весь трафик анализа и скачивания идёт через туннель Xray.',
    xrayConfigLabel: 'Ссылка сервера или Xray JSON',
    xrayConfigPlaceholder: 'vless://... или vmess://... или trojan://... или ss://... или JSON',
    xrayConfigDesc: 'Поддерживаются ссылки vless://, vmess://, trojan://, ss:// и полный Xray JSON.',
    xraySaveBtn: 'Сохранить и применить',
    xrayTestBtn: 'Тест VPN',
    xrayInstallBtn: 'Установить Xray Core',
    xrayStatusConnected: 'Подключено',
    xrayStatusStopped: 'Отключено',
    xrayStatusNotInstalled: 'Xray Core не установлен',
    xraySavedMsg: 'Настройки Xray VPN применены',
    xrayInstalledMsg: 'Xray Core успешно установлен',
    xrayTestSuccess: 'Тестовое скачивание с YouTube успешно',
    xrayTestFailed: 'Ошибка тестового скачивания с YouTube',
    xrayTestUrlLabel: 'Короткое YouTube видео для теста',
    xrayTestUrlDesc: 'Проверка скачивает это видео в минимальном качестве через выбранный конфиг.',
    xrayImportBtn: 'Добавить в список',
    xrayImportMsg: 'Конфиги добавлены',
    xrayProfilesTitle: 'Сохранённые конфиги серверов',
    xrayTestAllBtn: 'Проверить все на YouTube',
    xrayTestProfileBtn: 'Тест YouTube',
    xrayActivateBtn: 'Выбрать',
    xrayActiveLabel: 'Активен',
    xrayDeleteBtn: 'Удалить',
    xrayProfilesEmpty: 'Список конфигов пуст. Вставьте ссылки построчно выше и нажмите «Добавить в список».',
    xrayTestedPass: 'Скачано',
    xrayTestedFail: 'Ошибка',
    xrayTestConcurrencyLabel: 'Потоки теста',
    xrayCancelTestBtn: 'Отменить тест',
    xrayTestCancelledMsg: 'Тест отменён',
    sectionPotProvider: 'Сервер PO Token (bgutil-ytdlp-pot-provider)',
    potEnableLabel: 'Автогенерация YouTube PO Token',
    potEnableDesc: 'Запускает HTTP-сервер bgutil-ytdlp-pot-provider и передаёт токены в yt-dlp.',
    potModeLabel: 'Режим сервера',
    potModeManaged: 'Встроенный сервер',
    potModeExternal: 'Внешний URL',
    potBaseUrlLabel: 'Базовый URL провайдера',
    potPortLabel: 'Локальный порт сервера',
    potStatusRunning: 'Запущен',
    potStatusStopped: 'Остановлен',
    potStatusNotInstalled: 'Сервер не установлен',
    potPluginMissing: 'Отсутствует плагин yt-dlp bgutil',
    potInstallBtn: 'Установить сервер и плагин',
    potSaveBtn: 'Сохранить и применить',
    potTestBtn: 'Тест PO Token',
    potSavedMsg: 'Настройки сервера PO Token применены',
    potInstalledMsg: 'Сервер bgutil и плагин yt-dlp установлены',
    potTestSuccess: 'PO Token получен',
    potTestFailed: 'Ошибка теста PO Token',
    potJsRuntimeSection: 'JS-рантаймы YouTube (Deno и Node.js)',
    potJsRuntimeDesc: 'Определяет, какой движок JavaScript использует yt-dlp для решения задач плеера YouTube (EJS).',
    potJsRuntimeModeLabel: 'Активный JS-рантайм',
    potJsRuntimeAuto: 'Deno + Node.js (Авто)',
    potJsRuntimeDeno: 'Только Deno',
    potJsRuntimeNode: 'Только Node.js',
    potDenoReady: 'Deno готов',
    potDenoMissing: 'Deno не установлен',
    potNodeReady: 'Node.js готов',
    potInstallDenoBtn: 'Установить Deno',
    potDenoInstalledMsg: 'Рантайм Deno установлен и активирован',
    potEjsRemoteLabel: 'Загружать скрипты EJS (ejs:github)',
    potEjsRemoteDesc: 'Разрешает yt-dlp загружать актуальные компоненты решения подписей YouTube с GitHub.',
    backToSettings: 'Назад к настройкам',
    potPluginReady: 'Плагин yt-dlp готов',
    youtubeCookiesSection: 'Cookies YouTube',
    youtubeSaveCookiesBtn: 'Сохранить Cookies',
    xrayNavDesc: 'Серверы, прокси-туннель и тесты на YouTube',
    potNavDesc: 'Сервер bgutil, плагин yt-dlp и cookies YouTube',
    sectionTelegram: 'Хранилище Telegram',
    telegramNavDesc: 'Хранить загрузки в канале Telegram и отдавать прямые ссылки',
    telegramEnableLabel: 'Хранилище Telegram',
    telegramEnableDesc: 'Публиковать готовые загрузки в канале Telegram вместо диска сервера.',
    telegramUploadLabel: 'Загружать файлы',
    telegramUploadDesc: 'Если включено, каждая готовая загрузка отправляется в канал и удаляется с диска сервера.',
    telegramDisklessActive: 'Загрузка без диска включена — файлы идут сразу в Telegram.',
    telegramDisklessInactiveHint: 'Загрузка пока не активна — включите «Загружать файлы» или укажите канал.',
    telegramNeedsChannel: 'Загрузка включена, но чат не задан — загрузки будут завершаться ошибкой, а не писать на диск. Напишите боту (или добавьте его в канал) и сохраните токен снова.',
    telegramModeLabel: 'Тип аккаунта',
    telegramModeUser: 'Аккаунт пользователя',
    telegramModeBot: 'Бот',
    telegramApiIdLabel: 'API ID',
    telegramApiHashLabel: 'API hash',
    telegramBotTokenLabel: 'Токен бота',
    telegramChannelLabel: 'Канал',
    telegramChannelPlaceholder: '@my_channel или https://t.me/my_channel',
    telegramPhoneLabel: 'Номер телефона',
    telegramPhonePlaceholder: '+79001234567',
    telegramCodeLabel: 'Код входа',
    telegramCodePlaceholder: '12345',
    telegramPasswordLabel: 'Пароль двухэтапной проверки',
    telegramPasswordPlaceholder: 'Только если включена двухэтапная проверка',
    telegramSendCodeBtn: 'Отправить код',
    telegramSignInBtn: 'Войти',
    telegramSaveBtn: 'Сохранить настройки',
    telegramTestBtn: 'Проверить канал',
    telegramLogoutBtn: 'Отключить',
    telegramConnected: 'Подключено',
    telegramNotConnected: 'Не подключено',
    telegramCodeSent: 'Код входа отправлен в приложение Telegram',
    telegramSignedInMsg: 'Вход в Telegram выполнен',
    telegramSavedMsg: 'Настройки Telegram сохранены',
    telegramTestSuccess: 'Канал доступен',
    telegramTestFailed: 'Проверка канала не удалась',
    telegramNeedPassword: 'Включена двухэтапная проверка — введите пароль',
    telegramApiIdDesc: 'Создайте приложение на my.telegram.org, чтобы получить API ID и API hash.',
    telegramStorageTitle: 'Сохранённые файлы',
    telegramStorageDesc: 'Каждый опубликованный файл записывается в базу с владельцем и местом в канале.',
    telegramFilesCount: 'файлов',
    telegramOpenFileBtn: 'Открыть',
    telegramNoFiles: 'Файлы ещё не опубликованы.',
    telegramAccountLabel: 'Аккаунт',
    telegramSecretsHint: 'Секреты хранятся на сервере и никогда не возвращаются в браузер.',
    cachePurgeTitle: 'Диск сервера',
    cachePurgeDesc:
      'Хранилище — это Telegram. Кнопка удаляет все кэшированные загрузки с диска сервера; файлы, уже опубликованные в Telegram, остаются доступны.',
    cachePurgeBtn: 'Очистить кэш сервера',
    cachePurgeConfirm:
      'Удалить все кэшированные файлы с диска сервера? На файлы, опубликованные в Telegram, это не влияет.',
    cachePurgeDone: 'Кэш сервера очищен.',
    cachePurgeFailed: 'Не удалось очистить кэш сервера.',
    dbBackupSection: 'Резервная копия базы',
    dbBackupDesc: 'Скачать согласованную копию базы SQLite (пользователи, история, индекс файлов Telegram).',
    dbBackupBtn: 'Скачать копию',
    dbBackupStats: 'База данных',
    dbBackupUsers: 'пользователей',
    dbBackupHistory: 'история',
    dbBackupTelegram: 'Файлы Telegram',
    dbBackupSize: 'размер',
    dbBackupCreateBtn: 'Сохранить копию на сервере',
    dbBackupCreatedMsg: 'Копия сохранена на сервере.',
    dbBackupRestoreBtn: 'Восстановить резервную копию',
    dbBackupRestoredMsg: 'База данных успешно восстановлена. Страница перезагрузится.',
    dbBackupServerTitle: 'Копии на сервере',
    dbBackupEmpty: 'На сервере пока нет резервных копий.',
    tabInfoLabel: 'Инфо',
    infoTitle: 'Информация',
    announcementsTitle: 'Объявления',
    announcementsEmpty: 'Объявлений пока нет.',
    infoAboutTitle: 'О приложении Grove Save',
    infoAboutBody:
      'Grove Save — быстрый загрузчик медиа без рекламы для сохранения видео, Reels, каруселей, фото и MP3 с YouTube, Instagram, TikTok, X и других платформ прямо на устройство с онлайн-просмотром, выбором аудиодорожек и субтитрами.',
    infoChannelTitle: 'Telegram-канал команды разработчиков',
    infoChannelDesc: 'Новости, обновления и релизы от команды Grove.',
    infoOpenTelegram: 'Открыть',
    infoBotsTitle: 'Наши боты в Telegram',
    infoBotsDesc: 'Официальные боты-загрузчики команды Grove в Telegram.',
    infoBotMediaDesc: 'Универсальный загрузчик медиа',
    infoBotMusicDesc: 'Загрузчик музыки и Spotify',
    infoBotYoutubeDesc: 'Загрузчик видео YouTube',
    infoBotPhDesc: 'Загрузчик видео 18+',
    infoFeaturesBtn: 'Возможности приложения',
    infoFeaturesTabAll: 'Все',
    infoFeaturesTabPlatforms: 'Платформы',
    infoFeaturesTabGeneral: 'Общие',
    infoFeaturesPlatformsTitle: 'Поддерживаемые платформы и загрузка',
    infoFeaturesGeneralTitle: 'Общие возможности приложения',
    infoFeaturesPlatforms: [
      {
        id: 'youtube',
        name: 'YouTube',
        badge: 'Видео и Shorts',
        items: [
          'Загрузка видео и Shorts от 144p до 4K / 8K (при наличии) или в оригинальном качестве',
          'Извлечение аудио в MP3 (320k) и выбор дубляжа или оригинальной аудиодорожки',
          'Скачивание ручных и автосубтитров (VTT) и отображение субтитров в плеере',
          'Онлайн-просмотр внутри приложения, включая вертикальный режим для Shorts',
        ],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        badge: 'Reels, посты и Stories',
        items: [
          'Сохранение Reels, видеопостов и Stories в оригинальном качестве',
          'Загрузка одиночных фото с мгновенным предпросмотром в приложении',
          'Упаковка каруселей (фото и видео) в единый ZIP-архив',
          'Онлайн-воспроизведение видео перед сохранением на устройство',
        ],
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        badge: 'Видео и слайд-шоу',
        items: [
          'Загрузка видео TikTok без водяного знака в лучшем качестве',
          'Сохранение фото-слайд-шоу (в ZIP) и одиночных изображений',
          'Извлечение аудиодорожки в MP3 из роликов TikTok',
          'Мгновенный онлайн-просмотр видео и обложки',
        ],
      },
      {
        id: 'x',
        name: 'X (Twitter)',
        badge: 'Видео, GIF и фото',
        items: [
          'Загрузка видео и GIF из постов в максимальном качестве',
          'Сохранение одного или нескольких фото из поста (в ZIP-архиве)',
          'Поддержка ссылок x.com, twitter.com, fxtwitter.com, vxtwitter.com и t.co',
          'Встроенный видеоплеер и предпросмотр изображений',
        ],
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        badge: 'Пины, видео, GIF и карусели',
        items: [
          'Загрузка одиночных пинов в максимальном качестве (Originals > 1200x > 736x)',
          'Скачивание каруселей в ZIP-архиве с постраничным предпросмотром всех фото',
          'Сохранение видео-пинов (MP4 и HLS), анимированных GIF и извлечение MP3',
          'Поддержка доменов pinterest.* и коротких ссылок pin.it',
        ],
      },
    ],
    infoFeaturesGeneral: [
      {
        id: 'download-flow',
        title: 'Умная загрузка по ссылке',
        items: [
          'Вставка в одно касание, проверка размера и прогресс загрузки с возможностью отмены',
          'Прямое сохранение на устройство или копирование ссылки для скачивания',
        ],
      },
      {
        id: 'player-tools',
        title: 'Встроенный плеер и медиаинструменты',
        items: [
          'Собственный онлайн-плеер с субтитрами и переключением аудиодорожек',
          'Режим только аудио MP3 (320k) и поиск по языкам субтитров',
        ],
      },
      {
        id: 'account-history',
        title: 'Аккаунт и история загрузок',
        items: [
          'Работа без регистрации в гостевом режиме или вход через Email / Google',
          'Синхронизация истории загрузок для быстрого повторного сохранения',
        ],
      },
      {
        id: 'ui-pwa',
        title: 'Интерфейс, языки и установка',
        items: [
          'Полностью без рекламы, с чисто чёрной и чисто белой темами',
          '4 языка (русский, английский, персидский, китайский) и установка как PWA на Android и iOS',
        ],
      },
    ],
    adminAnnouncementsSection: 'Объявления',
    adminAnnouncementsDesc: 'Публикация уведомлений во вкладке «Инфо» для всех пользователей',
    announcementTitleLabel: 'Заголовок (необязательно)',
    announcementTitlePlaceholder: 'Например: Обновление сервера',
    announcementBodyLabel: 'Текст объявления',
    announcementBodyPlaceholder: 'Напишите объявление для всех пользователей...',
    announcementPublishBtn: 'Опубликовать',
    announcementPublishedMsg: 'Объявление опубликовано для всех пользователей.',
    announcementDeleteBtn: 'Удалить',
    announcementDeletedMsg: 'Объявление удалено.',
    announcementEmptyAdmin: 'Опубликованных объявлений пока нет.',
    adminLogsTitle: 'Логи приложения',
    adminLogsAll: 'Все',
    adminLogsInfo: 'Инфо',
    adminLogsWarn: 'Предупр.',
    adminLogsError: 'Ошибка',
    adminLogsRefresh: 'Обновить',
    adminLogsClear: 'Очистить',
    adminLogsCopy: 'Копировать',
    adminLogsCopied: 'Скопировано',
    adminLogsPause: 'Пауза',
    adminLogsResume: 'В эфире',
    adminLogsEmpty: 'Логов пока нет.',
    adminStatsSection: 'Статистика',
    adminStatsDesc: 'Пользователи, загрузки, платформы, хранилище и состояние сервера',
    statsRefreshBtn: 'Обновить',
    statsLastUpdated: 'Обновлено',
    statsOverviewHeading: 'Общая сводка',
    statsUsersTotal: 'Пользователи',
    statsActiveSessions: 'Активные сессии',
    statsSavedDownloads: 'История загрузок',
    statsTrackedEvents: 'События активности',
    statsTelegramStorage: 'Архив Telegram',
    statsAnnouncementsLabel: 'Объявления',
    statsAdminsCount: 'Админы',
    statsNew24h: '24ч',
    statsNew7d: '7д',
    statsNew30d: '30д',
    statsUniqueLinks: 'Уник. ссылки',
    statsInspectsCount: 'Проверки',
    statsCompletedCount: 'Завершено',
    statsStreamsCount: 'Стримы',
    statsErrorsCount: 'Ошибки',
    statsGuestEvents: 'Гости',
    statsRegisteredEvents: 'Аккаунты',
    statsDailyActivityHeading: 'Активность за 14 дней',
    statsDailyActivityDesc: 'Ежедневные проверки ссылок, завершённые загрузки и регистрации',
    statsPlatformsHeading: 'По платформам',
    statsQualitiesHeading: 'Качества и форматы',
    statsPreferencesHeading: 'Предпочтения пользователей',
    statsLanguagesLabel: 'Языки',
    statsThemesLabel: 'Темы',
    statsDefaultQualitiesLabel: 'Качество по умолчанию',
    statsStorageHeading: 'БД, диск и кэш',
    statsDatabaseLabel: 'База SQLite',
    statsCacheDirLabel: 'Медиа-кэш',
    statsYtDlpCacheLabel: 'Кэш yt-dlp',
    statsBackupsLabel: 'Снимки БД',
    statsMemoryCachesLabel: 'Кэш в памяти',
    statsServicesHeading: 'Состояние сервисов',
    statsSystemHeading: 'Сервер и система',
    statsUptimeLabel: 'Аптайм',
    statsRamUsageLabel: 'ОЗУ процесса / системы',
    statsCpuLoadLabel: 'CPU и нагрузка',
    statsNodeVersionLabel: 'Среда',
    statsLiveJobsHeading: 'Текущие задачи',
    statsRecentUsersHeading: 'Недавние пользователи',
    statsRecentDownloadsHeading: 'Недавние загрузки',
    statsSearchUsersPlaceholder: 'Поиск по имени или email...',
    statsSearchDownloadsPlaceholder: 'Поиск по названию или платформе...',
    statsEmptyList: 'Записей пока нет.',
    statsLoadError: 'Не удалось загрузить статистику.',
    statsRetryBtn: 'Повторить',
    statsAllPeriods: 'За всё время',
    statsActive: 'Активен',
    statsInactive: 'Выкл',
    statsConfigured: 'Настроено',
    statsNotConfigured: 'Не задано',
  },
  zh: {
    dir: 'ltr',
    langName: '中文',
    heroTitle: '高画质媒体直存设备',
    heroSubtitle: '在下方粘贴视频或音频链接，选择清晰度并直接保存到您的设备存储中。',
    linkPlaceholder: '粘贴视频或音频链接...',
    paste: '粘贴',
    clear: '清除',
    analyze: '解析链接',
    analyzing: '正在解析...',
    selectQuality: '选择画质',
    qualityLabels: {
      '4320p': { label: '4320p', sub: '8K 超清' },
      '2160p': { label: '2160p', sub: '4K 超清' },
      '1440p': { label: '1440p', sub: '2K 超清' },
      '1080p': { label: '1080p', sub: '全高清' },
      '720p': { label: '720p', sub: '高清' },
      '480p': { label: '480p', sub: '标清' },
      '360p': { label: '360p', sub: '流畅' },
      '240p': { label: '240p', sub: '省流' },
      '144p': { label: '144p', sub: '极速' },
      best: { label: '原画', sub: '最佳' },
      audio: { label: '音频', sub: 'MP3 320k' },
    },
    downloadNow: '保存到设备',
    prepareDownload: '下载到应用',
    cancelDownload: '取消下载',
    downloadingToApp: '正在下载到应用...',
    processingMedia: '正在处理文件...',
    saveFromSite: '从网站保存到设备',
    readyInApp: '文件已在应用中就绪',
    preparing: '正在准备媒体流...',
    downloading: '正在保存文件...',
    savedToDevice: '已保存至设备存储',
    copyDownloadLink: '复制下载链接',
    linkCopied: '链接已复制',
    readyToSave: '准备就绪',
    watchOnline: '在线观看',
    hidePlayer: '收起播放器',
    viewImage: '预览图片',
    hideImage: '收起图片',
    viewPhotos: '查看全部图片',
    hidePhotos: '收起图片',
    previousPage: '上一页',
    nextPage: '下一页',
    pageLabel: '第',
    videoTab: '视频',
    photosTab: '图片',
    carouselZipLabel: '项 · ZIP',
    imagePostLabel: '图片',
    audioTracksSection: '音轨语言',
    audioOnlyLabel: '仅音频 (MP3)',
    audioOnlyDesc: '保存所选音轨的 MP3 音频文件',
    subtitlesSection: '字幕列表',
    manualSubtitlesLabel: '人工字幕',
    autoSubtitlesLabel: '自动生成字幕',
    subtitlesOff: '关闭',
    filterLanguagesPlaceholder: '搜索语言...',
    downloadSubtitle: '下载 VTT 字幕',
    noSubtitlesFound: '未找到匹配语言',
    recentSaves: '下载记录',
    emptySavesTitle: '暂无保存记录',
    emptySavesDesc: '解析后的媒体和已下载的文件将显示在这里，方便再次保存。',
    emptySavesDescGuest: '访客不保留历史记录。登录后，保存的文件会显示在这里。',
    reDownload: '重新保存',
    historyPlay: '播放',
    historyDelete: '从历史记录删除',
    historyTelegramStream: 'Telegram 串流',
    historyStreamLoading: '正在连接 Telegram 串流...',
    historyStreamError: '无法从 Telegram 串流播放此文件。',
    historyZipUnsupported: 'ZIP 压缩包无法在线播放，请使用下载按钮。',
    invalidUrlError: '请输入有效的 http 或 https 链接。',
    inspectFailed: '无法读取链接信息，请检查后重试。',
    downloadFailed: '下载失败，请检查链接或服务器连接。',
    streamFailed: '在线播放失败，请检查链接或服务器代理/Cookies设置。',
    retryPlayback: '重试',
    youtubeEmbedFallback: '使用 YouTube 播放器观看',
    clipboardBlocked: '剪贴板权限受限，请手动粘贴链接。',
    swipeHint: '左右滑动可切换下载与设置页面',
    tabDownloadLabel: '下载',
    tabSettingsLabel: '设置',
    settingsTitle: '设置',
    sectionAccount: '账号',
    guestName: '访客用户',
    guestSubtitle: '无需登录即可使用全部功能',
    signedInAs: '已登录',
    signInOrCreate: '登录或创建账号',
    signOut: '退出登录',
    editDisplayName: '修改昵称',
    displayNamePlaceholder: '输入新昵称',
    saveNameBtn: '保存',
    cancelBtn: '取消',
    displayNameSaved: '昵称已更新',
    displayNameRequiredError: '请输入有效昵称。',
    displayNameUpdateFailed: '无法更新昵称，请重试。',
    sectionAppearance: '外观与语言',
    themeLabel: '主题',
    themeBlack: '纯黑模式',
    themeWhite: '纯白模式',
    themeSpring: '春意',
    themeSummer: '盛夏',
    themeAutumn: '秋韵',
    themeWinter: '初冬',
    themeShiraz: '设拉子红',
    themePastelDark: '柔暗夜',
    languageLabel: '语言',
    sectionDownloads: '下载与存储',
    defaultQualityLabel: '默认画质',
    clearHistoryLabel: '清空历史记录',
    clearHistoryDone: '已清空',
    itemsCount: '项',
    sectionAppServer: '应用',
    installAppLabel: '安装 Android 应用',
    installAppAction: '安装应用',
    installIOSAction: '添加到主屏幕',
    installIOSGuideTitle: '在 iPhone / iPad 上安装',
    installIOSGuideBody: '在 Safari 中点击“共享”按钮，然后选择“添加到主屏幕”。',
    close: '关闭',
    aboutLabel: '核心引擎',
    aboutValue: '无广告 · 内置服务器',
    authModalTitle: '个人账号',
    authModalSubtitle: '登录以同步偏好设置，或继续以访客身份使用。',
    continueWithGoogle: '使用 Google 登录',
    googleNotConfigured: '服务器尚未配置 Google Client ID，请使用下方的邮箱与密码登录。',
    orUseEmail: '或使用邮箱',
    modeSignIn: '登录',
    modeRegister: '注册',
    displayNameLabel: '昵称',
    emailLabel: '邮箱 / Gmail',
    passwordLabel: '密码',
    submitSignIn: '登录',
    submitRegister: '创建账号',
    continueAsGuest: '继续作为访客',
    authErrorRequired: '请输入有效邮箱和至少 6 位的密码。',
    offlineBanner: '离线状态 — 请连接网络以解析或保存媒体。',
    // YouTube Auth Settings
    sectionYouTube: 'YouTube 认证',
    youtubeCookiesLabel: 'Cookies',
    youtubeCookiesDesc: '从浏览器导出 cookies (Netscape 格式) 用于年龄限制/私密视频',
    youtubeCookiesPlaceholder: '粘贴 Netscape 格式的 cookies...',
    youtubePoTokenLabel: 'PO Token',
    youtubePoTokenDesc: '来自 youtube.com 的 Proof of Origin 令牌 (可选，用于绕过机器人检测)',
    youtubePoTokenPlaceholder: '粘贴 PO 令牌...',
    youtubeSaveBtn: '保存 YouTube 认证',
    youtubeSaved: 'YouTube 认证已保存',
    youtubeTestBtn: '测试连接',
    youtubeTestSuccess: 'YouTube 认证正常工作',
    youtubeTestFailed: 'YouTube 认证失败',
    adminOnly: '仅管理员',
    sectionAdmin: '管理员面板',
    sectionXray: 'Xray VPN 代理',
    xrayEnableLabel: '下载时启用 Xray VPN',
    xrayEnableDesc: '开启后，所有解析与下载流量将通过本地 Xray 隧道转发。',
    xrayConfigLabel: '节点链接或 Xray JSON 配置',
    xrayConfigPlaceholder: 'vless://... 或 vmess://... 或 trojan://... 或 ss://... 或 JSON',
    xrayConfigDesc: '支持 vless://、vmess://、trojan://、ss:// 分享链接或完整 Xray JSON。',
    xraySaveBtn: '保存并应用',
    xrayTestBtn: '测试 VPN',
    xrayInstallBtn: '安装 Xray 内核',
    xrayStatusConnected: '已连接',
    xrayStatusStopped: '未连接',
    xrayStatusNotInstalled: '未安装 Xray 内核',
    xraySavedMsg: 'Xray VPN 设置已生效',
    xrayInstalledMsg: 'Xray 内核安装成功',
    xrayTestSuccess: 'YouTube 测试下载成功',
    xrayTestFailed: 'YouTube 测试下载失败',
    xrayTestUrlLabel: '默认测试短视频链接 (YouTube)',
    xrayTestUrlDesc: '测试配置时会通过该节点以最低画质实际下载此 YouTube 短视频。',
    xrayImportBtn: '导入到配置列表',
    xrayImportMsg: '已导入配置',
    xrayProfilesTitle: '已保存的节点配置',
    xrayTestAllBtn: '全部测试 YouTube',
    xrayTestProfileBtn: '测试 YouTube',
    xrayActivateBtn: '启用',
    xrayActiveLabel: '当前启用',
    xrayDeleteBtn: '删除',
    xrayProfilesEmpty: '暂无已保存的节点配置。请在上方粘贴单条或多条链接并点击导入。',
    xrayTestedPass: '已下载',
    xrayTestedFail: '失败',
    xrayTestConcurrencyLabel: '测试并发数',
    xrayCancelTestBtn: '取消测试',
    xrayTestCancelledMsg: '测试已取消',
    sectionPotProvider: 'PO Token 服务器 (bgutil-ytdlp-pot-provider)',
    potEnableLabel: '自动生成 YouTube PO Token',
    potEnableDesc: '运行 bgutil-ytdlp-pot-provider 服务并在下载时为 yt-dlp 提供 PO Token。',
    potModeLabel: '服务模式',
    potModeManaged: '内置服务器',
    potModeExternal: '外部 URL',
    potBaseUrlLabel: '服务器基础 URL',
    potPortLabel: '本地服务端口',
    potStatusRunning: '运行中',
    potStatusStopped: '已停止',
    potStatusNotInstalled: '服务器未安装',
    potPluginMissing: '缺少 yt-dlp bgutil 插件',
    potInstallBtn: '安装服务器与插件',
    potSaveBtn: '保存并应用',
    potTestBtn: '测试 PO Token 服务器',
    potSavedMsg: 'PO Token 服务器设置已应用',
    potInstalledMsg: 'bgutil 服务器与 yt-dlp 插件安装完成',
    potTestSuccess: 'PO Token 生成成功',
    potTestFailed: 'PO Token 测试失败',
    potJsRuntimeSection: 'YouTube JS 运行时 (Deno 与 Node.js)',
    potJsRuntimeDesc: '控制 yt-dlp 解析 YouTube 播放器签名挑战 (EJS) 时使用的 JavaScript 引擎。',
    potJsRuntimeModeLabel: '启用的 JS 运行时',
    potJsRuntimeAuto: 'Deno + Node.js (自动)',
    potJsRuntimeDeno: '仅 Deno',
    potJsRuntimeNode: '仅 Node.js',
    potDenoReady: 'Deno 已就绪',
    potDenoMissing: '未安装 Deno',
    potNodeReady: 'Node.js 已就绪',
    potInstallDenoBtn: '安装 Deno',
    potDenoInstalledMsg: 'Deno 运行时已安装并启用',
    potEjsRemoteLabel: '允许下载 EJS 挑战组件 (ejs:github)',
    potEjsRemoteDesc: '允许 yt-dlp 从 GitHub 获取最新的 YouTube 签名求解组件。',
    backToSettings: '返回设置',
    potPluginReady: 'yt-dlp 插件已就绪',
    youtubeCookiesSection: 'YouTube Cookies',
    youtubeSaveCookiesBtn: '保存 Cookies',
    xrayNavDesc: '管理节点配置、代理隧道与 YouTube 下载测试',
    potNavDesc: 'bgutil 服务、yt-dlp 插件与 YouTube Cookies',
    sectionTelegram: 'Telegram 存储',
    telegramNavDesc: '将下载文件存入 Telegram 频道并提供直链',
    telegramEnableLabel: 'Telegram 存储',
    telegramEnableDesc: '将完成的下载发布到 Telegram 频道，而不是服务器磁盘。',
    telegramUploadLabel: '上传下载文件',
    telegramUploadDesc: '开启后，每个完成的下载都会上传到频道并从服务器磁盘删除。',
    telegramDisklessActive: '无磁盘上传已开启 — 文件直接发送到 Telegram。',
    telegramDisklessInactiveHint: '上传尚未启用 — 请开启“上传下载文件”或设置频道。',
    telegramNeedsChannel: '上传已启用但未设置聊天 — 下载会报错而不是写入磁盘。请先给机器人发消息（或将其加入频道），然后重新保存令牌。',
    telegramModeLabel: '账户类型',
    telegramModeUser: '用户账户',
    telegramModeBot: '机器人',
    telegramApiIdLabel: 'API ID',
    telegramApiHashLabel: 'API hash',
    telegramBotTokenLabel: '机器人 Token',
    telegramChannelLabel: '频道',
    telegramChannelPlaceholder: '@my_channel 或 https://t.me/my_channel',
    telegramPhoneLabel: '手机号',
    telegramPhonePlaceholder: '+8613800138000',
    telegramCodeLabel: '登录验证码',
    telegramCodePlaceholder: '12345',
    telegramPasswordLabel: '两步验证密码',
    telegramPasswordPlaceholder: '仅在启用两步验证时需要',
    telegramSendCodeBtn: '发送验证码',
    telegramSignInBtn: '登录',
    telegramSaveBtn: '保存设置',
    telegramTestBtn: '测试频道',
    telegramLogoutBtn: '断开连接',
    telegramConnected: '已连接',
    telegramNotConnected: '未连接',
    telegramCodeSent: '验证码已发送到您的 Telegram',
    telegramSignedInMsg: '已登录 Telegram',
    telegramSavedMsg: 'Telegram 设置已保存',
    telegramTestSuccess: '频道可访问',
    telegramTestFailed: '频道测试失败',
    telegramNeedPassword: '已启用两步验证 — 请输入密码',
    telegramApiIdDesc: '在 my.telegram.org 创建应用以获取 API ID 和 API hash。',
    telegramStorageTitle: '已存储文件',
    telegramStorageDesc: '每个已发布文件都会连同其归属和频道位置记录到数据库。',
    telegramFilesCount: '文件',
    telegramOpenFileBtn: '打开',
    telegramNoFiles: '尚未发布任何文件。',
    telegramAccountLabel: '账户',
    telegramSecretsHint: '密钥保存在服务器上，绝不下发到浏览器。',
    cachePurgeTitle: '服务器磁盘',
    cachePurgeDesc:
      '存储就是 Telegram。此按钮会删除服务器磁盘上所有缓存的下载文件；已发布到 Telegram 的文件仍可下载。',
    cachePurgeBtn: '清理服务器缓存',
    cachePurgeConfirm: '删除服务器磁盘上的所有缓存文件？已发布到 Telegram 的文件不受影响。',
    cachePurgeDone: '服务器缓存已清理。',
    cachePurgeFailed: '无法清理服务器缓存。',
    dbBackupSection: '数据库备份',
    dbBackupDesc: '下载 SQLite 数据库的一致性副本（用户、历史记录、Telegram 文件索引）。',
    dbBackupBtn: '下载备份',
    dbBackupStats: '数据库',
    dbBackupUsers: '用户',
    dbBackupHistory: '历史记录',
    dbBackupTelegram: 'Telegram 文件',
    dbBackupSize: '大小',
    dbBackupCreateBtn: '在服务器上保存备份',
    dbBackupCreatedMsg: '备份已保存到服务器。',
    dbBackupRestoreBtn: '恢复备份',
    dbBackupRestoredMsg: '数据库已成功恢复。页面将重新加载。',
    dbBackupServerTitle: '服务器上的备份',
    dbBackupEmpty: '服务器上还没有备份。',
    tabInfoLabel: '信息',
    infoTitle: '应用信息',
    announcementsTitle: '公告',
    announcementsEmpty: '暂无公告。',
    infoAboutTitle: '关于 Grove Save',
    infoAboutBody:
      'Grove Save 是一款无广告的高速媒体下载器，支持从 YouTube、Instagram、TikTok、X 及主流平台保存高清视频、Reels、图集、图片与 MP3 音频，并提供在线播放、多音轨及字幕选择。',
    infoChannelTitle: '开发团队 Telegram 频道',
    infoChannelDesc: '获取 Grove 团队的官方动态、更新与通知。',
    infoOpenTelegram: '打开',
    infoBotsTitle: '我们的 Telegram 机器人',
    infoBotsDesc: 'Grove 团队官方 Telegram 下载机器人。',
    infoBotMediaDesc: '全能媒体下载器',
    infoBotMusicDesc: '音乐与 Spotify 下载器',
    infoBotYoutubeDesc: 'YouTube 视频下载器',
    infoBotPhDesc: '成人视频下载器',
    infoFeaturesBtn: '应用功能',
    infoFeaturesTabAll: '全部',
    infoFeaturesTabPlatforms: '支持平台',
    infoFeaturesTabGeneral: '通用功能',
    infoFeaturesPlatformsTitle: '各平台下载支持与功能',
    infoFeaturesGeneralTitle: '通用公开功能',
    infoFeaturesPlatforms: [
      {
        id: 'youtube',
        name: 'YouTube',
        badge: '视频与 Shorts',
        items: [
          '支持下载 144p 至 4K / 8K（视视频源而定）或原画质视频与 Shorts',
          '提取纯音频 MP3 (320k)，并支持切换配音或原声音轨',
          '下载人工与自动生成字幕 (VTT)，并可在内置播放器中开启字幕',
          '支持应用内直接在线播放（含 Shorts 竖屏视图）',
        ],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        badge: 'Reels、帖子与快拍',
        items: [
          '原画质保存 Reels、视频帖子和 Stories 快拍',
          '下载单张图片帖子并支持应用内即时预览',
          '将多图/视频轮播帖子自动打包为单个 ZIP 文件下载',
          '保存前可在应用内直接在线播放视频',
        ],
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        badge: '视频与图集',
        items: [
          '以最佳画质下载无水印 TikTok 视频',
          '保存多图幻灯片（打包为 ZIP）及单张图片帖子',
          '直接从 TikTok 短视频中提取 MP3 音频',
          '即时在线播放视频与封面预览',
        ],
      },
      {
        id: 'x',
        name: 'X (Twitter)',
        badge: '视频、GIF 与图片',
        items: [
          '以最高画质下载推文视频和 GIF 动图',
          '保存单张或多张推文图片（多图自动打包为 ZIP）',
          '兼容 x.com、twitter.com、fxtwitter.com、vxtwitter.com 与 t.co 链接',
          '内置视频在线播放与图片预览',
        ],
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        badge: '图钉、视频、GIF 与轮播',
        items: [
          '以最高可用清晰度保存单张图片（Originals > 1200x > 736x）',
          '多图轮播自动打包为 ZIP 下载，并支持应用内分页浏览全部图片',
          '支持下载视频图钉（MP4 与 HLS 流）、GIF 动图或提取 MP3 音频',
          '完整支持 pinterest.* 各地区域名及 pin.it 短链接',
        ],
      },
    ],
    infoFeaturesGeneral: [
      {
        id: 'download-flow',
        title: '智能链接解析与下载',
        items: [
          '一键粘贴、即时解析文件大小与信息，并支持实时进度与取消下载',
          '直接保存到设备存储，或一键复制直链地址',
        ],
      },
      {
        id: 'player-tools',
        title: '内置播放器与媒体工具',
        items: [
          '自定义在线视频播放器，支持外挂字幕显示与多音轨切换',
          '纯音频 MP3 (320k) 模式与可搜索的 VTT 字幕列表',
        ],
      },
      {
        id: 'account-history',
        title: '账号与下载记录',
        items: [
          '支持免登录访客直接使用，或通过邮箱 / Google 登录同步记录',
          '保存个人下载历史，随时快速重新获取',
        ],
      },
      {
        id: 'ui-pwa',
        title: '界面、多语言与安装',
        items: [
          '完全无广告，提供纯黑与纯白双主题',
          '支持中文、英文、波斯语 (RTL) 与俄语，可作为 PWA 安装至 Android 和 iOS 设备',
        ],
      },
    ],
    adminAnnouncementsSection: '系统公告',
    adminAnnouncementsDesc: '发布展示在“信息”页顶部的全员公告',
    announcementTitleLabel: '标题（可选）',
    announcementTitlePlaceholder: '例如：服务更新或新功能通知',
    announcementBodyLabel: '公告内容',
    announcementBodyPlaceholder: '输入要面向所有用户展示的公告内容...',
    announcementPublishBtn: '发布公告',
    announcementPublishedMsg: '公告已向所有用户发布。',
    announcementDeleteBtn: '删除',
    announcementDeletedMsg: '公告已删除。',
    announcementEmptyAdmin: '尚未发布任何公告。',
    adminLogsTitle: '应用日志',
    adminLogsAll: '全部',
    adminLogsInfo: '信息',
    adminLogsWarn: '警告',
    adminLogsError: '错误',
    adminLogsRefresh: '刷新',
    adminLogsClear: '清空',
    adminLogsCopy: '复制',
    adminLogsCopied: '已复制',
    adminLogsPause: '暂停',
    adminLogsResume: '实时',
    adminLogsEmpty: '暂无日志记录。',
    adminStatsSection: '统计数据',
    adminStatsDesc: '用户、下载量、平台分布、存储缓存与服务器运行指标',
    statsRefreshBtn: '刷新',
    statsLastUpdated: '更新时间',
    statsOverviewHeading: '核心概览',
    statsUsersTotal: '注册用户',
    statsActiveSessions: '活跃会话',
    statsSavedDownloads: '历史记录',
    statsTrackedEvents: '追踪事件',
    statsTelegramStorage: 'Telegram 存储',
    statsAnnouncementsLabel: '系统公告',
    statsAdminsCount: '管理员',
    statsNew24h: '24小时',
    statsNew7d: '7天',
    statsNew30d: '30天',
    statsUniqueLinks: '唯一链接',
    statsInspectsCount: '解析次数',
    statsCompletedCount: '完成下载',
    statsStreamsCount: '在线播放',
    statsErrorsCount: '失败次数',
    statsGuestEvents: '访客',
    statsRegisteredEvents: '已登录',
    statsDailyActivityHeading: '近14天趋势',
    statsDailyActivityDesc: '每日链接解析、成功下载及新注册人数',
    statsPlatformsHeading: '平台分布',
    statsQualitiesHeading: '画质与格式',
    statsPreferencesHeading: '用户偏好分布',
    statsLanguagesLabel: '界面语言',
    statsThemesLabel: '主题选择',
    statsDefaultQualitiesLabel: '默认画质',
    statsStorageHeading: '数据库与缓存占用',
    statsDatabaseLabel: 'SQLite 数据库',
    statsCacheDirLabel: '媒体缓存目录',
    statsYtDlpCacheLabel: 'yt-dlp 缓存',
    statsBackupsLabel: '备份快照',
    statsMemoryCachesLabel: '内存缓存条数',
    statsServicesHeading: '服务运行状态',
    statsSystemHeading: '服务器状态',
    statsUptimeLabel: '运行时长',
    statsRamUsageLabel: '进程 / 系统内存',
    statsCpuLoadLabel: 'CPU 与负载',
    statsNodeVersionLabel: '运行环境',
    statsLiveJobsHeading: '实时下载任务',
    statsRecentUsersHeading: '最近注册用户',
    statsRecentDownloadsHeading: '最近下载记录',
    statsSearchUsersPlaceholder: '按名称或邮箱筛选用户...',
    statsSearchDownloadsPlaceholder: '按标题或平台筛选记录...',
    statsEmptyList: '暂无记录。',
    statsLoadError: '加载统计数据失败。',
    statsRetryBtn: '重试',
    statsAllPeriods: '全部时间',
    statsActive: '运行中',
    statsInactive: '关闭',
    statsConfigured: '已配置',
    statsNotConfigured: '未配置',
  },
};
