/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#030712',
        card: '#0a101f',
        accent: '#0284c7',
        accentLight: '#38bdf8',
      },
    },
  },
  plugins: [],
}
