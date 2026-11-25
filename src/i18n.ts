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
  },
};
