import {
  CalendarEventModel,
  LeaveRequestModel,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { Apperror } from "../common/errorhandlers";

export interface AttendanceValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether employee is on approved leave.
 */
export const validateEmployeeLeave = async (
  companyId: Types.ObjectId,
  employeeId: Types.ObjectId,
  attendanceDate: Date,
): Promise<AttendanceValidationResult> => {
  const leave = await LeaveRequestModel.findOne({
    companyId,
    employeeId,
    status: "approved",
    startDate: { $lte: attendanceDate },
    endDate: { $gte: attendanceDate },
  }).lean();

  if (!leave) {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    reason: "You are on approved leave today",
  };
};

/**
 * Check whether attendance date falls under a holiday.
 */
export const validateHolidayEvent = async (
  companyId: Types.ObjectId,
  employeeId: Types.ObjectId,
  departmentId: Types.ObjectId,
  attendanceDate: Date,
): Promise<AttendanceValidationResult> => {
    console.log("========== HOLIDAY VALIDATION ==========");
  console.log("companyId:", companyId.toString());
  console.log("employeeId:", employeeId.toString());
  console.log("departmentId:", departmentId.toString());
  console.log("attendanceDate:", attendanceDate);
  const holiday = await CalendarEventModel.findOne({
    companyId,
    eventType: "holiday",
    isActive: true,
    "scope.status": "published",

    startDate: { $lte: attendanceDate },
    endDate: { $gte: attendanceDate },

    $or: [
      {
        "classification.applicableTo": "All",
      },
      {
        "classification.applicableTo": "Department",
        "classification.departmentId": departmentId,
      },
      {
        "classification.applicableTo": "Individual",
        "classification.employeeId": employeeId,
      },
    ],
  }).lean();
  console.log("Holiday Found:", holiday);
  if (!holiday) {
    return {
      allowed: true,
    };
  }
  console.log("Holiday Matched:", holiday.eventName);
  return {
    allowed: false,
    reason: `${holiday.eventName}. Attendance is not allowed.`,
  };
};

/**
 * Master attendance validation.
 *
 * Call this before:
 * - Check In
 * - Check Out
 */
export const validateAttendanceEligibility = async (
  companyId: Types.ObjectId,
  employeeId: Types.ObjectId,
  departmentId: Types.ObjectId,
  attendanceDate: Date,
): Promise<void> => {
  const [leaveResult, holidayResult] = await Promise.all([
    validateEmployeeLeave(
      companyId,
      employeeId,
      attendanceDate,
    ),
    validateHolidayEvent(
      companyId,
      employeeId,
      departmentId,
      attendanceDate,
    ),
  ]);

  if (!leaveResult.allowed) {
    throw new Apperror(
      leaveResult.reason ?? "Attendance not allowed",
      400,
    );
  }

  if (!holidayResult.allowed) {
    throw new Apperror(
      holidayResult.reason ?? "Attendance not allowed",
      400,
    );
  }
};