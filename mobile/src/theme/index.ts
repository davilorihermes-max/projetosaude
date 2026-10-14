// mobile/src/theme/index.ts

export interface ColorTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceVariant: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  accent: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  cardShadow: string;
  headerBackground: string;
  headerBorder: string;
  tabBarBackground: string;
  tabBarBorder: string;
  inputBackground: string;
  inputBorder: string;
}

export const lightTheme: ColorTheme = {
  isDark: false,
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceVariant: '#f1f5f9',
  border: '#e2e8f0',
  borderSubtle: '#edf2f7',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0d9488', // Medical Teal
  primaryLight: '#14b8a6',
  primaryDark: '#0f766e',
  primaryMuted: '#ccfbf1',
  accent: '#2563eb', // Indigo Blue
  success: '#10b981',
  successBg: '#d1fae5',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#ef4444',
  dangerBg: '#fee2e2',
  info: '#0284c7',
  infoBg: '#e0f2fe',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
  headerBackground: '#ffffff',
  headerBorder: '#e2e8f0',
  tabBarBackground: '#ffffff',
  tabBarBorder: '#e2e8f0',
  inputBackground: '#f8fafc',
  inputBorder: '#cbd5e1',
};

export const darkTheme: ColorTheme = {
  isDark: true,
  background: '#090d16',
  surface: '#111827',
  surfaceElevated: '#1f2937',
  surfaceVariant: '#1e293b',
  border: '#334155',
  borderSubtle: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  primary: '#14b8a6', // Brighter teal for contrast
  primaryLight: '#2dd4bf',
  primaryDark: '#0d9488',
  primaryMuted: '#134e4a',
  accent: '#3b82f6',
  success: '#34d399',
  successBg: '#064e3b',
  warning: '#fbbf24',
  warningBg: '#78350f',
  danger: '#f87171',
  dangerBg: '#7f1d1d',
  info: '#38bdf8',
  infoBg: '#0c4a6e',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  headerBackground: '#111827',
  headerBorder: '#1f2937',
  tabBarBackground: '#111827',
  tabBarBorder: '#1f2937',
  inputBackground: '#1e293b',
  inputBorder: '#475569',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};
