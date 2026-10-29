/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#000000',
        card: '#0d0d0d',
        accent: '#ffffff',
        accentLight: '#a1a1aa',
      },
    },
  },
  plugins: [],
}
