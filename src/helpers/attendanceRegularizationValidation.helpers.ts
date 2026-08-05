import {
  IAttendanceRegularization,
  IAttendanceRegularizationPolicy,
  RegularizationType,
} from "@hrmssuite/persistence";

export class AttendanceRegularizationValidationHelper {
  static validatePolicyEnabled(policy: IAttendanceRegularizationPolicy): void {
    if (!policy.enabled) {
      throw new Error("Attendance regularization is disabled.");
    }
  }

  static validateBackdatedDays(
    policy: IAttendanceRegularizationPolicy,
    attendanceDate: Date,
  ): void {
    const maxDays = policy.maxBackdatedDays ?? 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = new Date(attendanceDate);
    attendance.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - attendance.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > maxDays) {
      throw new Error(`Regularization is allowed only within ${maxDays} days.`);
    }
  }

  static validateMonthlyLimit(
    policy: IAttendanceRegularizationPolicy,
    monthlyCount: number,
  ): void {
    const maxRequests = policy.maxRequestsPerMonth ?? 0;

    if (monthlyCount >= maxRequests) {
      throw new Error("Monthly regularization limit exceeded.");
    }
  }

  static validateHoliday(
    policy: IAttendanceRegularizationPolicy,
    isHoliday: boolean,
  ): void {
    if (isHoliday && !policy.allowHolidayRegularization) {
      throw new Error("Holiday regularization is not allowed.");
    }
  }

  static validateWeekOff(
    policy: IAttendanceRegularizationPolicy,
    isWeekOff: boolean,
  ): void {
    if (isWeekOff && !policy.allowWeekOffRegularization) {
      throw new Error("Week-off regularization is not allowed.");
    }
  }

  static validateDuplicateRequest(
    policy: IAttendanceRegularizationPolicy,
    exists: boolean,
  ): void {
    if (exists && !policy.allowMultipleRequestsPerDay) {
      throw new Error("Regularization request already exists.");
    }
  }

  static validatePayrollLock(
    policy: IAttendanceRegularizationPolicy,
    payrollProcessed: boolean,
  ): void {
    if (payrollProcessed && !policy.allowAfterPayrollProcessed) {
      throw new Error("Payroll already processed.");
    }
  }

  static validateReason(
    policy: IAttendanceRegularizationPolicy,
    reason: string,
  ): void {
    if (policy.reasonMandatory && !reason.trim()) {
      throw new Error("Reason is mandatory.");
    }
  }

  static validateAttachment(
    policy: IAttendanceRegularizationPolicy,
    attachments: IAttendanceRegularization["attachments"] | undefined,
  ): void {
    if (
      policy.attachmentRequired &&
      (!attachments || attachments.length === 0)
    ) {
      throw new Error("Attachment is mandatory.");
    }
  }

  static validateRequestedTime(
    type: RegularizationType,
    requestedCheckIn?: Date,
    requestedCheckOut?: Date,
  ): void {
    switch (type) {
      case RegularizationType.CHECK_IN:
        if (!requestedCheckIn) {
          throw new Error("Requested check-in required.");
        }
        break;

      case RegularizationType.CHECK_OUT:
        if (!requestedCheckOut) {
          throw new Error("Requested check-out required.");
        }
        break;

      case RegularizationType.BOTH:
        if (!requestedCheckIn || !requestedCheckOut) {
          throw new Error("Both check-in and check-out required.");
        }

        if (requestedCheckIn >= requestedCheckOut) {
          throw new Error("Check-out must be after check-in.");
        }

        break;

      case RegularizationType.MISSED_PUNCH:
        break;
    }
  }
}
