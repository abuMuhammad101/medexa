/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;

const space = {
  0: '0px', px: '1px',
  0.5: v('space-050'), 1: v('space-100'), 1.5: v('space-150'), 2: v('space-200'), 2.5: v('space-250'),
  3: v('space-300'), 3.5: v('space-350'), 4: v('space-400'), 5: v('space-500'), 6: v('space-600'),
  7: v('space-700'), 8: v('space-800'), 9: v('space-900'), 10: v('space-1000'), 11: v('space-1100'),
  12: v('space-1200'), 14: v('space-1400'), 16: v('space-1600'), 20: v('space-2000'), 30: v('space-3000'),
  40: v('space-4000'), 60: v('space-6000'), 80: v('space-8000'),
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    spacing: space,
    borderRadius: {
      none: '0', xs: v('radius-xs'), sm: v('radius-sm'), md: v('radius-md'), lg: v('radius-lg'),
      xl: v('radius-xl'), full: v('radius-full'),
    },
    boxShadow: {
      none: 'none', xs: v('shadow-xs'), raised: v('shadow-raised'), hover: v('shadow-hover'),
      modal: v('shadow-modal'), focus: v('shadow-focus'), ai: v('ai-glow-shadow'),
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      primary: { DEFAULT: v('color-primary'), hover: v('color-primary-hover'), pressed: v('color-primary-pressed'), subtle: v('color-primary-subtle'), 'subtle-strong': v('color-primary-subtle-strong') },
      ink: { DEFAULT: v('color-ink'), hover: v('color-ink-hover') },
      indigo: { DEFAULT: v('color-indigo'), bg: v('color-indigo-bg') },
      teal: v('color-teal'),
      surface: { DEFAULT: v('color-surface'), muted: v('color-surface-muted'), sunken: v('color-surface-sunken'), glass: v('color-surface-glass') },
      scrim: v('color-scrim'),
      disabled: { bg: v('color-disabled-bg'), text: v('color-disabled-text') },
      fg: { DEFAULT: v('color-text-primary'), secondary: v('color-text-secondary'), tertiary: v('color-text-tertiary'), 'on-dark': v('color-text-on-dark'), 'on-dark-muted': v('color-text-on-dark-muted') },
      line: { DEFAULT: v('color-border'), strong: v('color-border-strong'), dark: v('color-border-on-dark') },
      focus: v('color-focus'),
      success: { DEFAULT: v('color-success'), bg: v('color-success-bg'), text: v('color-success-text') },
      warning: { DEFAULT: v('color-warning'), bg: v('color-warning-bg'), text: v('color-warning-text') },
      error: { DEFAULT: v('color-error'), bg: v('color-error-bg'), text: v('color-error-text') },
      info: { DEFAULT: v('color-info'), bg: v('color-info-bg') },
      dark: { card: v('color-dark-card'), card2: v('color-dark-card-2') },
      deck: { 1: v('color-deck-1'), 2: v('color-deck-2'), 3: v('color-deck-3') },
    },
    fontFamily: { sans: v('font-sans'), arabic: v('font-arabic') },
    fontSize: {
      micro: [v('text-micro'), { lineHeight: v('leading-body') }],
      caption: [v('text-caption'), { lineHeight: v('leading-body') }],
      'body-sm': [v('text-body-sm'), { lineHeight: v('leading-body') }],
      body: [v('text-body'), { lineHeight: v('leading-body') }],
      'body-lg': [v('text-body-lg'), { lineHeight: v('leading-body') }],
      h4: [v('text-h4'), { lineHeight: v('leading-heading') }],
      h3: [v('text-h3'), { lineHeight: v('leading-heading') }],
      h2: [v('text-h2'), { lineHeight: v('leading-heading') }],
      h1: [v('text-h1'), { lineHeight: v('leading-heading') }],
      stat: [v('text-stat'), { lineHeight: v('leading-heading') }],
      display: [v('text-display'), { lineHeight: v('leading-heading') }],
    },
    extend: {
      backgroundImage: {
        ambient: v('gradient-ambient'),
        'dark-card': v('gradient-dark-card'),
        'claim-ready': v('gradient-claim-ready'),
        'pipeline-head': v('gradient-pipeline-head'),
        'ai-border': v('gradient-ai-border'),
        'ai-glow': v('ai-glow'),
      },
      width: { rail: v('rail-width'), modal: v('modal-width'), pulse: v('pulse-width'), drawer: v('drawer-width') },
      minHeight: { touch: v('touch-min') },
      minWidth: { touch: v('touch-min') },
      transitionDuration: { fast: v('dur-fast'), base: v('dur-base'), slow: v('dur-slow') },
      transitionTimingFunction: { standard: v('ease-standard') },
    },
  },
  plugins: [],
};
