/**
 * MugenBunko Mobile Color Tokens
 * Minimalist & Washi/Charcoal Paper Aesthetics
 */

export interface ColorSchemeTokens {
  text: string;
  textMuted: string;
  textSecondary: string;
  background: string;
  card: string;
  cardHover: string;
  border: string;
  tint: string;
  accent: string;
  tabIconDefault: string;
  tabIconSelected: string;
  badgeBg: string;
  badgeText: string;
  readerBg: string;
}

export const Colors: Record<'light' | 'dark' | 'sepia', ColorSchemeTokens> = {
  light: {
    text: '#2A2E30',
    textMuted: '#737B82',
    textSecondary: '#525960',
    background: '#FAF8F5',       // Washi paper cream tone
    card: '#FFFFFF',
    cardHover: '#FDFCFB',
    border: '#EAE5DC',
    tint: '#1C2D37',             // Deep Indigo Black
    accent: '#E05275',           // Sakura accent
    tabIconDefault: '#8C939B',
    tabIconSelected: '#1C2D37',
    badgeBg: '#EDE8DF',
    badgeText: '#4A5056',
    readerBg: '#FDFBF7',
  },
  dark: {
    text: '#E2E2E7',
    textMuted: '#8E8E93',
    textSecondary: '#AEAEB2',
    background: '#121214',       // Matte charcoal dark
    card: '#1C1C1F',
    cardHover: '#242428',
    border: '#2E2E33',
    tint: '#FFFFFF',
    accent: '#E05275',
    tabIconDefault: '#636366',
    tabIconSelected: '#FFFFFF',
    badgeBg: '#2C2C2E',
    badgeText: '#D1D1D6',
    readerBg: '#121214',
  },
  sepia: {
    text: '#3D2F1F',
    textMuted: '#7D6853',
    textSecondary: '#5E4E3B',
    background: '#EFE5CC',       // Vintage Sepia paper
    card: '#F9F3E3',
    cardHover: '#FCF9F0',
    border: '#DBCCA9',
    tint: '#3D2F1F',
    accent: '#B83253',
    tabIconDefault: '#9E8B75',
    tabIconSelected: '#3D2F1F',
    badgeBg: '#E2D3B3',
    badgeText: '#4A3C2B',
    readerBg: '#F4EDD8',
  }
};

export default Colors;
