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
        <div class="grid w-full mb-1" style="grid-template-columns: repeat(6, 1fr) 0.7fr">
          <div
            v-for="(label, i) in weekDayLabels"
            :key="label"
            class="text-[10px] font-semibold uppercase tracking-wider pb-1 px-1 border-b-2 border-gray-900"
            :class="i === 6 ? 'text-gray-400' : 'text-gray-500'"
          >
            {{ label }}
          </div>
        </div>

        <!-- Calendar grid (minimalist: hairlines, big day numbers, plain shift times) -->
        <div class="grid w-full" style="grid-template-columns: repeat(6, 1fr) 0.7fr">
          <!-- Leading empty cells -->
          <div
            v-for="i in leadingBlanks"
            :key="`b${i}`"
            class="min-h-[84px] border-l border-b border-gray-300 bg-gray-50"
          />

          <!-- Day cells -->
          <div
            v-for="day in calendarDays"
            :key="day.iso"
            class="min-h-[84px] p-1.5 border-l border-b border-gray-300 flex flex-col"
            :class="day.isOff ? 'bg-gray-50' : 'bg-white'"
          >
            <!-- Day number -->
            <span
              class="text-xl font-extrabold leading-none mb-1"
              :class="day.isOff ? 'text-gray-400' : 'text-gray-900'"
              :style="day.isToday ? 'text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px' : ''"
            >{{ day.dayNum }}</span>

            <!-- Holiday name -->
            <div v-if="day.isHoliday" class="text-[8px] italic font-semibold text-gray-600 mb-0.5 truncate">
              {{ day.holidayName }}
            </div>

            <!-- Morning half -->
            <div class="flex-1 min-h-0 pt-px">
              <div
                v-for="s in day.shifts.filter((x) => x.start_time < NOON)"
                :key="s.id"
                class="text-[11px] font-bold text-gray-900 leading-tight"
              >
                {{ s.start_time }}–{{ s.end_time }}
                <span class="text-[8px] font-normal text-gray-500 ml-0.5">{{ duration(s.start_time, s.end_time) }}</span>
              </div>
              <div v-if="!day.shifts.length && day.onLeave" class="text-[9px] italic text-gray-500">
                {{ t('schedule.leave') }}
              </div>
            </div>

            <!-- Afternoon half -->
            <div class="flex-1 min-h-0 border-t border-dashed border-gray-300 mt-px pt-px">
              <div
                v-for="s in day.shifts.filter((x) => x.start_time >= NOON)"
                :key="s.id"
                class="text-[11px] font-bold text-gray-900 leading-tight"
              >
                {{ s.start_time }}–{{ s.end_time }}
                <span class="text-[8px] font-normal text-gray-500 ml-0.5">{{ duration(s.start_time, s.end_time) }}</span>
              </div>
            </div>
          </div>

          <!-- Trailing empty cells -->
          <div
            v-for="i in trailingBlanks"
            :key="`t${i}`"
            class="min-h-[84px] border-l border-b border-gray-300 bg-gray-50"
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
import { icsDateTime, icsEscape, icsFold, duration } from '../utils/icsUtils'

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

// Morning / afternoon split point. HH:MM strings compare correctly as text.
const NOON = '12:00'


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

  // ── Render one day cell (minimalist: big number + AM / PM split) ────────────
  const chip = (s: { start_time: string; end_time: string }) =>
    `<div class="sh">${s.start_time}–${s.end_time}<span class="sub">${duration(s.start_time, s.end_time)}</span></div>`

  function renderCell(day: Cell): string {
    if (!day) return `<div class="c c-off"></div>`

    const cls = ['c', day.isOff ? 'c-off' : '', day.isToday ? 'c-today' : '']
      .filter(Boolean).join(' ')

    const hol = day.isHoliday
      ? `<div class="hol">${day.holidayName}</div>` : ''

    // Split shifts into morning (starts before noon) and afternoon zones.
    const am = day.shifts.filter(s => s.start_time < NOON).map(chip).join('')
    const pm = day.shifts.filter(s => s.start_time >= NOON).map(chip).join('')

    const lv = !day.shifts.length && day.onLeave
      ? `<div class="lv">${t('schedule.leave')}</div>` : ''

    return `<div class="${cls}">
      <span class="num">${day.dayNum}</span>${hol}
      <div class="half am">${am}${lv}</div>
      <div class="half pm">${pm}</div>
    </div>`
  }

  // ── Build week rows HTML ───────────────────────────────────────────────────
  const rowsHtml = weekRows.map(row =>
    `<div class="wkrow">${row.map(renderCell).join('')}</div>`
  ).join('')

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

    /* ── Calendar (fills remaining page height) ── */
    .cal { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }

    /* ── Column headers (Mon–Sat 1fr, Sunday narrower) ── */
    .ch { display: grid; grid-template-columns: repeat(6, 1fr) 0.7fr; margin-bottom: 3px; }
    .ch > div {
      font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      color: #6b7280; padding-bottom: 2px; border-bottom: 1.5px solid #111827;
    }
    .ch > div:last-child { color: #9ca3af; }

    /* ── Week rows share the available height equally ── */
    .wkrow {
      display: grid; grid-template-columns: repeat(6, 1fr) 0.7fr;
      flex: 1 1 0; border-bottom: 1px solid #d1d5db;
    }

    /* ── Day cells ── */
    .c {
      display: flex; flex-direction: column;
      padding: 3px 5px; min-height: 0;
      border-left: 1px solid #e5e7eb; background: #fff;
    }
    .c:first-child { border-left: none; }
    .c-off   { background: #fafafa; }
    .c-today { box-shadow: inset 3px 0 0 #111827; }

    /* ── Day number ── */
    .num { font-size: 13pt; font-weight: 800; line-height: 1; margin-bottom: 2px; }
    .c-off .num { color: #9ca3af; font-weight: 700; }
    .c-today .num { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; }

    /* ── Morning / afternoon halves ── */
    .half { flex: 1 1 0; min-height: 0; padding-top: 1px; }
    .half.pm { border-top: 1px dashed #d1d5db; margin-top: 1px; }

    /* ── Holiday + shift text ── */
    .hol { font-size: 6pt; font-weight: 600; color: #374151; font-style: italic; margin-bottom: 1px; }
    .sh  { font-size: 8.5pt; font-weight: 700; line-height: 1.15; }
    .sub { font-size: 6pt; font-weight: 400; color: #6b7280; margin-left: 4px; }
    .lv  { font-size: 7pt; color: #6b7280; font-style: italic; }

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

  <div class="cal">
    <div class="ch">
      ${weekDayLabels.value.map(d => `<div>${d}</div>`).join('\n      ')}
    </div>
    ${rowsHtml}
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
