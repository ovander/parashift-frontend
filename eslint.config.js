/**
 * ESLint flat config (eslint ≥ 9)
 *
 * Registers the local no-hardcoded-ui-strings rule so CI can detect regressions
 * where developers add UI text without wrapping it in t().
 *
 * Run:  npx eslint src --ext .vue,.ts
 */

import noHardcodedUiStrings from './src/eslint-rules/no-hardcoded-ui-strings.cjs'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    // Apply the rule to all Vue SFCs and TypeScript source files.
    files: ['src/**/*.vue', 'src/**/*.ts'],

    // Exclude test files, generated files, and the rule itself.
    ignores: [
      '**/*.spec.*',
      '**/*.test.*',
      'src/eslint-rules/**',
      'src/**/__mocks__/**',
    ],

    plugins: {
      local: {
        rules: {
          'no-hardcoded-ui-strings': noHardcodedUiStrings,
        },
      },
    },

    rules: {
      // Warn in local dev; treat as error in CI by passing --max-warnings 0
      'local/no-hardcoded-ui-strings': 'warn',
    },
  },
]
