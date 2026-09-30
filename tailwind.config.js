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
        ink: {
          DEFAULT: '#0B0F14',
          900: '#0B0F14',
          800: '#121820',
          700: '#1A222D',
          600: '#26313F',
          500: '#3A4757',
        },
        brand: {
          DEFAULT: '#FB4F14',
          light: '#FF7A45',
          dark: '#C73A08',
        },
        gold: '#FFC72C',
        turf: '#22C55E',
        chalk: '#F5F7FA',
        muted: '#8B98A9',
      },
      fontFamily: {
        display: ['System'],
      },
    },
  },
  plugins: [],
};
