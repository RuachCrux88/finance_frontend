// tailwind.config.ts
import type { Config } from 'tailwindcss'

import generated from '@tailwindcss/forms';

import generated0 from '@tailwindcss/typography';

export default {
  content: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ["var(--font-display)", "var(--font-sans)"],
      },
      colors: {
        bg:      "#0b0b12",
        surface: "#11121a",
        // paleta morada/azul
        primary:  { DEFAULT: "#8b5cf6",  50:"#f5f3ff", 100:"#ede9fe", 200:"#ddd6fe", 300:"#c4b5fd", 400:"#a78bfa", 500:"#8b5cf6", 600:"#7c3aed", 700:"#6d28d9", 800:"#5b21b6", 900:"#4c1d95" },
        fuchsia:  { DEFAULT: "#d946ef" },
        cyan:     { DEFAULT: "#22d3ee" },
        emerald:  { DEFAULT: "#10b981" },
        slate:    { 800:"#1f2233", 900:"#141627" },
      },
      boxShadow: {
        glow: "0 0 40px 0 rgba(139,92,246,.35)",
        soft: "0 6px 24px rgba(0,0,0,.25)",
      },
      backgroundImage: {
        'radial-dots': "radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)",
        'grid': "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
        'hero-gradient': "radial-gradient(1200px 600px at 10% -10%, rgba(139,92,246,.25) 0, transparent 55%), radial-gradient(800px 500px at 90% 10%, rgba(34,211,238,.25) 0, transparent 60%)",
      },
      backgroundSize: {
        'radial-dots': '24px 24px',
        'grid': '40px 40px',
      },
      borderRadius: {
        '2xl': '1.25rem',
      }
    },
  },
  plugins: [generated, generated0],
} satisfies Config;
