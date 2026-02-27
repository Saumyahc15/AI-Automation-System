/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        surface: '#0B1224',
        card: '#0f172a',
      },
      boxShadow: {
        glow: '0 10px 50px rgba(59, 130, 246, 0.35)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.15) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}

