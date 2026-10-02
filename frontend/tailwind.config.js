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
        // Bio-Emerald Dark Mode
        'bio-dark': {
          bg: '#041E20',
          text: '#E8F5E9',
          primary: '#00FFA3',
          card: 'rgba(6, 42, 45, 0.85)',
          'card-border': 'rgba(0, 255, 163, 0.15)',
          highlight: '#FFB300',
          secondary: '#A5D6A7',
        },
        // Bio-Emerald Light Mode
        'bio-light': {
          bg: '#D1E8E2',
          text: '#2C3E50',
          heading: '#1A5276',
          card: 'rgba(255,255,255,0.85)',
          highlight: '#C0392B',
          tech: '#16A085',
          secondary: '#5D6D7E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}