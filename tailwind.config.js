/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#0d0d14',
          secondary: '#13131f',
          card: '#1a1a2e',
          card2: '#1e1e35',
          purple: '#7c3aed',
          'purple-light': '#9d5ff5',
          green: '#22c55e',
          orange: '#f97316',
          gold: '#eab308',
          text: '#f1f0fa',
          muted: '#5c5a75',
          border: 'rgba(255,255,255,0.07)',
          'border-hover': 'rgba(255,255,255,0.14)',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'spin-slow': 'spin 1.2s linear infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
}
