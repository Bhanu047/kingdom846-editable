/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1220',
        'ink-2': '#161B30',
        'ink-3': '#1E2440',
        parchment: '#F3E8CC',
        'parchment-dim': '#D9CBA3',
        gold: '#D4AF37',
        'gold-deep': '#9C7A24',
        'gold-bright': '#E8C766',
        crimson: '#8C2B3A',
        amethyst: '#6647A6',
        ice: '#5FA8CC'
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        decorative: ['"Cinzel Decorative"', 'serif'],
        body: ['Spectral', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backgroundImage: {
        'royal-radial': 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.12), transparent 60%)'
      }
    }
  },
  plugins: []
}
