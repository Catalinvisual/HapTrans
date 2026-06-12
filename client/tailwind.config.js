/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5A00', // HapCargo Orange
          dark: '#E04D00',
          light: '#FFF0E6',
        },
        secondary: '#0D1B2A', // HapCargo Dark Blue
        accent: '#1976D2', // HapCargo Bright Blue
        success: '#10B981', 
        error: '#EF4444',
        warning: '#F59E0B',
        surface: '#F2F4F7', // HapCargo Background
        card: '#FFFFFF',
        text: {
          DEFAULT: '#0D1B2A', // Using secondary as main dark text
          secondary: '#6B7280',
          light: '#9CA3AF',
        },
        border: '#F3F4F6', 
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-hover': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'sidebar': '4px 0 24px 0 rgb(0 0 0 / 0.03)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
}
