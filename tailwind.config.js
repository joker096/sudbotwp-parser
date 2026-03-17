/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#3B82F6',
        'accent-light': '#60A5FA',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
