/**
 * Sprint 2 T2.1 — i18n key parity tests
 *
 * Verifies that every key present in the EN locale also exists in FR, and
 * vice-versa, for all 14 namespaces. This catches missing translations early
 * and ensures the French-first strategy is fully maintained.
 */
import { describe, it, expect } from 'vitest'

// Static imports of every locale file — Vite/Vitest resolves these at build time.
import enCommon    from '@/locales/en/common.json'
import frCommon    from '@/locales/fr/common.json'
import enNav       from '@/locales/en/nav.json'
import frNav       from '@/locales/fr/nav.json'
import enAuth      from '@/locales/en/auth.json'
import frAuth      from '@/locales/fr/auth.json'
import enSchedule  from '@/locales/en/schedule.json'
import frSchedule  from '@/locales/fr/schedule.json'
import enRules     from '@/locales/en/rules.json'
import frRules     from '@/locales/fr/rules.json'
import enAi        from '@/locales/en/ai.json'
import frAi        from '@/locales/fr/ai.json'
import enLeave     from '@/locales/en/leave.json'
import frLeave     from '@/locales/fr/leave.json'
import enSwap      from '@/locales/en/swap.json'
import frSwap      from '@/locales/fr/swap.json'
import enConfig    from '@/locales/en/config.json'
import frConfig    from '@/locales/fr/config.json'
import enErrors    from '@/locales/en/errors.json'
import frErrors    from '@/locales/fr/errors.json'
import enAdmin     from '@/locales/en/admin.json'
import frAdmin     from '@/locales/fr/admin.json'
import enManager   from '@/locales/en/manager.json'
import frManager   from '@/locales/fr/manager.json'
import enEmployee  from '@/locales/en/employee.json'
import frEmployee  from '@/locales/fr/employee.json'
import enCoverage  from '@/locales/en/coverage.json'
import frCoverage  from '@/locales/fr/coverage.json'

/**
 * Recursively collects dot-notation key paths from a nested object.
 * e.g. { a: { b: 'x' } } → ['a.b']
 */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return collectKeys(v as Record<string, unknown>, path)
    }
    return [path]
  })
}

function checkParity(name: string, en: unknown, fr: unknown): void {
  const enKeys = collectKeys(en as Record<string, unknown>).sort()
  const frKeys = collectKeys(fr as Record<string, unknown>).sort()

  const missingInFr  = enKeys.filter((k) => !frKeys.includes(k))
  const missingInEn  = frKeys.filter((k) => !enKeys.includes(k))

  describe(`[${name}] locale parity`, () => {
    it('has no keys in EN that are missing in FR', () => {
      expect(missingInFr, `Keys present in EN but absent in FR: ${missingInFr.join(', ')}`).toHaveLength(0)
    })

    it('has no keys in FR that are missing in EN', () => {
      expect(missingInEn, `Keys present in FR but absent in EN: ${missingInEn.join(', ')}`).toHaveLength(0)
    })
  })
}

checkParity('common',   enCommon,   frCommon)
checkParity('nav',      enNav,      frNav)
checkParity('auth',     enAuth,     frAuth)
checkParity('schedule', enSchedule, frSchedule)
checkParity('rules',    enRules,    frRules)
checkParity('ai',       enAi,       frAi)
checkParity('leave',    enLeave,    frLeave)
checkParity('swap',     enSwap,     frSwap)
checkParity('config',   enConfig,   frConfig)
checkParity('errors',   enErrors,   frErrors)
checkParity('admin',    enAdmin,    frAdmin)
checkParity('manager',  enManager,  frManager)
checkParity('employee', enEmployee, frEmployee)
checkParity('coverage', enCoverage, frCoverage)
