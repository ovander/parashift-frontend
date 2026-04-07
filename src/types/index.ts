/**
 * @file Canonical domain types for ParaShift.
 *
 * These interfaces are the single source of truth for shapes flowing between
 * the API and the frontend. They mirror `parashift/openapi.yaml` exactly.
 *
 * ⚠️  Do NOT add computed properties, UI-only state, or optional wrappers
 *     here.  Transform API responses into view-model types inside your
 *     feature's composable if needed.
 *
 * Naming conventions
 * ─────────────────
 *  - All IDs are `string` (UUID).
 *  - Dates      → ISO 8601 date string   "YYYY-MM-DD"  (ISODate)
 *  - Times      → "HH:MM"  24 h, no seconds            (ISOTime)
 *  - Timestamps → ISO 8601 date-time "YYYY-MM-DDTHH:MM:SSZ" (ISODateTime)
 */

// ── Primitive aliases (documentation only; TS won't enforce these) ──────────

/** ISO 8601 date string, e.g. "2025-06-02" */
export type ISODate = string

/** 24-hour time string, e.g. "09:00" */
export type ISOTime = string

/** ISO 8601 date-time string, e.g. "2025-06-02T09:00:00Z" */
export type ISODateTime = string

// ── Enumerations ─────────────────────────────────────────────────────────────

export type ShiftStatus = 'DRAFT' | 'PUBLISHED'
export type ShiftSource = 'MANUAL' | 'TEMPLATE' | 'OVERRIDE'

/**
 * BLOCKING – assignment was rejected; it was never persisted.
 * WARNING  – assignment was persisted but managers are alerted.
 * INFO     – informational only; no action required.
 */
export type ViolationSeverity = 'BLOCKING' | 'WARNING' | 'INFO'

export type CoverageStatus = 'OK' | 'UNDERSTAFFED' | 'OVERSTAFFED'
// LeaveType values match the backend constants in model/leave_request.go.
// Previously the frontend used 'ANNUAL'/'UNPAID' which never matched the backend.
export type LeaveType      = 'vacation' | 'sick' | 'other'
export type LeaveStatus    = 'pending' | 'approved' | 'rejected'
export type SwapStatus     = 'pending' | 'accepted' | 'rejected' | 'cancelled'

// ── Domain entities ───────────────────────────────────────────────────────────

/** Position controls RBAC access level in the system. */
export type EmployeePosition = 'manager' | 'employee'

export interface Employee {
  id:                      string
  store_id:                string
  name:                    string
  position:                EmployeePosition  // manager|employee — RBAC access
  job_role:                string            // pharmacist|animator|logistics_agent|... — shift eligibility
  email:                   string
  contract_hours_per_week: number
  start_date:              ISODate           // first day on the job — used for A/B week-type calculation
  created_at:              ISODateTime
  updated_at:              ISODateTime
}

// Contract is a separate admin-managed entity not returned inline.
export interface Contract {
  id:           string
  employee_id:  string
  contract_type: 'FULL_TIME' | 'PART_TIME' | 'ZERO_HOURS'
  weekly_hours: number
  start_date:   ISODate
  end_date?:    ISODate
}

export interface ShiftInstance {
  id:             string
  store_id:       string
  date:           ISODate
  start_time:     ISOTime
  end_time:       ISOTime
  /** The role required for this shift (e.g. "pharmacist"). */
  role:           string
  required_count: number
  status:         ShiftStatus
  source:         ShiftSource
  /** Populated when source = 'TEMPLATE'. */
  template_id?:   string
  /** True when an assignment for this shift was cancelled due to approved leave. */
  needs_cover:    boolean
  created_at:     ISODateTime
  updated_at:     ISODateTime
}

/**
 * A rule violation produced during assignment evaluation.
 *
 * `shift_id` and `employee_id` are always present so callers never need to
 * reconstruct a composite key from surrounding context.
 */
export interface RuleViolation {
  rule_id:     string
  rule_type:   string
  severity:    ViolationSeverity
  message:     string
  /** The shift this violation relates to. */
  shift_id:    string
  /** The employee this violation relates to. */
  employee_id: string
}

export type AssignmentStatus = 'confirmed' | 'pending' | 'cancelled'

export interface Assignment {
  id:               string
  store_id:         string
  shift_id:         string
  employee_id:      string
  /** confirmed | pending | cancelled */
  status:           AssignmentStatus
  /** Denormalized from the parent ShiftInstance — no extra fetch needed. */
  shift_date:       ISODate
  shift_start_time: ISOTime
  shift_end_time:   ISOTime
  /**
   * Non-empty only when the assignment was created despite WARNING/INFO
   * violations. BLOCKING violations prevent creation entirely and are
   * returned as a 422 ValidationError instead.
   */
  violations: RuleViolation[]
  created_at:       ISODateTime
  updated_at?:      ISODateTime
  /** Set when the assigned employee has confirmed they've seen this shift. */
  acknowledged_at?: ISODateTime
}

export interface Rule {
  id:            string
  store_id:      string
  rule_type:     string
  is_enabled:    boolean
  severity:      ViolationSeverity
  description:   string
  /** Rule-type-specific JSON configuration blob. */
  configuration: Record<string, unknown>
  created_at:    ISODateTime
  updated_at:    ISODateTime
}

/** A single coverage slot as returned in the flat `items` array from `GET /coverage`. */
export interface CoverageSlot {
  date:           ISODate
  start_time:     ISOTime
  end_time:       ISOTime
  required_count: number
  assigned_count: number
  status:         CoverageStatus
  missing_role:   boolean
  required_role:  string   // populated when missing_role=true; empty string means any role
}

/** The shape returned by `GET /stores/{storeId}/coverage`. */
export interface CoverageReport {
  items:       CoverageSlot[]
  total_slots: number
  gap_count:   number
}

/** Grouped view used by components that need per-day slot lists. */
export interface CoverageDay {
  date:  ISODate
  slots: CoverageSlot[]
}

/**
 * AI / heuristic scheduling suggestion.
 *
 * `employee_name` is denormalized for display. If you need the full Employee
 * object, look it up by `employee_id` from the schedule store.
 */
export interface ScheduleSuggestion {
  shift_id:      string
  employee_id:   string
  employee_name: string
  reason:        string
}

export interface LeaveRequest {
  id:           string
  store_id:     string
  employee_id:  string
  start_date:   ISODate
  end_date:     ISODate
  type:         LeaveType    // matches backend json:"type"
  status:       LeaveStatus  // lowercase: 'pending' | 'approved' | 'rejected'
  reason?:      string
  reviewed_by?: string
  reviewed_at?: ISODateTime
  created_at:   ISODateTime
  updated_at:   ISODateTime
}

export interface SwapRequest {
  id:                  string
  tenant_id:           string
  requester_id:        string
  target_employee_id?: string
  shift_instance_id:   string
  target_shift_id?:    string
  status:              SwapStatus
  note?:               string
  reviewed_by?:        string
  created_at:          ISODateTime
  updated_at:          ISODateTime
}

// Template is an admin/manager-only entity used to seed shift instances.
export interface ShiftTemplate {
  id:            string
  store_id:      string
  scheme:        'A' | 'B'
  day_of_week:   number   // 1 = Monday … 7 = Sunday
  start_time:    ISOTime
  end_time:      ISOTime
  required_role: string
}

// ── Request bodies ────────────────────────────────────────────────────────────

export interface CreateAssignmentRequest {
  shift_id:    string
  employee_id: string
}

export interface CreateShiftRequest {
  date:            ISODate
  start_time:      ISOTime
  end_time:        ISOTime
  role:            string
  required_count?: number
  template_id?:    string
}

export interface UpdateShiftRequest {
  start_time?:     ISOTime
  end_time?:       ISOTime
  role?:           string
  required_count?: number
  status?:         ShiftStatus
}

export interface UpsertRuleRequest {
  rule_type:     string
  is_enabled:    boolean
  severity:      ViolationSeverity
  configuration: Record<string, unknown>
}

export interface CreateLeaveRequest {
  start_date: ISODate
  end_date:   ISODate
  type:       LeaveType  // matches backend json:"type"
  reason?:    string
}

export interface ReviewLeaveRequest {
  status: 'approved' | 'rejected'  // matches backend dto json:"status"
  reason?: string
}

/** One shift that will be cancelled if the leave is approved. */
export interface LeaveImpactShift {
  date:           ISODate
  start_time:     ISOTime
  end_time:       ISOTime
  role:           string
  /** Number of OTHER non-cancelled assignments on this shift after this employee is removed. */
  other_assigned: number
  /** True when other_assigned === 0 — shift will have no cover at all. */
  will_need_cover: boolean
}

/** Returned by GET /leave-requests/:id/impact */
export interface LeaveImpact {
  affected_shifts:      LeaveImpactShift[]
  total_cancellations:  number
  total_hours_lost:     number
  uncovered_shifts:     number
}

export interface ReviewSwapRequest {
  status: 'APPROVED' | 'REJECTED'
}

// ── Error responses ───────────────────────────────────────────────────────────

export interface ApiError {
  code:     string
  message:  string
  details?: string[]
}

/**
 * Returned as HTTP 422 when an assignment is blocked by one or more
 * BLOCKING rule violations.
 */
export interface ValidationError extends ApiError {
  violations: RuleViolation[]
}

// ── View-model helpers (NOT API shapes) ──────────────────────────────────────

/**
 * Structured key used to index violations in the schedule planner.
 *
 * Prefer this over a raw string like "shiftId:employeeId" so that TypeScript
 * can guide refactoring and prevent silent key-format drift.
 */
export interface RuleViolationKey {
  shiftId:    string
  employeeId: string
}

/** Converts a structured key to a stable string for use as a Map key. */
export function ruleViolationKeyToString(key: RuleViolationKey): string {
  return `${key.shiftId}:${key.employeeId}`
}

/** Parses a stable string back to a structured key. Throws on malformed input. */
export function parseRuleViolationKey(raw: string): RuleViolationKey {
  const sep = raw.indexOf(':')
  if (sep === -1) throw new Error(`Invalid RuleViolationKey: "${raw}"`)
  return { shiftId: raw.slice(0, sep), employeeId: raw.slice(sep + 1) }
}

/** @deprecated Use ViolationSeverity */
export type RuleSeverity = ViolationSeverity

/** @deprecated Use Rule.rule_type (string literal) */
export type RuleType = string

// ── Schedule Plan (CR-001 #3) ─────────────────────────────────────────────────

export type PlanState = 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'ARCHIVED'

export interface PlanOverride {
  timestamp: ISODateTime
  user_id:   string
  reason:    string
  shift_ids: string[]
}

export interface PlanSnapshot {
  taken_at:        ISODateTime
  shift_count:     number
  assignment_count: number
  coverage_rate:   number
}

export interface SchedulePlan {
  id:          string
  store_id:    string
  week_start:  ISODate
  state:       PlanState
  snapshots:   PlanSnapshot[]
  override_log: PlanOverride[]
  created_at:  ISODateTime
  updated_at:  ISODateTime
}

// ── Qualifications (CR-001 #5) ────────────────────────────────────────────────

export interface Qualification {
  id:               string
  store_id:         string
  name:             string
  issuing_body:     string
  required_for_role: string
  created_at:       ISODateTime
  updated_at:       ISODateTime
}

export interface EmployeeQualification {
  id:               string
  employee_id:      string
  qualification_id: string
  issue_date:       ISODate
  expiry_date?:     ISODate
  verified:         boolean
  document_url?:    string
  created_at:       ISODateTime
  updated_at:       ISODateTime
}

// ── Planning Model Metrics (CR-001 #6) ────────────────────────────────────────

export interface PlanningModelMetric {
  id:               string
  store_id:         string
  model_scheme:     string
  week_start:       ISODate
  coverage_rate:    number
  overtime_hours:   number
  adjustment_count: number
  violation_count:  number
  created_at:       ISODateTime
  updated_at:       ISODateTime
}

// ── Manager mode ──────────────────────────────────────────────────────────────

export type ManagerMode = 'operate' | 'optimize' | 'monitor'

export type PlannerLayer = 'core' | 'coverage' | 'violations' | 'ai'

// ── Request bodies ────────────────────────────────────────────────────────────

export interface PublishPlanRequest {
  plan_id: string
}

export interface RecordOverrideRequest {
  reason:    string
  shift_ids: string[]
}

export interface CreateQualificationRequest {
  name:               string
  issuing_body:       string
  required_for_role:  string
}

export interface AddEmployeeQualificationRequest {
  qualification_id: string
  issue_date:       ISODate
  expiry_date?:     ISODate
  document_url?:    string
}

// ── Store exceptions ─────────────────────────────────────────────────────────

export type StoreExceptionType = 'EXTRA_OPEN' | 'FORCED_CLOSED'

export interface StoreException {
  id:       string
  store_id: string
  date:     ISODate
  type:     StoreExceptionType
  note?:    string
}

export interface CreateStoreExceptionRequest {
  date: ISODate
  type: StoreExceptionType
  note: string
}
