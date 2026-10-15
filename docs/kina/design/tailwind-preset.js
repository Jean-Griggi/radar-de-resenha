/**
 * KINA — preset opcional para Tailwind CSS (v3).
 * Só use se o projeto já usa Tailwind. As cores apontam para as variáveis de
 * design/tokens.css, então a troca de tema continua sendo feita pelo atributo
 * data-theme no <html>, sem classes dark: duplicadas.
 *
 * Uso (tailwind.config.js):
 *   module.exports = { presets: [require('./docs/kina/design/tailwind-preset.js')], ... }
 *
 * Tailwind v4 (config em CSS): replique estes valores dentro de @theme { ... }
 * usando as mesmas var(--k-*). Ver PLANO-IMPLEMENTACAO.md, Fase 1.
 */
const v = (name) => `var(--k-${name})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        k: {
          bg: v('bg'),
          sunken: v('bg-sunken'),
          raised: v('surface-raised'),
          text: v('text'),
          muted: v('text-muted'),
          subtle: v('text-subtle'),
          line: v('line'),
          'line-strong': v('line-strong'),
          brand: v('brand'),
          'brand-hover': v('brand-hover'),
          'brand-press': v('brand-press'),
          'brand-text': v('brand-text'),
          'on-brand': v('on-brand'),
          accent: v('accent'),
          focus: v('focus'),
          danger: v('danger'),
          success: v('success'),
          warning: v('warning'),
          corner: v('corner'),
        },
      },
      fontFamily: {
        display: [v('font-display')],
        ui: [v('font-ui')],
        mono: [v('font-mono')],
      },
      fontSize: {
        'k-12': v('fs-12'), 'k-14': v('fs-14'), 'k-16': v('fs-16'), 'k-20': v('fs-20'),
        'k-25': v('fs-25'), 'k-31': v('fs-31'), 'k-39': v('fs-39'), 'k-49': v('fs-49'),
        'k-61': v('fs-61'), 'k-76': v('fs-76'), 'k-96': v('fs-96'),
      },
      borderRadius: {
        none: '0',
        control: v('radius-control'),
        person: v('radius-person'),
      },
      boxShadow: {
        overlay: v('shadow-overlay'),
      },
      transitionDuration: {
        instant: '100ms', quick: '160ms', base: '240ms', move: '360ms', scene: '520ms',
      },
      transitionTimingFunction: {
        arrive: 'cubic-bezier(.2, 0, 0, 1)',
        leave: 'cubic-bezier(.4, 0, 1, 1)',
      },
      minHeight: { touch: v('touch') },
      minWidth: { touch: v('touch') },
    },
  },
};
