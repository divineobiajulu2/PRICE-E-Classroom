import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'sans-serif'], // or whatever font your BrandText uses
        },
      colors: {
        // Brand Colors
        primary: '#0571D3',        // Main Blue
        'primary-dark': '#023D73', // Deep Blue
        accent: '#FFD600',         // Yellow Accent
        
        // Semantic Colors
        navy: '#001a3d',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        
        // Status Colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        
        // Background Colors
        'background-dark': '#0f1419',
      },
      
      backgroundColor: {
        primary: '#0571D3',
        'primary-dark': '#023D73',
        accent: '#FFD600',
      },
      
      borderColor: {
        primary: '#0571D3',
        'primary-dark': '#023D73',
        accent: '#FFD600',
      },
      
      textColor: {
        primary: '#0571D3',
        'primary-dark': '#023D73',
        accent: '#FFD600',
      },
      
      ringColor: {
        primary: '#0571D3',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [forms],
};
