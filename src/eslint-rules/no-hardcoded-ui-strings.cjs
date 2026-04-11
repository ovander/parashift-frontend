/**
 * ESLint rule: no-hardcoded-ui-strings
 *
 * Prevents hardcoded user-visible strings from appearing in Vue SFC templates
 * and component `<script setup>` blocks. All UI text must go through `t()` so
 * the application remains fully translatable.
 *
 * What is flagged:
 *   - String literals inside JSX/Vue template attribute values that look like
 *     human-readable text (contains a space or starts with a capital letter).
 *   - String literals passed to showToast(), $t(), error.value = '...', etc.
 *     when they appear to be user-visible messages.
 *
 * What is NOT flagged:
 *   - Short technical constants (IDs, CSS classes, event names, route paths,
 *     empty strings, single words without spaces used as enum values).
 *   - Numbers, booleans, template literals used in logic.
 *   - Strings inside /* comments * / or // comments.
 *   - Strings in test files (*spec*, *test*).
 *
 * Configuration (eslint.config.js):
 *
 *   import noHardcodedUiStrings from './src/eslint-rules/no-hardcoded-ui-strings.cjs'
 *
 *   export default [
 *     {
 *       plugins: { local: { rules: { 'no-hardcoded-ui-strings': noHardcodedUiStrings } } },
 *       rules: { 'local/no-hardcoded-ui-strings': 'warn' },
 *       files: ['src/**\/*.vue', 'src/**\/*.ts'],
 *       ignores: ['**\/*.spec.*', '**\/*.test.*', 'src/eslint-rules/**'],
 *     },
 *   ]
 *
 * @type {import('eslint').Rule.RuleModule}
 */

'use strict'

// Heuristic: a string is "user-visible" if it contains a space or starts with
// an uppercase letter and is longer than 3 characters (excludes abbreviations).
function looksLikeUiString(value) {
  if (typeof value !== 'string') return false
  if (value.length === 0) return false

  // Allow technical strings: only lowercase alphanum + common delimiters
  if (/^[a-z0-9_\-.:/@#]+$/.test(value)) return false

  // Allow SCREAMING_SNAKE_CASE constants (event/status enums)
  if (/^[A-Z][A-Z0-9_]+$/.test(value)) return false

  // Flag if it contains a space (phrase) or starts with uppercase and is >3 chars
  const hasSpace = value.includes(' ')
  const startsUpper = /^[A-ZÀ-Ö]/.test(value)

  return hasSpace || (startsUpper && value.length > 3)
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded user-visible strings — use t() instead',
      category: 'Internationalization',
      recommended: false,
      url: 'https://github.com/ovander/parashift/blob/main/frontend/src/eslint-rules/no-hardcoded-ui-strings.cjs',
    },
    messages: {
      hardcodedString:
        'Hardcoded UI string "{{ value }}" — use t(\'<namespace>.<key>\') instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Callee names whose string arguments should always be flagged
          // (e.g. toast calls, error message setters).
          flaggedCallees: {
            type: 'array',
            items: { type: 'string' },
            default: ['showToast', 'console.error'],
          },
          // Attribute names in Vue templates where string values are always UI text.
          // These are checked via VLiteral nodes by vue-eslint-parser.
          flaggedAttributes: {
            type: 'array',
            items: { type: 'string' },
            default: ['label', 'placeholder', 'title', 'aria-label', 'tooltip'],
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options          = context.options[0] || {}
    const flaggedCallees   = new Set(options.flaggedCallees   || ['showToast'])
    const flaggedAttributes= new Set(options.flaggedAttributes|| ['label', 'placeholder', 'title', 'aria-label', 'tooltip'])

    // Track when we are inside a t() call — nested strings are keys, not UI text.
    let inTCall = 0

    function checkLiteral(node) {
      if (inTCall > 0) return
      if (!looksLikeUiString(node.value)) return

      context.report({
        node,
        messageId: 'hardcodedString',
        data: { value: String(node.value).slice(0, 60) },
      })
    }

    return {
      // ── JS/TS: string arguments to flagged callee functions ───────────────

      CallExpression(node) {
        // Detect t() calls — don't flag their arguments.
        const callee = node.callee
        const calleeName =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property.name
              : null

        if (calleeName === 't' || calleeName === '$t') {
          inTCall++
          return
        }

        // For flagged callees, check string arguments.
        const isFlagged =
          (callee.type === 'Identifier' && flaggedCallees.has(callee.name)) ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            flaggedCallees.has(callee.property.name))

        if (!isFlagged) return

        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && looksLikeUiString(arg.value)) {
            context.report({
              node: arg,
              messageId: 'hardcodedString',
              data: { value: String(arg.value).slice(0, 60) },
            })
          }
        }
      },

      'CallExpression:exit'(node) {
        const callee = node.callee
        const calleeName =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property.name
              : null

        if (calleeName === 't' || calleeName === '$t') {
          inTCall = Math.max(0, inTCall - 1)
        }
      },

      // ── Vue SFC template: text interpolations & flagged attribute values ──
      // These nodes are provided by vue-eslint-parser when processing .vue files.

      'VLiteral'(node) {
        // Only flag attribute values for the configured attribute names.
        const attrName = node.parent?.key?.name ?? node.parent?.key?.rawName
        if (!flaggedAttributes.has(attrName)) return
        if (!looksLikeUiString(node.value)) return

        context.report({
          node,
          messageId: 'hardcodedString',
          data: { value: String(node.value).slice(0, 60) },
        })
      },

      // Plain text nodes in Vue templates — e.g. <p>Hello world</p>
      'VText'(node) {
        const text = node.value.trim()
        if (!looksLikeUiString(text)) return

        context.report({
          node,
          messageId: 'hardcodedString',
          data: { value: text.slice(0, 60) },
        })
      },

      // Assignment expressions — catches: error.value = 'Some message'
      AssignmentExpression(node) {
        if (inTCall > 0) return
        if (node.right.type !== 'Literal') return
        if (!looksLikeUiString(node.right.value)) return

        // Only flag if the LHS looks like an error/message binding
        const lhsText = context.getSourceCode?.()?.getText(node.left) ?? ''
        if (/error|message|label|text|title|summary|detail/i.test(lhsText)) {
          context.report({
            node: node.right,
            messageId: 'hardcodedString',
            data: { value: String(node.right.value).slice(0, 60) },
          })
        }
      },
    }
  },
}
