<template>
  <!-- Trigger button -->
  <Button
    icon="pi pi-file-pdf"
    :label="t('schedule.downloadPdf')"
    outlined
    severity="secondary"
    fluid
    @click="open = true"
  />

  <!-- Modal dialog — wide enough to preview A4 landscape proportions -->
  <Dialog
    v-model:visible="open"
    :header="t('schedule.monthlySchedule')"
    modal
    :style="{ width: '960px', maxWidth: '98vw' }"
    :pt="{ content: { style: 'padding: 0' } }"
  >
    <!-- Controls bar -->
    <div class="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
      <label class="text-sm font-medium text-gray-600 whitespace-nowrap">{{ t('schedule.selectMonth') }}</label>
      <select
        v-model="selectedMonth"
        class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <div class="ml-auto flex items-center gap-2">
        <Button
          icon="pi pi-calendar"
          :label="t('schedule.exportCalendar')"
          size="small"
          severity="secondary"
          outlined
          :loading="loading"
          @click="exportIcs"
        />
        <Button
          icon="pi pi-print"
          :label="t('schedule.print')"
          size="small"
          :loading="loading"
          @click="printSchedule"
        />
      </div>
    </div>

    <!-- Calendar preview area -->
    <div class="p-5">
      <div v-if="loading" class="grid grid-cols-7 gap-1">
        <Skeleton v-for="i in 35" :key="i" height="80px" />
      </div>

      <div v-else id="month-schedule-print-area" class="w-full">

        <!-- Print-only header (invisible in dialog) -->
        <div class="hidden print:flex items-center justify-between border-b-2 border-gray-800 pb-2 mb-4">
          <div>
            <div class="text-lg font-bold text-gray-900">{{ auth.user?.name }}</div>
            <div class="text-sm text-gray-500 capitalize">{{ auth.user?.job_role ?? auth.user?.position }}</div>
          </div>
          <div class="text-right">
            <div class="text-base font-semibold text-gray-800 capitalize">{{ monthTitle }}</div>
            <div class="text-xs text-gray-400">{{ t('schedule.generatedOn') }} {{ todayLabel }}</div>
          </div>
        </div>

        <!-- Screen-only sub-header -->
        <div class="print:hidden flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-800 capitalize">{{ monthTitle }}</h3>
          <span class="text-xs text-gray-400">{{ totalHoursLabel }} · {{ totalShiftsLabel }}</span>
        </div>

        <!-- Day-of-week header row -->
        <div class="grid grid-cols-7 w-full mb-px">
          <div
            v-for="label in weekDayLabels"
            :key="label"
            class="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 py-1 bg-gray-50 border border-gray-200"
          >
            {{ label }}
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7 w-full border-l border-t border-gray-200">
          <!-- Leading empty cells -->
          <div
            v-for="i in leadingBlanks"
            :key="`b${i}`"
            class="min-h-[80px] border-r border-b border-gray-200 bg-gray-50"
          />

          <!-- Day cells -->
          <div
            v-for="day in calendarDays"
            :key="day.iso"
            class="min-h-[80px] p-1.5 border-r border-b border-gray-200 flex flex-col"
            :class="{
              'bg-gray-200': day.isHoliday,
              'bg-gray-100 ring-1 ring-inset ring-gray-800': day.isToday,
              'bg-gray-50': day.isOff && !day.isHoliday && !day.isToday,
              'bg-white': !day.isOff && !day.isHoliday && !day.isToday,
            }"
          >
            <!-- Day number -->
            <span
              class="text-[11px] font-bold block mb-0.5"
              :class="{
                'text-gray-900': day.isToday || !day.isOff,
                'text-gray-500': day.isOff && !day.isToday,
              }"
            >{{ day.dayNum }}</span>

            <!-- Holiday badge -->
            <div v-if="day.isHoliday" class="mb-1">
              <span class="text-[8px] font-semibold text-gray-900 bg-gray-300 rounded px-1 py-0.5 leading-tight block truncate">
                {{ day.holidayName }}
              </span>
            </div>

            <!-- Timeline (07:00 → 21:00): shift sits at its start time, height = duration -->
            <div class="relative flex-1 min-h-[44px]" :style="timelineBg">
              <div
                v-for="s in day.shifts"
                :key="s.id"
                class="absolute inset-x-0 flex items-center justify-between overflow-hidden text-[9px] font-semibold leading-none rounded px-1 bg-white border border-gray-900 text-gray-900"
                :style="{ top: shiftBand(s.start_time, s.end_time).top + '%', height: `max(11px, ${shiftBand(s.start_time, s.end_time).height}%)` }"
              >
                <span>{{ s.start_time }}–{{ s.end_time }}</span>
              </div>

              <!-- Leave -->
              <div
                v-if="!day.shifts.length && day.onLeave"
                class="text-[9px] text-gray-900 bg-gray-100 border border-gray-300 rounded px-1 py-0.5"
              >
                {{ t('schedule.leave') }}
              </div>
            </div>
          </div>

          <!-- Trailing empty cells -->
          <div
            v-for="i in trailingBlanks"
            :key="`t${i}`"
            class="min-h-[80px] border-r border-b border-gray-200 bg-gray-50"
          />
        </div>

        <!-- Summary footer -->
        <div class="mt-3 flex items-center gap-6 text-xs text-gray-500">
          <span class="font-medium">{{ totalHoursLabel }}</span>
          <span>{{ totalShiftsLabel }}</span>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import { useApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import { useStoreContext } from '@/stores/storeContext'
import type { ShiftInstance, Assignment } from '@/types'
import { icsDateTime, icsEscape, icsFold, duration, isoWeek } from '../utils/icsUtils'

const { t, locale } = useI18n()
const auth = useAuthStore()
const ctx  = useStoreContext()
const api  = useApi()

const open    = ref(false)
const loading = ref(false)

// The French government API (calendrier.api.gouv.fr) returns holiday names
// already in French, so no translation is needed.  This pass-through is kept
// as a hook in case old stale DB rows ever surface with non-French names.
function toFrench(name: string): string {
  return name
}

// ── Month selector ───────────────────────────────────────────────────────────

const monthOptions = computed(() => {
  const today = new Date()
  const opts = []
  for (let delta = -5; delta <= 6; delta++) {
    const d     = new Date(today.getFullYear(), today.getMonth() + delta, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(locale.value === 'fr' ? 'fr-BE' : 'en-GB', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts
})

const selectedMonth = ref(
  (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
)

// ── Derived month metadata ───────────────────────────────────────────────────

const parsedMonth = computed(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number)
  return { year: y, month: m }
})

const dateLocale = computed(() => locale.value === 'fr' ? 'fr-BE' : 'en-GB')

const monthTitle = computed(() => {
  const { year, month } = parsedMonth.value
  return new Date(year, month - 1, 1).toLocaleDateString(dateLocale.value, { month: 'long', year: 'numeric' })
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString(dateLocale.value, { day: 'numeric', month: 'long', year: 'numeric' })
)

const leadingBlanks = computed(() => {
  const { year, month } = parsedMonth.value
  const dow = new Date(year, month - 1, 1).getDay() // 0=Sun
  return (dow + 6) % 7  // Mon-first: Mon=0 … Sun=6
})

const daysInMonth = computed(() => {
  const { year, month } = parsedMonth.value
  return new Date(year, month, 0).getDate()
})

const trailingBlanks = computed(() => {
  const total = leadingBlanks.value + daysInMonth.value
  const rem   = total % 7
  return rem === 0 ? 0 : 7 - rem
})

// Mon 6 Jan 2025 is a known Monday; derive the 7 day labels from it
const weekDayLabels = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(2025, 0, 6 + i).toLocaleDateString(dateLocale.value, { weekday: 'long' })
  )
)

// ── Data fetching ────────────────────────────────────────────────────────────

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const overlappingWeekMondays = computed(() => {
  const { year, month } = parsedMonth.value
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month, 0)

  const startMonday = new Date(first)
  startMonday.setDate(first.getDate() - (first.getDay() + 6) % 7)

  const mondays: string[] = []
  const cur = new Date(startMonday)
  while (cur <= last) {
    mondays.push(localIso(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return mondays
})

const shifts      = ref<ShiftInstance[]>([])
const assignments = ref<Assignment[]>([])
const holidayMap  = ref<Map<string, string>>(new Map())

async function loadMonth() {
  if (!open.value) return
  loading.value = true
  try {
    const storeId = ctx.storeId

    // Fetch all overlapping weeks in parallel
    const weekResults = await Promise.all(
      overlappingWeekMondays.value.map(async (monday) => {
        const [sRes, aRes] = await Promise.all([
          api.get<ShiftInstance[]>(`/api/v1/stores/${storeId}/shifts?week_of=${monday}`),
          api.get<Assignment[]>(`/api/v1/stores/${storeId}/assignments?week_of=${monday}`),
        ])
        return { shifts: sRes.data ?? [], assignments: aRes.data ?? [] }
      })
    )

    shifts.value      = weekResults.flatMap((r) => r.shifts)
    assignments.value = weekResults.flatMap((r) => r.assignments)

    // Fetch public holidays (with French name fallback for stale DB cache)
    const { year, month } = parsedMonth.value
    const years = Array.from(new Set([year, ...(month === 12 ? [year + 1] : []), ...(month === 1 ? [year - 1] : [])]))

    const holidayArrays = await Promise.all(
      years.map((y) =>
        api.get<{ date: string; name: string }[]>('/api/v1/public-holidays', { params: { year: y } })
          .then((r) => r.data ?? [])
          .catch(() => [])
      )
    )

    const m = new Map<string, string>()
    for (const arr of holidayArrays)
      for (const h of arr)
        m.set(h.date, toFrench(h.name))   // always apply French translation
    holidayMap.value = m
  } finally {
    loading.value = false
  }
}

watch([open, selectedMonth], () => { if (open.value) loadMonth() })

// ── Calendar days ────────────────────────────────────────────────────────────

const todayIso = localIso(new Date())

// ── Day timeline mapping ──────────────────────────────────────────────────────
// Each day cell is a vertical time axis from DAY_START to DAY_END. A shift is
// placed at its start time with a height proportional to its duration, so the
// reader can see morning / afternoon / evening at a glance (blank = free time).
const DAY_START_MIN = 7 * 60   // 07:00 at the top of the cell
const DAY_END_MIN   = 21 * 60  // 21:00 at the bottom
const DAY_SPAN_MIN  = DAY_END_MIN - DAY_START_MIN

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Vertical band (% from top + % height, clamped to the visible window) for a shift. */
function shiftBand(start: string, end: string): { top: number; height: number } {
  const s = Math.max(0, Math.min(100, ((toMin(start) - DAY_START_MIN) / DAY_SPAN_MIN) * 100))
  const e = Math.max(0, Math.min(100, ((toMin(end)   - DAY_START_MIN) / DAY_SPAN_MIN) * 100))
  return { top: s, height: Math.max(0, e - s) }
}

// Faint hourly gridlines (one band every 2h across the 14h window) drawn behind shifts.
const timelineBg = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, #eef0f2 0, #eef0f2 1px, transparent 1px, transparent calc(100% / 7))',
}


const calendarDays = computed(() => {
  const { year, month } = parsedMonth.value
  const userId = auth.user?.id

  return Array.from({ length: daysInMonth.value }, (_, i) => {
    const d   = new Date(year, month - 1, i + 1)
    const iso = localIso(d)
    const dow = d.getDay()

    const myAssns  = assignments.value.filter((a) => a.employee_id === userId && a.shift_date === iso)
    const myShifts = myAssns
      .map((a) => shifts.value.find((s) => s.id === a.shift_id))
      .filter(Boolean) as ShiftInstance[]

    return {
      iso,
      dayNum:      i + 1,
      isToday:     iso === todayIso,
      // Saturday is a regular working day; only Sunday is off.
      isOff:       dow === 0,
      isHoliday:   holidayMap.value.has(iso),
      holidayName: holidayMap.value.get(iso) ?? null,
      shifts:      myShifts,
      onLeave:     false,
    }
  })
})

// ── Summary ──────────────────────────────────────────────────────────────────

const totalMinutes = computed(() =>
  calendarDays.value.reduce((acc, day) => {
    for (const s of day.shifts) {
      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      acc += (eh * 60 + em) - (sh * 60 + sm)
    }
    return acc
  }, 0)
)

const totalHoursLabel = computed(() => {
  const h = Math.floor(totalMinutes.value / 60)
  const m = totalMinutes.value % 60
  return `${h}h${m > 0 ? `${m}` : ''} ${t('schedule.thisMonth')}`
})

const totalShiftsLabel = computed(() => {
  const n = calendarDays.value.reduce((acc, d) => acc + d.shifts.length, 0)
  return `${n} ${t('schedule.shifts', n)}`
})

// ── ICS calendar export ───────────────────────────────────────────────────────

function exportIcs() {
  const name  = auth.user?.name ?? t('schedule.icsEmployee')
  const role  = auth.user?.job_role ?? auth.user?.position ?? ''
  const title = monthTitle.value

  // Collect events — one VEVENT per assigned shift
  const events: string[] = []

  for (const day of calendarDays.value) {
    for (const shift of day.shifts) {
      const dtStart = icsDateTime(day.iso, shift.start_time)
      const dtEnd   = icsDateTime(day.iso, shift.end_time)
      const dur     = duration(shift.start_time, shift.end_time)

      // Stable UID: shift ID + date ensures no duplicates on re-import
      const uid = `parashift-${shift.id}-${day.iso}@parashift`

      const summary = icsEscape(`${shift.start_time}–${shift.end_time} (${dur})`)
      const desc    = icsEscape(
        `${t('schedule.icsShift')} : ${shift.start_time}–${shift.end_time} (${dur})\\n` +
        `${t('schedule.icsEmployee')} : ${name}\\n` +
        (role ? `${t('schedule.icsRole')} : ${role}\\n` : '') +
        (day.isHoliday && day.holidayName ? `${t('schedule.icsHoliday')} : ${day.holidayName}` : '')
      )

      events.push([
        'BEGIN:VEVENT',
        icsFold(`UID:${uid}`),
        icsFold(`DTSTAMP:${icsDateTime(todayIso, '00:00')}Z`),
        icsFold(`DTSTART;TZID=Europe/Paris:${dtStart}`),
        icsFold(`DTEND;TZID=Europe/Paris:${dtEnd}`),
        icsFold(`SUMMARY:${summary}`),
        icsFold(`DESCRIPTION:${desc}`),
        // 30-minute reminder alarm
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        icsFold(`DESCRIPTION:${t('schedule.icsReminder')} : ${summary}`),
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'))
    }
  }

  if (!events.length) {
    alert(t('schedule.noShiftsToExport'))
    return
  }

  // VTIMEZONE block for Europe/Paris (covers CET and CEST transitions)
  const vtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ].join('\r\n')

  const calName = icsEscape(`${t('schedule.scheduleTitle')} ${title} — ${name}`)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    icsFold(`PRODID:-//ParaShift//${t('schedule.scheduleTitle')}//EN`),
    icsFold(`X-WR-CALNAME:${calName}`),
    `X-WR-CALDESC:${t('schedule.icsCalDesc')}`,
    'X-WR-TIMEZONE:Europe/Paris',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vtimezone,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  // Trigger download
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${t('schedule.scheduleTitle')}-${selectedMonth.value}-${name.replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Print (A4 landscape) ─────────────────────────────────────────────────────

function printSchedule() {
  const name    = auth.user?.name ?? ''
  const role    = auth.user?.job_role ?? auth.user?.position ?? ''
  const title   = monthTitle.value
  const genDate = todayLabel.value

  // ── Build week rows ────────────────────────────────────────────────────────
  // Flatten: leading blanks + day cells + trailing blanks, then slice into weeks.
  type Cell = typeof calendarDays.value[0] | null
  const flat: Cell[] = [
    ...Array(leadingBlanks.value).fill(null),
    ...calendarDays.value,
    ...Array(trailingBlanks.value).fill(null),
  ]
  const weekRows: Cell[][] = []
  for (let i = 0; i < flat.length; i += 7) weekRows.push(flat.slice(i, i + 7))

  // ── Weekly hours ───────────────────────────────────────────────────────────
  function weekMinutes(row: Cell[]): number {
    return row.reduce((acc, day) => {
      if (!day) return acc
      for (const s of day.shifts) {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        acc += (eh * 60 + em) - (sh * 60 + sm)
      }
      return acc
    }, 0)
  }

  // ── Render one day cell ────────────────────────────────────────────────────
  function renderCell(day: Cell): string {
    if (!day) return `<div class="cell cell-empty"></div>`

    const cls = [
      'cell',
      day.isHoliday                            ? 'cell-holiday' : '',
      day.isToday                              ? 'cell-today'   : '',
      day.isOff && !day.isHoliday && !day.isToday ? 'cell-off'  : '',
    ].filter(Boolean).join(' ')

    const numCls = day.isToday ? 'dn dn-today' : day.isOff ? 'dn dn-off' : 'dn'

    const badge  = day.isHoliday
      ? `<div class="hbadge">${day.holidayName}</div>` : ''

    // Each shift placed at its start time, height proportional to duration.
    const chips  = day.shifts.map(s => {
      const { top, height } = shiftBand(s.start_time, s.end_time)
      return `<div class="shift" style="top:${top.toFixed(1)}%;height:max(9px,${height.toFixed(1)}%)">
        <span class="st">${s.start_time}–${s.end_time}</span>
        <span class="dur">${duration(s.start_time, s.end_time)}</span>
      </div>`
    }).join('')

    const leave = !day.shifts.length && day.onLeave
      ? `<div class="leave">${t('schedule.leave')}</div>` : ''

    return `<div class="${cls}">
      <span class="${numCls}">${day.dayNum}</span>
      ${badge}
      <div class="timeline">${chips}${leave}</div>
    </div>`
  }

  // ── Build week rows HTML ───────────────────────────────────────────────────
  const rowsHtml = weekRows.map(row => {
    // Week number from first non-null cell
    const firstDay = row.find(c => c !== null)
    let weekNum = ''
    if (firstDay) {
      const d = new Date(parsedMonth.value.year, parsedMonth.value.month - 1, firstDay.dayNum)
      weekNum = `${t('schedule.weekPrefix')}${isoWeek(d)}`
    }

    const wkMins  = weekMinutes(row)
    const wkLabel = wkMins ? `<span class="wk-h">${duration('00:00', `${String(Math.floor(wkMins/60)).padStart(2,'0')}:${String(wkMins%60).padStart(2,'0')}`)}</span>` : ''

    return `<div class="week-row">
      <div class="wk-num">${weekNum}${wkLabel}</div>
      ${row.map(renderCell).join('')}
    </div>`
  }).join('')

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totMins   = totalMinutes.value
  const totH      = Math.floor(totMins / 60), totM = totMins % 60
  const totLabel  = totM ? `${totH}h${String(totM).padStart(2,'0')}` : `${totH}h`
  const nShifts   = calendarDays.value.reduce((a, d) => a + d.shifts.length, 0)

  // ── HTML ───────────────────────────────────────────────────────────────────
  const lang = locale.value === 'fr' ? 'fr' : 'en'
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${t('schedule.scheduleTitle')} ${title} — ${name}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; }
    html { width: 277mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 7.5pt; margin: 0; padding: 0;
      color: #111827;
      display: flex; flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 7px; padding-bottom: 6px;
      border-bottom: 2.5px solid #111827;
    }
    .header-left { display: flex; align-items: baseline; gap: 8px; }
    .name  { font-size: 13pt; font-weight: 800; color: #111827; }
    .role  { font-size: 8pt; color: #4b5563; font-weight: 400; }
    .dot   { color: #9ca3af; }
    .month { font-size: 11pt; font-weight: 700; color: #111827; text-transform: capitalize; }
    .meta  { font-size: 7pt; color: #6b7280; }

    /* ── Grid columns ── */
    /* 36px week-num + 6× working day Mon–Sat (1fr) + Sunday (0.65fr) */
    .col-headers, .week-row {
      display: grid;
      grid-template-columns: 36px 1fr 1fr 1fr 1fr 1fr 1fr 0.65fr;
      width: 100%;
    }
    .col-headers { margin-bottom: 1px; }

    /* ── Column headers ── */
    .ch-wk { /* empty corner */ }
    .ch-day {
      text-align: center; font-size: 7pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: #fff; background: #111827;
      padding: 3px 2px; border-left: 1px solid #374151;
    }
    .ch-day:first-of-type { border-left: none; }
    .ch-day.we { background: #6b7280; }

    /* ── Calendar (fills remaining page height) ── */
    .calendar { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }

    /* ── Week row (rows share the available height equally) ── */
    .week-row { flex: 1 1 0; border-top: 1px solid #e5e7eb; }
    .week-row:last-child { border-bottom: 1px solid #e5e7eb; }

    /* ── Week number column ── */
    .wk-num {
      display: flex; flex-direction: column; align-items: center;
      justify-content: flex-start; padding-top: 4px;
      font-size: 6.5pt; font-weight: 700; color: #6b7280;
      border-right: 2px solid #d1d5db;
      background: #f3f4f6;
      gap: 2px;
    }
    .wk-h { font-size: 6pt; color: #6b7280; font-weight: 600; }

    /* ── Day cells ── */
    .cell {
      display: flex; flex-direction: column;
      min-height: 0; padding: 3px 4px;
      border-left: 1px solid #e5e7eb;
      background: #fff;
    }
    .cell-empty   { background: #f9fafb; }
    .cell-off     { background: #f3f4f6; }
    .cell-holiday { background: #e5e7eb; }
    .cell-today   { background: #f3f4f6; box-shadow: inset 3px 0 0 #111827; }

    /* ── Day number ── */
    .dn {
      display: block; font-size: 8.5pt; font-weight: 700;
      color: #111827; margin-bottom: 2px; line-height: 1;
    }
    .dn-today { color: #111827; }
    .dn-off   { color: #6b7280; }

    /* ── Day timeline (07:00 top → 21:00 bottom) ── */
    .timeline {
      position: relative; flex: 1 1 auto; min-height: 0; margin-top: 1px;
      background-image: repeating-linear-gradient(
        to bottom, #eef0f2 0, #eef0f2 0.3pt, transparent 0.3pt, transparent calc(100% / 7)
      );
    }

    /* ── Holiday badge ── */
    .hbadge {
      font-size: 6pt; font-weight: 600; color: #111827;
      background: #d1d5db; border-radius: 2px;
      padding: 1px 3px; margin-bottom: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 100%;
    }

    /* ── Shift chips (absolutely placed on the day timeline) ── */
    .shift {
      position: absolute; left: 0; right: 0;
      display: flex; justify-content: space-between; align-items: center;
      border-radius: 3px; padding: 0 4px;
      font-size: 7pt; font-weight: 600; line-height: 1.1;
      background: #fff; color: #111827;
      border: 1px solid #111827; border-left: 3px solid #111827;
      overflow: hidden;
    }
    .dur { font-size: 6pt; font-weight: 400; color: #4b5563; }

    /* ── Leave ── */
    .leave {
      font-size: 6.5pt; color: #111827;
      background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px;
      padding: 1px 4px; margin-top: 2px;
    }

    /* ── Notes / annotation area ── */
    .notes {
      flex: 0 0 auto;
      margin-top: 6px;
      height: 24mm;
      border: 1px solid #9ca3af; border-radius: 3px;
      padding: 3px 6px;
    }
    .notes-label {
      font-size: 6.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: #6b7280;
    }
    .notes-lines {
      margin-top: 4px;
      background-image: repeating-linear-gradient(
        to bottom, transparent 0, transparent 7mm, #e5e7eb 7mm, #e5e7eb calc(7mm + 0.4pt)
      );
      height: 17mm;
    }

    /* ── Footer ── */
    .footer {
      flex: 0 0 auto;
      margin-top: 6px; padding-top: 5px;
      border-top: 1px solid #d1d5db;
      display: flex; gap: 20px; align-items: center;
    }
    .footer-stat { font-size: 7.5pt; color: #374151; }
    .footer-stat strong { color: #111827; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <span class="name">${name}</span>
      <span class="dot">·</span>
      <span class="role">${role}</span>
      <span class="dot">·</span>
      <span class="month">${title}</span>
    </div>
    <span class="meta">${t('schedule.generatedOn')} ${genDate}</span>
  </div>

  <div class="col-headers">
    <div class="ch-wk"></div>
    ${weekDayLabels.value.slice(0, 6).map(d => `<div class="ch-day">${d}</div>`).join('\n    ')}
    ${weekDayLabels.value.slice(6).map(d => `<div class="ch-day we">${d}</div>`).join('\n    ')}
  </div>

  <div class="calendar">
    ${rowsHtml}
  </div>

  <div class="notes">
    <span class="notes-label">${t('schedule.notesLabel')}</span>
    <div class="notes-lines"></div>
  </div>

  <div class="footer">
    <div class="footer-stat">${t('schedule.totalLabel')} <strong>${totLabel}</strong></div>
    <div class="footer-stat"><strong>${nShifts}</strong> ${t('schedule.shifts', nShifts)}</div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=850')
  if (!win) { alert(t('schedule.allowPopups')); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 450)
}
</script>
