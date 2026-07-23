/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Control-room palette: near-black with a blue undertone, so panels
        // read as instrumentation rather than a generic dark-mode theme.
        bg: '#0B0E13',
        surface: '#141922',
        raised: '#1B222D',
        line: '#262F3D',
        ink: '#E7EAEE',
        muted: '#8892A0',
        faint: '#5B6472',
        accent: '#3FD1C7', // live/telemetry cyan
        ok: '#4FCB86',
        info: '#5B9DF0',
        warn: '#F0A63C',
        crit: '#F0555A',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulse-slow: 'pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      },
    },
  },
  plugins: [],
};
