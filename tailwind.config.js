/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "cyber NOC" palette
        noc: {
          950: '#0a0f1c',
          900: '#0d1424',
          800: '#121b2e',
          700: '#1b2740',
          600: '#27354f',
        },
        cyan: {
          neon: '#22d3ee',
        },
        lime: {
          neon: '#a3e635',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -6px rgba(34,211,238,0.45)',
        'glow-lg': '0 0 40px -10px rgba(34,211,238,0.6)',
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pingWave: {
          '0%': { transform: 'scale(0.4)', opacity: '0.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        blink: 'blink 1.05s step-end infinite',
        scanline: 'scanline 9s linear infinite',
        pingWave: 'pingWave 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}
