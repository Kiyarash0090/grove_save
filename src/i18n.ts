export type AppLanguage = 'en' | 'fa' | 'ru' | 'zh';
export type AppTheme = 'dark' | 'light';

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
  downloadingToApp: string;
  processingMedia: string;
  saveFromSite: string;
  readyInApp: string;
  preparing: string;
  downloading: string;
  savedToDevice: string;
  readyToSave: string;
  watchOnline: string;
  hidePlayer: string;
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
  reDownload: string;
  invalidUrlError: string;
  inspectFailed: string;
  downloadFailed: string;
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
  sectionAppearance: string;
  themeLabel: string;
  themeBlack: string;
  themeWhite: string;
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
  // Admin sub-page navigation & moved cookies section
  backToSettings: string;
  potPluginReady: string;
  youtubeCookiesSection: string;
  youtubeSaveCookiesBtn: string;
  xrayNavDesc: string;
  potNavDesc: string;
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
      '2160p': { label: '2160p', sub: '4K Ultra HD' },
      '1080p': { label: '1080p', sub: 'Full HD' },
      '720p': { label: '720p', sub: 'HD' },
      '480p': { label: '480p', sub: 'Standard' },
      '360p': { label: '360p', sub: 'Compact' },
      audio: { label: 'Audio', sub: 'MP3 320k' },
    },
    downloadNow: 'Save to Device',
    prepareDownload: 'Download to App',
    downloadingToApp: 'Downloading in app...',
    processingMedia: 'Processing file...',
    saveFromSite: 'Download File to Device',
    readyInApp: 'File ready in app',
    preparing: 'Preparing stream...',
    downloading: 'Saving file...',
    savedToDevice: 'Saved to device storage',
    readyToSave: 'Ready to save',
    watchOnline: 'Watch Online',
    hidePlayer: 'Hide Player',
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
    reDownload: 'Save again',
    invalidUrlError: 'Please enter a valid http or https media link.',
    inspectFailed: 'Could not read link details. Check the link and try again.',
    downloadFailed: 'Download failed. Please check the link or backend connection.',
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
    sectionAppearance: 'Appearance & Language',
    themeLabel: 'Theme',
    themeBlack: 'Pure Black',
    themeWhite: 'Pure White',
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
    backToSettings: 'Back to Settings',
    potPluginReady: 'yt-dlp plugin ready',
    youtubeCookiesSection: 'YouTube Cookies',
    youtubeSaveCookiesBtn: 'Save Cookies',
    xrayNavDesc: 'Manage servers, proxy tunnel & YouTube tests',
    potNavDesc: 'bgutil server, yt-dlp plugin & YouTube cookies',
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
      '2160p': { label: '2160p', sub: 'کیفیت 4K' },
      '1080p': { label: '1080p', sub: 'فول اچ‌دی' },
      '720p': { label: '720p', sub: 'اچ‌دی' },
      '480p': { label: '480p', sub: 'معمولی' },
      '360p': { label: '360p', sub: 'کم‌حجم' },
      audio: { label: 'صوت', sub: 'MP3 320k' },
    },
    downloadNow: 'ذخیره در حافظه گوشی',
    prepareDownload: 'دانلود فایل در برنامه',
    downloadingToApp: 'در حال دانلود در برنامه...',
    processingMedia: 'در حال آماده‌سازی فایل...',
    saveFromSite: 'دانلود از سایت در حافظه گوشی',
    readyInApp: 'فایل در برنامه آماده شد',
    preparing: 'در حال آماده‌سازی...',
    downloading: 'در حال ذخیره فایل...',
    savedToDevice: 'در حافظه دستگاه ذخیره شد',
    readyToSave: 'آماده برای ذخیره',
    watchOnline: 'پخش آنلاین',
    hidePlayer: 'بستن پخش‌کننده',
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
    reDownload: 'دانلود مجدد',
    invalidUrlError: 'لطفاً یک لینک معتبر با http یا https وارد کنید.',
    inspectFailed: 'دریافت اطلاعات لینک انجام نشد. لینک را بررسی کنید.',
    downloadFailed: 'دانلود ناموفق بود. اتصال سرور یا لینک را بررسی کنید.',
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
    sectionAppearance: 'ظاهر و زبان',
    themeLabel: 'تم برنامه',
    themeBlack: 'کاملاً سیاه',
    themeWhite: 'کاملاً سفید',
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
    backToSettings: 'بازگشت به تنظیمات',
    potPluginReady: 'افزونه yt-dlp آماده است',
    youtubeCookiesSection: 'کوکی‌های یوتیوب',
    youtubeSaveCookiesBtn: 'ذخیره کوکی‌ها',
    xrayNavDesc: 'مدیریت سرورها، تونل وی‌پی‌ان و تست دانلود یوتیوب',
    potNavDesc: 'سرور bgutil، افزونه yt-dlp و کوکی‌های یوتیوب',
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
      '2160p': { label: '2160p', sub: '4K Ultra HD' },
      '1080p': { label: '1080p', sub: 'Full HD' },
      '720p': { label: '720p', sub: 'HD' },
      '480p': { label: '480p', sub: 'Стандарт' },
      '360p': { label: '360p', sub: 'Компакт' },
      audio: { label: 'Аудио', sub: 'MP3 320k' },
    },
    downloadNow: 'Сохранить на устройство',
    prepareDownload: 'Загрузить в приложение',
    downloadingToApp: 'Загрузка в приложение...',
    processingMedia: 'Обработка файла...',
    saveFromSite: 'Скачать файл на устройство',
    readyInApp: 'Файл готов в приложении',
    preparing: 'Подготовка потока...',
    downloading: 'Сохранение файла...',
    savedToDevice: 'Сохранено в память устройства',
    readyToSave: 'Готово к сохранению',
    watchOnline: 'Смотреть онлайн',
    hidePlayer: 'Скрыть плеер',
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
    reDownload: 'Скачать снова',
    invalidUrlError: 'Введите корректную ссылку http или https.',
    inspectFailed: 'Не удалось получить данные по ссылке.',
    downloadFailed: 'Ошибка загрузки. Проверьте ссылку или сервер.',
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
    sectionAppearance: 'Оформление и язык',
    themeLabel: 'Тема',
    themeBlack: 'Чисто чёрная',
    themeWhite: 'Чисто белая',
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
    backToSettings: 'Назад к настройкам',
    potPluginReady: 'Плагин yt-dlp готов',
    youtubeCookiesSection: 'Cookies YouTube',
    youtubeSaveCookiesBtn: 'Сохранить Cookies',
    xrayNavDesc: 'Серверы, прокси-туннель и тесты на YouTube',
    potNavDesc: 'Сервер bgutil, плагин yt-dlp и cookies YouTube',
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
      '2160p': { label: '2160p', sub: '4K 超清' },
      '1080p': { label: '1080p', sub: '全高清' },
      '720p': { label: '720p', sub: '高清' },
      '480p': { label: '480p', sub: '标清' },
      '360p': { label: '360p', sub: '流畅' },
      audio: { label: '音频', sub: 'MP3 320k' },
    },
    downloadNow: '保存到设备',
    prepareDownload: '下载到应用',
    downloadingToApp: '正在下载到应用...',
    processingMedia: '正在处理文件...',
    saveFromSite: '从网站保存到设备',
    readyInApp: '文件已在应用中就绪',
    preparing: '正在准备媒体流...',
    downloading: '正在保存文件...',
    savedToDevice: '已保存至设备存储',
    readyToSave: '准备就绪',
    watchOnline: '在线观看',
    hidePlayer: '收起播放器',
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
    reDownload: '重新保存',
    invalidUrlError: '请输入有效的 http 或 https 链接。',
    inspectFailed: '无法读取链接信息，请检查后重试。',
    downloadFailed: '下载失败，请检查链接或服务器连接。',
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
    sectionAppearance: '外观与语言',
    themeLabel: '主题',
    themeBlack: '纯黑模式',
    themeWhite: '纯白模式',
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
    backToSettings: '返回设置',
    potPluginReady: 'yt-dlp 插件已就绪',
    youtubeCookiesSection: 'YouTube Cookies',
    youtubeSaveCookiesBtn: '保存 Cookies',
    xrayNavDesc: '管理节点配置、代理隧道与 YouTube 下载测试',
    potNavDesc: 'bgutil 服务、yt-dlp 插件与 YouTube Cookies',
  },
};
