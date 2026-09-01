/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0078d4',
          foreground: '#ffffff',
          dark: '#005a9e',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#128C7E',
        },
      },
    },
  },
  plugins: [],
};
