/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'carbon-asphalt': '#090B0E',
        'cockpit-console': '#11141A',
        'cockpit-elevated': '#171B23',
        'cockpit-panel': '#1E232D',
        'hairline-border': 'rgba(255, 255, 255, 0.08)',
        'f1-crimson': '#E10600',
        'telemetry-cyan': '#00E5FF',
        'telemetry-amber': '#FFB800',
        'fastest-lap-purple': '#BD00FF',
        'personal-best-green': '#00E676',
        'pure-white': '#F8FAFC',
        'muted-steel': '#64748B',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(0, 229, 255, 0.5))' },
          '50%': { filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.8))' },
        },
      },
      animation: {
        'scan': 'scan 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulseSlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowPulse 3s ease-in-out infinite',
      },
      backgroundImage: {
        'carbon-grid': 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
