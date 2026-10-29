/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0b0d13',
        card: '#161a27',
        accent: '#cae962',
      },
    },
  },
  plugins: [],
}
