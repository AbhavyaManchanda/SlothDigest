/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sloth: {
          950: '#06090e',
          900: '#0a0f18',
          850: '#0f172a',
          800: '#172033',
          700: '#26344d',
          600: '#3c4e6d',
          accent: '#10b981', // forest green
          accentHover: '#059669',
          amber: '#f59e0b',
          muted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
