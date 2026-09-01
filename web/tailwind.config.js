/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // The push-drawer toggles this margin at runtime; keep it in the build.
  safelist: ['mr-[440px]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { DEFAULT: '#F0532B', 600: '#E24721', 50: '#FEECE6' },
      },
    },
  },
  plugins: [],
};
