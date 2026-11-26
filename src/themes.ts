export type AppTheme =
  | 'dark'
  | 'light'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'shiraz'
  | 'pastelDark';

export interface ThemeMeta {
  id: AppTheme;
  isDark: boolean;
  metaColor: string;
  ringPrimary: string;
  ringSecondary: string;
  swatchBg: string;
}

export const THEME_LIST: ThemeMeta[] = [
  {
    id: 'dark',
    isDark: true,
    metaColor: '#000000',
    ringPrimary: '#ffffff',
    ringSecondary: '#a1a1aa',
    swatchBg: '#09090b',
  },
  {
    id: 'light',
    isDark: false,
    metaColor: '#ffffff',
    ringPrimary: '#18181b',
    ringSecondary: '#d4d4d8',
    swatchBg: '#ffffff',
  },
  {
    id: 'spring',
    isDark: false,
    metaColor: '#ecf9f0',
    ringPrimary: '#10b981',
    ringSecondary: '#f43f5e',
    swatchBg: '#e8f8ed',
  },
  {
    id: 'summer',
    isDark: false,
    metaColor: '#fff5e0',
    ringPrimary: '#f59e0b',
    ringSecondary: '#06b6d4',
    swatchBg: '#fff3d6',
  },
  {
    id: 'autumn',
    isDark: false,
    metaColor: '#fceddd',
    ringPrimary: '#ea580c',
    ringSecondary: '#d97706',
    swatchBg: '#fae5d0',
  },
  {
    id: 'winter',
    isDark: true,
    metaColor: '#071322',
    ringPrimary: '#38bdf8',
    ringSecondary: '#e0f2fe',
    swatchBg: '#0b1d36',
  },
  {
    id: 'shiraz',
    isDark: true,
    metaColor: '#13080d',
    ringPrimary: '#e2a3b6',
    ringSecondary: '#c493b2',
    swatchBg: '#230e18',
  },
  {
    id: 'pastelDark',
    isDark: true,
    metaColor: '#0d0f14',
    ringPrimary: '#b7b4ed',
    ringSecondary: '#9bdac8',
    swatchBg: '#151821',
  },
];

const THEME_MAP = new Map<AppTheme, ThemeMeta>(THEME_LIST.map((t) => [t.id, t]));

export function normalizeAppTheme(raw: unknown): AppTheme {
  if (typeof raw === 'string' && THEME_MAP.has(raw as AppTheme)) {
    return raw as AppTheme;
  }
  return 'dark';
}

export function getThemeMeta(theme: AppTheme): ThemeMeta {
  return THEME_MAP.get(theme) || THEME_LIST[0];
}

export function isDarkTheme(theme: AppTheme): boolean {
  return getThemeMeta(theme).isDark;
}
