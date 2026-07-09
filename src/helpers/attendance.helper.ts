import { IShiftData } from "../typings";

export type AttendanceStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "INCOMPLETE";

export interface ShiftBoundaries {
  /** Absolute UTC Date for shift start on the attendance day */
  shiftStart: Date;
  /** Absolute UTC Date for shift end (may be next day for night shifts) */
  shiftEnd: Date;
  /** Latest allowed check-in = shiftStart + gracePeriodMinutes */
  graceDeadline: Date;
  /** Auto punch-out = shiftEnd + 30 min (configurable per caller) */
  autoPunchOutAt: Date;
}

export interface CheckInAnalysis {
  lateMinutes: number;
  isLate: boolean;
  /** Minutes the employee was early (negative late) — informational only */
  earlyMinutes: number;
}

export interface CheckOutAnalysis {
  workingMinutes: number;
  breakMinutes: number;
  effectiveMinutes: number; // workingMinutes - breakMinutes
  overtimeMinutes: number;
  earlyExitMinutes: number;
  payableDayFraction: number;
  status: AttendanceStatus;
  wasAutoPunchOut: boolean;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns a LOCAL midnight Date used as the canonical `attendanceDate` key.
 * Always call this once per request and pass it down — never recompute mid-flow.
 */
export const getAttendanceDate = (from: Date = new Date()): Date =>
  new Date(from.getFullYear(), from.getMonth(), from.getDate());

/**
 * Parses an "HH:mm" shift time string and returns an absolute Date on
 * the given `baseDate` (local midnight). Handles night shifts by advancing
 * to the next day when `endTime` <= `startTime` (e.g. 22:00 → 06:00).
 */
export const resolveShiftTime = (
  hmString: string,
  baseDate: Date,
  isEndOfNightShift = false,
): Date => {
  const [hours, minutes] = hmString.split(":").map(Number);
  const resolved = new Date(baseDate);
  resolved.setHours(hours, minutes, 0, 0);

  if (isEndOfNightShift) {
    resolved.setDate(resolved.getDate() + 1);
  }

  return resolved;
};

/**
 * Resolves both shift boundaries + derived gate-times from shift config
 * and the attendance date.
 *
 * AUTO PUNCH-OUT = shiftEnd + 30 min (hard-coded per product requirement).
 */
export const resolveShiftBoundaries = (
  shift: IShiftData,
  attendanceDate: Date,
  autoPunchOutBufferMinutes = 30,
): ShiftBoundaries => {
  const shiftStart = resolveShiftTime(shift.startTime, attendanceDate);
  const shiftEnd = resolveShiftTime(
    shift.endTime,
    attendanceDate,
    shift.isNightShift && shift.endTime <= shift.startTime,
  );

  const graceDeadline = addMinutes(shiftStart, shift.gracePeriodMinutes);
  const autoPunchOutAt = addMinutes(shiftEnd, autoPunchOutBufferMinutes);

  return { shiftStart, shiftEnd, graceDeadline, autoPunchOutAt };
};

// ─── Check-in analysis ────────────────────────────────────────────────────────

/**
 * Determines how late (or early) an employee punched in relative to the shift.
 *
 * Late minutes are counted from `shiftStart`, NOT from grace deadline —
 * grace only means the lateness isn't penalised, but we still record it.
 *
 *   checkIn at 09:05, shift 09:00, grace 15 min → lateMinutes=5, isLate=false
 *   checkIn at 09:20, shift 09:00, grace 15 min → lateMinutes=20, isLate=true
 *   checkIn at 08:50, shift 09:00                → earlyMinutes=10, lateMinutes=0
 */
export const analyseCheckIn = (
  checkInTime: Date,
  boundaries: ShiftBoundaries,
): CheckInAnalysis => {
  const diffMs = checkInTime.getTime() - boundaries.shiftStart.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes <= 0) {
    return {
      lateMinutes: 0,
      isLate: false,
      earlyMinutes: Math.abs(diffMinutes),
    };
  }

  return {
    lateMinutes: diffMinutes,
    isLate: checkInTime > boundaries.graceDeadline,
    earlyMinutes: 0,
  };
};

// ─── Check-out analysis ───────────────────────────────────────────────────────

/**
 * Full calculation at punch-out time.
 *
 * Formula:
 *   rawMinutes      = checkOut - checkIn  (wall clock)
 *   workingMinutes  = rawMinutes  (stored for audit)
 *   effectiveMinutes= rawMinutes - breakDurationMinutes  (what's actually payable)
 *   overtimeMinutes = max(0, checkOut - shiftEnd - overtimeAfterMinutes)
 *   earlyExitMinutes= max(0, shiftEnd - checkOut)   [0 if not early]
 *
 * Status thresholds come from the shift's own `workingHours` and
 * `halfDayThreshold` fields so they're configurable per shift.
 */
export const analyseCheckOut = (
  checkInTime: Date,
  checkOutTime: Date,
  shift: IShiftData,
  boundaries: ShiftBoundaries,
  wasAutoPunchOut: boolean,
): CheckOutAnalysis => {
  const rawMinutes = floorMinutes(checkOutTime, checkInTime);

  // Break is deducted only when the employee worked long enough to
  // be eligible — we use half-day threshold as the floor.
  const breakMinutes =
    rawMinutes >= shift.halfDayThreshold ? shift.breakDurationMinutes : 0;

  const effectiveMinutes = Math.max(0, rawMinutes - breakMinutes);

  // Overtime: only after `overtimeAfterMinutes` buffer past shift end
  const minutesPastShiftEnd = floorMinutes(checkOutTime, boundaries.shiftEnd);
  const overtimeMinutes =
    shift.overtimeEligible && minutesPastShiftEnd > shift.overtimeAfterMinutes
      ? minutesPastShiftEnd - shift.overtimeAfterMinutes
      : 0;

  // Early exit: minutes left on shift when employee leaves before shift end
  const earlyExitMinutes =
    checkOutTime < boundaries.shiftEnd
      ? floorMinutes(boundaries.shiftEnd, checkOutTime)
      : 0;

  const payableDayFraction = computePayableFraction(
    effectiveMinutes,
    shift.workingHours,
    shift.halfDayThreshold,
    shift.gracePeriodMinutes,
  );

  const status = computeStatus(
    effectiveMinutes,
    shift.workingHours,
    shift.halfDayThreshold,
    shift.gracePeriodMinutes,
  );

  return {
    workingMinutes: rawMinutes,
    breakMinutes,
    effectiveMinutes,
    overtimeMinutes,
    earlyExitMinutes,
    payableDayFraction,
    status,
    wasAutoPunchOut,
  };
};

// ─── Status & fraction ────────────────────────────────────────────────────────

/**
 * Thresholds are taken from the shift document, not hardcoded.
 *
 *   effectiveMinutes >= workingHours  → PRESENT   (1.0)
 *   effectiveMinutes >= halfDayThreshold → HALF_DAY (0.5)
 *   else                               → ABSENT    (0.0)
 */
export const computeStatus = (
  effectiveMinutes: number,
  workingHours: number,
  halfDayThreshold: number,
  gracePeriodMinutes: number,
): AttendanceStatus => {
  const fullDayThreshold = Math.max(
    halfDayThreshold,
    workingHours - gracePeriodMinutes,
  );

  if (effectiveMinutes >= fullDayThreshold) {
    return "PRESENT";
  }

  if (effectiveMinutes >= halfDayThreshold) {
    return "HALF_DAY";
  }

  return "ABSENT";
};

export const computePayableFraction = (
  effectiveMinutes: number,
  workingHours: number,
  halfDayThreshold: number,
  gracePeriodMinutes: number,
): number => {
  const fullDayThreshold = Math.max(
    halfDayThreshold,
    workingHours - gracePeriodMinutes,
  );

  if (effectiveMinutes >= fullDayThreshold) {
    return 1;
  }

  if (effectiveMinutes >= halfDayThreshold) {
    return 0.5;
  }

  return 0;
};

// ─── Auto punch-out guard ─────────────────────────────────────────────────────

/**
 * Returns true when the current time is past the auto punch-out gate.
 * The job scheduler calls this to decide whether to force-close the record.
 */
export const shouldAutoPunchOut = (
  checkInTime: Date,
  boundaries: ShiftBoundaries,
  now: Date = new Date(),
): boolean =>
  now >= boundaries.autoPunchOutAt && checkInTime < boundaries.autoPunchOutAt;

/**
 * The effective check-out time used when auto punch-out fires.
 * We use `shiftEnd` (not `autoPunchOutAt`) so the employee isn't
 * credited overtime just because they forgot to punch out.
 */
export const resolveAutoPunchOutTime = (boundaries: ShiftBoundaries): Date =>
  new Date(boundaries.shiftEnd);

// ─── Tiny utilities ───────────────────────────────────────────────────────────

/** Floor difference in whole minutes: (a - b), clamped to ≥0 */
export const floorMinutes = (a: Date, b: Date): number =>
  Math.max(0, Math.floor((a.getTime() - b.getTime()) / 60_000));

export const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);
