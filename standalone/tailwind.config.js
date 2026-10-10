/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0D0908',
        'ink-2': '#150E0C',
        'ink-3': '#1E1411',
        parchment: '#F6ECE6',
        'parchment-dim': '#C9B2A6',
        gold: '#EC6A30',
        'gold-deep': '#9A3A16',
        'gold-bright': '#FFB27A',
        crimson: '#8C2B3A',
        amethyst: '#6647A6',
        ice: '#5FA8CC'
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        decorative: ['"Cinzel Decorative"', 'serif'],
        body: ['Barlow', 'sans-serif'],
        sans: ['Barlow', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backgroundImage: {
        'royal-radial': 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.12), transparent 60%)'
      }
    }
  },
  plugins: []
}
