// Raw color values for props that don't accept className (icons, tab bar, status bar, SVG).
// Keep in sync with tailwind.config.js. Game On yellow & black.
export const colors = {
  ink900: '#0A0A0A',
  ink800: '#151515',
  ink700: '#1F1F1F',
  ink600: '#2C2C2C',
  ink500: '#424242',
  brand: '#FFC72C',
  brandLight: '#FFD966',
  /** Text/icons placed ON the yellow brand color. */
  onBrand: '#0A0A0A',
  gold: '#FFC72C',
  turf: '#22C55E',
  chalk: '#F5F5F5',
  muted: '#A3A3A3',
} as const;
