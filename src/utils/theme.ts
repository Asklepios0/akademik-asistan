import { Appearance } from 'react-native';

export const THEME = {
  dark: {
    bg: '#0F172A', // Slate 900
    card: '#1E293B', // Slate 800
    cardSubtle: '#334155', // Slate 700
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B', // Slate 500
    accent: '#38BDF8', // Sky 400
    accentHover: '#0284C7',
    accentLight: 'rgba(56, 189, 248, 0.15)',
    success: '#10B981', // Emerald 500
    successLight: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B', // Amber 500
    warningLight: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444', // Red 500
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    purple: '#8B5CF6',
    purpleLight: 'rgba(139, 92, 246, 0.15)',
    inputBg: '#090D16',
    inputBorder: 'rgba(255, 255, 255, 0.12)',
    tabBarBg: '#090D16',
    tabBarBorder: 'rgba(255, 255, 255, 0.06)',
    modalBg: '#1E293B',
    modalOverlay: 'rgba(0, 0, 0, 0.75)',
    chipBg: '#0F172A',
    chipBorder: 'rgba(255, 255, 255, 0.1)',
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  oled: {
    bg: '#000000', // Pure OLED Black
    card: '#080808', // Ultra Dark
    cardSubtle: '#141414',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    accent: '#38BDF8',
    accentHover: '#0284C7',
    accentLight: 'rgba(56, 189, 248, 0.2)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.2)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.2)',
    danger: '#EF4444',
    dangerLight: 'rgba(239, 68, 68, 0.2)',
    purple: '#A855F7',
    purpleLight: 'rgba(168, 85, 247, 0.2)',
    inputBg: '#0A0A0A',
    inputBorder: 'rgba(255, 255, 255, 0.18)',
    tabBarBg: '#000000',
    tabBarBorder: 'rgba(255, 255, 255, 0.12)',
    modalBg: '#0A0A0A',
    modalOverlay: 'rgba(0, 0, 0, 0.85)',
    chipBg: '#141414',
    chipBorder: 'rgba(255, 255, 255, 0.15)',
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  light: {
    bg: '#F8FAFC', // Slate 50
    card: '#FFFFFF',
    cardSubtle: '#F1F5F9', // Slate 100
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    textPrimary: '#0F172A', // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94A3B8', // Slate 400
    accent: '#0284C7', // Sky 600
    accentHover: '#0369A1',
    accentLight: 'rgba(2, 132, 199, 0.12)',
    success: '#059669', // Emerald 600
    successLight: 'rgba(5, 150, 105, 0.12)',
    warning: '#D97706', // Amber 600
    warningLight: 'rgba(217, 119, 6, 0.12)',
    danger: '#DC2626', // Red 600
    dangerLight: 'rgba(220, 38, 38, 0.12)',
    purple: '#7C3AED',
    purpleLight: 'rgba(124, 58, 237, 0.12)',
    inputBg: '#F1F5F9',
    inputBorder: 'rgba(0, 0, 0, 0.12)',
    tabBarBg: '#FFFFFF',
    tabBarBorder: 'rgba(0, 0, 0, 0.08)',
    modalBg: '#FFFFFF',
    modalOverlay: 'rgba(15, 23, 42, 0.55)',
    chipBg: '#F8FAFC',
    chipBorder: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(0, 0, 0, 0.06)',
  }
};

export type ThemeColors = typeof THEME.dark;

export function getAppTheme(themeName?: string): ThemeColors {
  if (themeName === 'system') {
    const sys = Appearance.getColorScheme();
    return sys === 'light' ? THEME.light : THEME.dark;
  }
  if (themeName === 'light') return THEME.light;
  if (themeName === 'oled') return THEME.oled;
  return THEME.dark;
}

