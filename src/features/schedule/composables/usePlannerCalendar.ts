import { computed, ref, type Ref } from 'vue'
import type { CalendarOptions, EventInput, EventDropArg, EventMountArg, DatesSetArg } from '@fullcalendar/core'
import type { ResourceLabelMountArg } from '@fullcalendar/resource'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import interactionPlugin, { type EventReceiveArg } from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import type { Employee, ShiftInstance, Assignment, StoreException, LeaveRequest } from '@/types'
import type { PublicHoliday } from './usePublicHolidays'
import { useRuleViolations } from './useRuleViolations'
import { toISOMonday } from '@/utils/dateUtils'
import { useI18n } from 'vue-i18n'

interface UsePlannerCalendarOptions {
  storeId:     Ref<string>
  weekStart:   Ref<string>
  employees:   Ref<Employee[]>
  shifts:      Ref<ShiftInstance[]>
  assignments: Ref<Assignment[]>
  holidays?:   Ref<PublicHoliday[]>
  exceptions?: Ref<StoreException[]>
  leaves?:     Ref<LeaveRequest[]>
  onAssign:    (shiftId: string, employeeId: string, revert: () => void) => void
  onUnassign?: (assignmentId: string) => void
  onWeekChange?: (isoMonday: string) => void
}

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

export function usePlannerCalendar(opts: UsePlannerCalendarOptions) {
  const { locale } = useI18n()
  const { getViolations, worstSeverity } = useRuleViolations()

  // Persist the active view (day / week) across remounts caused by navigation.
  const activeView = ref<string>('resourceTimeGridDay')

  // Track the visible date range so leave badges stay accurate when navigating.
  const currentViewStart = ref(opts.weekStart.value)
  const currentViewEnd   = ref(opts.weekStart.value)

  // Name of the public holiday on the current visible start date (null if none).
  // In day view this is the single displayed day; in week view it's Monday.
  const currentHolidayName = computed((): string | null => {
    if (!opts.holidays?.value) return null
    return opts.holidays.value.find((h) => h.date === currentViewStart.value)?.name ?? null
  })

  // Set of employee IDs that have approved leave overlapping the current visible range.
  // Works for both day view (single day) and week view (7-day span).
  const onLeaveSet = computed((): Set<string> => {
    const viewStart = currentViewStart.value
    const viewEnd   = currentViewEnd.value   // exclusive (FC end is day-after-last)
    const result    = new Set<string>()
    for (const leave of (opts.leaves?.value ?? [])) {
      if (leave.status !== 'approved') continue
      // Overlap: leave starts before view ends AND leave ends on or after view starts
      if (leave.start_date < viewEnd && leave.end_date >= viewStart) {
        result.add(leave.employee_id)
      }
    }
    return result
  })

  // Set of employee IDs with at least one assignment on the current view date.
  const employeesWithShifts = computed((): Set<string> => {
    const result = new Set<string>()
    for (const a of opts.assignments.value) {
      if (a.shift_date === currentViewStart.value) result.add(a.employee_id)
    }
    return result
  })

  const resources = computed(() =>
    opts.employees.value.map((e) => ({
      id:    e.id,
      title: e.name,
      extendedProps: {
        role:     e.job_role,
        onLeave:  onLeaveSet.value.has(e.id),
        noShifts: !employeesWithShifts.value.has(e.id),
      },
    })),
  )

  /** Returns the YYYY-MM-DD string for the day after `dateStr`. */
  function nextDayStr(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  // Background events for public holidays — one per holiday day, spanning all resources.
  // We use explicit datetime strings (T00:00:00 / next-day T00:00:00) instead of date-only
  // strings so FC treats them as timed events and renders full-column backgrounds in
  // resourceTimeGrid rather than placing them in the all-day header row.
  // NOTE: T24:00:00 is NOT valid JS ISO-8601 (produces Invalid Date) — always use nextDayStr.
  const holidayEvents = computed((): EventInput[] => {
    if (!opts.holidays?.value?.length) return []
    return opts.holidays.value.map((h) => ({
      id:              `holiday-${h.date}`,
      start:           `${h.date}T00:00:00`,
      end:             `${nextDayStr(h.date)}T00:00:00`,
      display:         'background',
      backgroundColor: 'transparent',
      extendedProps:   { holidayName: h.name },
      classNames:      ['fc-holiday'],
    } satisfies EventInput))
  })

  // Background events for store exceptions (EXTRA_OPEN / FORCED_CLOSED).
  // Use datetime strings so they appear in the time-grid columns, not the all-day row.
  const exceptionEvents = computed((): EventInput[] => {
    if (!opts.exceptions?.value?.length) return []
    return opts.exceptions.value.map((ex) => {
      const isClosed = ex.type === 'FORCED_CLOSED'
      return {
        id:              `exception-${ex.id}`,
        start:           `${ex.date}T00:00:00`,
        end:             `${nextDayStr(ex.date)}T00:00:00`,
        display:         'background',
        backgroundColor: isClosed ? '#fee2e2' : '#ffedd5', // red-100 / orange-100
        extendedProps:   { exceptionType: ex.type, exceptionNote: ex.note ?? '' },
        classNames:      [isClosed ? 'fc-exception-closed' : 'fc-exception-open'],
      } satisfies EventInput
    })
  })

  // Background events for approved leave — one per employee per day, scoped to their resource column.
  // Using resourceId makes the green band appear only on the relevant employee's column rather than
  // spanning the full day like holidays do.
  const leaveEvents = computed((): EventInput[] => {
    if (!opts.leaves?.value?.length) return []
    const result: EventInput[] = []
    for (const leave of opts.leaves.value) {
      if (leave.status !== 'approved') continue
      // Expand the date range into individual days
      const start = new Date(`${leave.start_date}T00:00:00`)
      const end   = new Date(`${leave.end_date}T00:00:00`)
      const d = new Date(start)
      while (d <= end) {
        const y   = d.getFullYear()
        const mo  = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const iso = `${y}-${mo}-${day}`
        result.push({
          id:              `leave-${leave.id}-${iso}`,
          resourceId:      leave.employee_id,
          start:           `${iso}T00:00:00`,
          end:             `${nextDayStr(iso)}T00:00:00`,
          display:         'background',
          backgroundColor: '#d1fae5', // emerald-100
          extendedProps:   { leaveType: leave.type, leaveId: leave.id },
          classNames:      ['fc-leave'],
        } satisfies EventInput)
        d.setDate(d.getDate() + 1)
      }
    }
    return result
  })

  const events = computed((): EventInput[] => {
    const assigned: EventInput[] = opts.assignments.value
      // Skip optimistic entries that haven't been seeded with date fields yet.
      .filter((a) => !!a.shift_date && !!a.shift_start_time)
      .map((a) => {
      const shift    = opts.shifts.value.find((s) => s.id === a.shift_id)
      const severity = worstSeverity({ shiftId: a.shift_id, employeeId: a.employee_id })
      return {
        id:         a.id,
        resourceId: a.employee_id,
        start:      `${a.shift_date}T${a.shift_start_time}`,
        end:        `${a.shift_date}T${a.shift_end_time}`,
        title:      shift?.role ?? 'Shift',
        backgroundColor: severityColor(severity),
        borderColor:     severityColor(severity),
        extendedProps: {
          assignmentId: a.id,
          shiftId:      a.shift_id,
          employeeId:   a.employee_id,
          violations:   getViolations({ shiftId: a.shift_id, employeeId: a.employee_id }),
          needsCover:   shift?.needs_cover ?? false,
        },
      }
    })
    return [...holidayEvents.value, ...exceptionEvents.value, ...leaveEvents.value, ...assigned]
  })

  function severityColor(severity: 'BLOCKING' | 'WARNING' | 'INFO' | null): string {
    switch (severity) {
      case 'BLOCKING': return '#ef4444'
      case 'WARNING':  return '#f59e0b'
      case 'INFO':     return '#3b82f6'
      default:         return '#0ea5e9'
    }
  }

  /**
   * Inject visual decoration into background events:
   *  - holidays  → diagonal grey stripes + amber label with the holiday name
   *  - exceptions → coloured background + red/orange label
   *
   * We set styles directly on info.el (React/Preact only reconciles the
   * `backgroundColor` property it owns, so `backgroundImage` and `opacity`
   * survive re-renders). We also override opacity: FC defaults to 0.3 which
   * makes even dark stripe colours nearly invisible.
   */
  function handleEventDidMount(info: EventMountArg) {
    if (info.event.display !== 'background') return

    const ep    = info.event.extendedProps ?? {}
    let labelText  = ''
    let labelColor = ''

    // Ensure the element is positioned so absolute children work.
    info.el.style.position = 'relative'
    info.el.style.overflow = 'hidden'

    if (ep.holidayName) {
      labelText  = `🗓 ${ep.holidayName as string}`
      labelColor = '#92400e' // amber-800

      // Diagonal stripe pattern. FC defaults the element to opacity:0.3 via a
      // CSS variable — we lift it to 1 via inline style (highest specificity)
      // so the stripes are fully visible. React only manages backgroundColor on
      // this element, so backgroundImage & opacity persist across re-renders.
      info.el.style.opacity         = '1'
      info.el.style.backgroundColor = 'transparent'
      info.el.style.backgroundImage =
        'repeating-linear-gradient(-45deg, #cbd5e1 0px, #cbd5e1 5px, transparent 5px, transparent 14px)'


    } else if (ep.exceptionType === 'FORCED_CLOSED') {
      labelText  = ep.exceptionNote ? `🔒 ${ep.exceptionNote as string}` : '🔒 Fermeture exceptionnelle'
      labelColor = '#991b1b' // red-800
      info.el.style.opacity         = '0.6'
      info.el.style.backgroundColor = '#fee2e2' // red-100

    } else if (ep.exceptionType === 'EXTRA_OPEN') {
      labelText  = ep.exceptionNote ? `📅 ${ep.exceptionNote as string}` : '📅 Ouverture exceptionnelle'
      labelColor = '#9a3412' // orange-800
      info.el.style.opacity         = '0.6'
      info.el.style.backgroundColor = '#ffedd5' // orange-100

    } else if (ep.leaveType) {
      const leaveLabel = String(ep.leaveType).charAt(0).toUpperCase() + String(ep.leaveType).slice(1)
      labelText  = `🌴 ${leaveLabel}`
      labelColor = '#065f46' // emerald-800
      info.el.style.opacity         = '0.75'
      info.el.style.backgroundColor = '#d1fae5' // emerald-100
    }

    if (!labelText) return

    const label       = document.createElement('span')
    label.textContent = labelText
    Object.assign(label.style, {
      position:      'absolute',
      top:           '4px',
      left:          '4px',
      fontSize:      '11px',
      fontWeight:    '600',
      color:         labelColor,
      pointerEvents: 'none',
      whiteSpace:    'nowrap',
      zIndex:        '1',
    })
    info.el.appendChild(label)

  }

  /**
   * Inject a 🌴 badge into the resource (employee) column header when the
   * employee has approved leave overlapping the current visible date range.
   * This makes vacation immediately visible to the manager at a glance,
   * even if no shifts are assigned — the column is never hidden.
   */
  function handleResourceLabelDidMount(info: ResourceLabelMountArg) {
    // Guard: don't double-inject if FullCalendar calls this twice for the same cell.
    if (info.el.querySelector('.ps-badge')) return

    const cushion = info.el.querySelector('.fc-col-header-cell-cushion') ?? info.el

    function makeBadge(emoji: string, title: string, className: string) {
      const b = document.createElement('span')
      b.className   = `ps-badge ${className}`
      b.textContent = ` ${emoji}`
      b.title       = title
      Object.assign(b.style, { fontSize: '13px', verticalAlign: 'middle', opacity: '0.9' })
      cushion.appendChild(b)
    }

    // 1. Approved leave takes highest priority.
    if (info.resource.extendedProps.onLeave) {
      makeBadge('🌴', 'Congé approuvé', 'ps-leave-badge')
      return
    }

    // 2. Public holiday — shown on every employee column for the day.
    if (currentHolidayName.value) {
      makeBadge('🗓', currentHolidayName.value, 'ps-holiday-badge')
      return
    }

    // 3. No shifts assigned to this employee on the current day (day view only).
    // Shown as a neutral "·" so the manager knows the empty column is not a bug.
    if (activeView.value === 'resourceTimeGridDay' && info.resource.extendedProps.noShifts) {
      makeBadge('·', 'Pas de service planifié', 'ps-off-badge')
    }
  }

  function handleDrop(info: EventDropArg) {
    const employeeId = info.event.getResources()[0]?.id
    const shiftId    = info.event.extendedProps.shiftId
    if (!employeeId || !shiftId) { info.revert(); return }
    opts.onAssign(shiftId, employeeId, info.revert)
  }

  function handleReceive(info: EventReceiveArg) {
    const employeeId = info.event.getResources()[0]?.id
    const shiftId    = info.event.extendedProps.shiftId
    if (!employeeId || !shiftId) { info.revert(); return }
    opts.onAssign(shiftId, employeeId, info.revert)
  }

  // Title formatter: receives FC's VerboseFormattingArg (dates wrapped in ExpandedZonedMarker).
  // Passed directly in calendarOptions so FC applies it at construction time and on every
  // resetOptions() call. Using setOption() inside datesSet caused a feedback loop
  // (setOption → re-render → datesSet → setOption → …) that left the title blank.
  function titleFormat(args: { date: { marker: Date }; start: { marker: Date }; end?: { marker: Date } | null }): string {
    const anchor    = (args.start ?? args.date).marker
    const weekNum   = isoWeekNumber(anchor)
    const dateLocale = locale.value === 'fr' ? 'fr-FR' : 'en-GB'
    // FC passes end = start+1day even for a single-day view; only treat as a range
    // when the span is strictly longer than one day (week view spans 7 days).
    const isRange = args.end != null && (args.end.marker.getTime() - anchor.getTime()) > 86_400_000

    if (isRange) {
      // end is exclusive — subtract 1 ms to get the last visible day.
      const last     = new Date(args.end!.marker.getTime() - 1)
      const startStr = anchor.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
      const endStr   = last.toLocaleDateString(dateLocale,   { month: 'short', day: 'numeric', year: 'numeric' })
      return `W${weekNum} · ${startStr} – ${endStr}`
    }
    const dayStr = anchor.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    return `W${weekNum} · ${dayStr}`
  }

  // Sync FullCalendar's internal navigation (prev/next/today/view toggle) back to the app.
  // datesSet fires whenever the visible range changes — we derive the ISO Monday from the
  // view start and call onWeekChange so the store context + data fetch stay in sync.
  function handleDatesSet(info: DatesSetArg) {
    // Persist the current view so it survives remounts.
    activeView.value = info.view.type

    // Keep the visible range in sync so leave badges are accurate.
    currentViewStart.value = info.start.toISOString().slice(0, 10)
    currentViewEnd.value   = info.end.toISOString().slice(0, 10) // exclusive

    if (opts.onWeekChange) {
      const monday = toISOMonday(info.start)
      if (monday !== opts.weekStart.value) {
        opts.onWeekChange(monday)
      }
    }
  }

  const calendarOptions = computed((): CalendarOptions => ({
    schedulerLicenseKey: import.meta.env.VITE_FULLCALENDAR_LICENSE_KEY ?? 'CC-Attribution-NonCommercial-NoDerivatives',
    plugins:          [resourceTimeGridPlugin, interactionPlugin],
    locale:           locale.value === 'fr' ? frLocale : undefined,
    initialView:      activeView.value,
    initialDate:      opts.weekStart.value,
    firstDay:         1,
    resources:        resources.value,
    events:           events.value,
    editable:         true,
    droppable:        true,
    titleFormat,
    eventDrop:              handleDrop,
    eventReceive:           handleReceive,
    eventDidMount:          handleEventDidMount,
    resourceLabelDidMount:  handleResourceLabelDidMount,
    datesSet:               handleDatesSet,
    // Always show all employees — a column must never vanish just because
    // no shifts are assigned (e.g. employee on vacation).
    filterResourcesWithEvents: false,
    slotMinTime:      '07:00:00',
    slotMaxTime:      '22:00:00',
    slotDuration:     '00:30:00',   // 30-min slots — denser but still readable
    slotLabelInterval:'01:00:00',   // only show hour labels, not every half-hour
    slotLabelFormat:  { hour: '2-digit', minute: '2-digit', hour12: false },
    headerToolbar:    {
      left:   'prev,next today',
      center: 'title',
      right:  'resourceTimeGridDay,resourceTimeGridWeek',
    },
    // Fill the parent container vertically — enables internal scrolling
    // so the planner never pushes the page itself.
    height:           '100%',
    expandRows:       true,
    // Keep the resource (employee names) column narrow so shift columns get more space.
    resourceAreaWidth: '80px',
    // Compact event rendering
    eventMinHeight:   24,
    lazyFetching:     true,
    nowIndicator:     true,
  }))

  return { calendarOptions, resources, events, currentHolidayName }
}
