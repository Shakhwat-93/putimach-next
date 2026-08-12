import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base (Admin)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          active: 'hsl(var(--sidebar-active))',
          'active-foreground': 'hsl(var(--sidebar-active-foreground))',
        },
        // Storefront
        base: {
          900: '#FDFBF7',
          800: '#FDFBF7',
          700: '#F5F2EB',
          600: '#EAE3D2',
          500: '#FDFBF7',
          400: '#F5F2EB',
          300: '#EAE3D2',
          200: '#E9E2D2',
        },
        brand: {
          DEFAULT: '#C5A880',
          50:  '#FDFBF7',
          100: '#F5F2EB',
          200: '#EAE3D2',
          300: '#DEC6A5',
          400: '#D1B792',
          500: '#C5A880',
          600: '#B8996E',
          700: '#A58356',
          800: '#8B6D43',
          900: '#674F30',
        },
        surface: {
          primary:   '#1C1613',
          secondary: '#7C6E65',
          muted:     '#8C6D4C',
          dim:       '#E9E2D2',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cinzel', 'Poppins', 'Playfair Display', 'serif'],
        serif: ['Cinzel', 'Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'small': ['0.875rem', { lineHeight: '1.6' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(197,168,128,0.1)',
        'glow':    '0 0 24px rgba(197,168,128,0.15)',
        'glow-lg': '0 0 48px rgba(197,168,128,0.2)',
        'glow-xl': '0 0 80px rgba(197,168,128,0.25)',
        'card':    '0 4px 20px rgba(28,22,19,0.04)',
        'card-lg': '0 8px 30px rgba(28,22,19,0.06)',
        'glass':   '0 8px 32px rgba(28,22,19,0.03), inset 0 1px 0 rgba(197,168,128,0.1)',
      },
      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        DEFAULT: '12px',
        'md': '16px',
        'lg': '24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.25,0.1,0.25,1) forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-left': 'slideLeft 0.5s cubic-bezier(0.25,0.1,0.25,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'sk-pulse': 'sk-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(197,168,128,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(197,168,128,0.5)' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'sk-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      backgroundImage: {
        'gradient-radial-brand': 'radial-gradient(ellipse at center, rgba(197,168,128,0.15) 0%, transparent 70%)',
        'gradient-brand': 'linear-gradient(135deg, #C5A880 0%, #DEC6A5 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
} satisfies Config
