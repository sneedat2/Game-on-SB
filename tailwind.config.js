/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is always dark (app.json userInterfaceStyle). 'class' stops NativeWind on web from
  // throwing when Expo sets the color scheme manually.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Keep in sync with src/constants/theme.ts (used where className can't reach, e.g. icon colors).
        // Game On yellow & black
        ink: {
          DEFAULT: '#0A0A0A',
          900: '#0A0A0A',
          800: '#151515',
          700: '#1F1F1F',
          600: '#2C2C2C',
          500: '#424242',
        },
        brand: {
          DEFAULT: '#FFC72C',
          light: '#FFD966',
          dark: '#E0A800',
        },
        gold: '#FFC72C',
        turf: '#22C55E',
        chalk: '#F5F5F5',
        muted: '#A3A3A3',
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};
