// helpers/attendanceRegularizationAttendance.helper.ts

import {
  IAttendanceRegularization,
  IAttendanceDaily, 
} from "@hrmssuite/persistence";
import { resolveShiftBoundaries, analyseCheckOut } from "./attendance.helper"; // your existing helper file
import { IShiftData } from "../typings";

export class AttendanceRegularizationAttendanceHelper {
  /**
   * Build the partial IAttendanceDaily update to apply when a
   * regularization request is approved.
   *
   * Production rules encoded here:
   * - Approved regularization overrides firstCheckIn / lastCheckOut.
   * - Derived fields (workingMinutes, effectiveMinutes, status, etc.)
   *   are recomputed using the same logic as normal punch-out.
   * - regularized flag is set to true.
   * - An audit note referencing the request ID is appended to notes.
   */
  static buildAttendanceUpdate(
    daily: IAttendanceDaily,
    request: IAttendanceRegularization,
    shift: IShiftData,
  ): Partial<IAttendanceDaily> {
    const update: Partial<IAttendanceDaily> = {
      regularized: true,
    };

    // Apply requested times if present
    if (request.requestedCheckIn) {
      update.firstCheckIn = request.requestedCheckIn;
    }
    if (request.requestedCheckOut) {
      update.lastCheckOut = request.requestedCheckOut;
    }

    // Only recompute derived fields if we have both check-in and check-out
    if (update.firstCheckIn && update.lastCheckOut) {
      const boundaries = resolveShiftBoundaries(shift, daily.attendanceDate);

      const analysis = analyseCheckOut(
        update.firstCheckIn,
        update.lastCheckOut,
        shift,
        boundaries,
        daily.wasAutoPunchOut, // keep original auto flag; you can also force false
      );

      update.workingMinutes = analysis.workingMinutes;
      update.breakMinutes = analysis.breakMinutes;
      update.effectiveMinutes = analysis.effectiveMinutes;
      update.overtimeMinutes = analysis.overtimeMinutes;
      update.earlyExitMinutes = analysis.earlyExitMinutes;
      update.payableDayFraction = analysis.payableDayFraction;
      update.status = analysis.status;
    }

    // Optional audit note
    // const note = `Regularized via request ${request._id}`;
    const note = `Attendance updated through regularization`;
    update.notes = daily.notes ? `${daily.notes} | ${note}` : note;

    return update;
  }
}
