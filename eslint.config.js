/**
 * ESLint flat config (eslint ≥ 9)
 *
 * Registers the local no-hardcoded-ui-strings rule so CI can detect regressions
 * where developers add UI text without wrapping it in t().
 *
 * Run:  npm run lint:i18n
 *
 * vue-eslint-parser reads the SFCs and hands <script lang="ts"> blocks (and
 * plain .ts files) to @typescript-eslint/parser; without them ESLint cannot
 * parse a single .vue file.
 */

import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
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

    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },

    plugins: {
      local: {
        rules: {
          'no-hardcoded-ui-strings': noHardcodedUiStrings,
        },
      },
    },

    rules: {
      // Backlog: 16 hardcoded strings in Pinia stores when ESLint was installed
      // (2026-10-01). npm run lint:i18n caps the warnings at that count: lower the
      // cap as they are translated, never raise it; flip to 'error' at zero.
      'local/no-hardcoded-ui-strings': 'warn',
    },
  },
]
