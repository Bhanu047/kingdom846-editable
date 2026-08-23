/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NIGHTWATCH. Cold ground, cool light, gold kept for ceremony only.
        // The token names are unchanged on purpose -- ~1,060 usages across the
        // app read through them, so the whole site re-tones from this block
        // instead of a thousand edits.
        ink: '#05070F',
        'ink-2': '#0A0F1E',
        'ink-3': '#101A2E',
        // Was a warm cream. Cooling the body text is the single biggest lever
        // on the site's tone -- everything else follows it.
        parchment: '#DDEBF7',
        'parchment-dim': '#93A8C4',
        // Ceremonial: crest, seals, rules, the "official document" register.
        // Deliberately NOT used to carry data any more.
        gold: '#D4AF37',
        'gold-deep': '#9C7A24',
        'gold-bright': '#E8C766',
        // Suite signatures. Each Battle Lab tool owns one, so five tools built
        // from one visual language still read as five different places.
        ice: '#4DE1FF',        // Bear
        amethyst: '#7B61FF',   // Mystic
        crimson: '#FF5C7A',    // PvP
        mint: '#5EE9A4',       // Formation + the "good/optimal" signal
        steel: '#8FA3C8'       // the neutral "what you run now"
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        decorative: ['"Cinzel Decorative"', 'serif'],
        body: ['Spectral', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backgroundImage: {
        'royal-radial': 'radial-gradient(circle at 50% 0%, rgba(77,225,255,0.10), transparent 60%)'
      }
    }
  },
  plugins: []
}
