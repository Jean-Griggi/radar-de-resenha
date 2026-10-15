import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // `_nome` marca parâmetro que a assinatura exige mas a função ainda não usa.
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.next-dev/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
      // Cópias locais do worker do MapLibre e script avulso: não são código do app.
      '**/public/maplibre/**',
      'apps/api/tmp-open-pglite.mjs',
    ],
  },
);
