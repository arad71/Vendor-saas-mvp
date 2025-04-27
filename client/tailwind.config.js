/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#4f46e5', // Indigo-600 as primary
          600: '#4338ca',
          700: '#312e81',
          800: '#1e1b4b',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        'card': '0 2px 5px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      height: {
        '1/2': '50%',
      },
      minHeight: {
        '64': '16rem',
        '80': '20rem',
        '90vh': '90vh',
      },
      maxHeight: {
        '90vh': '90vh',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      opacity: {
        '85': '0.85',
        '95': '0.95',
      }
    },
  },
  plugins: [],
}
