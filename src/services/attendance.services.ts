import { Types } from "mongoose";
import { IAttendanceDaily, IAttendanceEvents } from "@hrmssuite/persistence";

import { AttendanceEventDaos } from "../daos";
import { IShift } from "../typings";
import {
  CheckInInput,
  checkInSchema,
  CheckOutInput,
  checkOutSchema,
} from "../common/validators";
import {
  analyseCheckIn,
  analyseCheckOut,
  getAttendanceDate,
  resolveAutoPunchOutTime,
  resolveShiftBoundaries,
  shouldAutoPunchOut,
  validateAttendanceEligibility,
  validateShiftTiming,
  validateWeeklyOff,
} from "../helpers";
import { EmployeeClient } from "../client/employee.client";
import { AttendanceError } from "../common/errorhandlers";

export class AttendanceServices {
  private attendanceDao: AttendanceEventDaos;
  private employeeClient: EmployeeClient;

  constructor(employeeClient: EmployeeClient) {
    this.attendanceDao = new AttendanceEventDaos();
    this.employeeClient = employeeClient;
  }

  public async checkIn(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    rawInput: unknown,
    authToken: string,
  ) {
    const input = checkInSchema.parse(rawInput) as CheckInInput;
    const now = input.eventTime ?? new Date();
    const attendanceDate = getAttendanceDate(now);

    //  1. Validate employee exists and belongs to company
    const employee = await this.employeeClient.getEmployee(
      employeeId.toString(),
      companyId.toString(),

      authToken,
    );

    if (!employee) {
      throw new AttendanceError(
        `Employee ${employeeId.toString()} not found in company ${companyId.toString()}`,
        "EMPLOYEE_NOT_FOUND",
      );
    }

    //  2. Validate employee is Active
    if (employee.data.job.employeeStatus !== "Active") {
      throw new AttendanceError(
        `Employee ${employee.data.basic.employeeId} is not active (${employee.data.job.employeeStatus})`,
        "EMPLOYEE_INACTIVE",
      );
    }
    const department = employee.data.job.department;

    console.log("department:", department);

    const departmentId = (employee.data.job.department as any)._id;

    console.log("departmentId:", departmentId);

    await validateAttendanceEligibility(
      companyId,
      employeeId,
      new Types.ObjectId(departmentId),
      attendanceDate,
    );
    console.log("Attendance eligibility passed");
    console.log("Request shiftId:", input.shiftId);
    console.log(
      "Employee shiftId:",
      JSON.stringify(employee.data.job.shiftId, null, 2),
    );
    console.log(
      "Employee shiftId toString():",
      employee.data.job.shiftId?.toString?.(),
    );

    //  3. Validate shiftId matches employee's assigned shift
    const passedShiftId = input.shiftId.toString();
    const employeeShiftId =
      typeof employee.data.job.shiftId === "string"
        ? employee.data.job.shiftId
        : (employee.data.job.shiftId as any)._id;

    if (passedShiftId !== employeeShiftId) {
      throw new AttendanceError(
        `Shift ${passedShiftId} does not match your assigned shift ${employeeShiftId}`,
        "SHIFT_MISMATCH",
      );
    }

    //  4. Validate attendance mode
    if (employee.data.job.attendanceMode !== "Manual") {
      throw new AttendanceError(
        `You are not eligible for manual attendance (${employee.data.job.attendanceMode} mode)`,
        "INVALID_ATTENDANCE_MODE",
      );
    }

    // 5. Load shift from EmployeeClient
    const shiftData = await this.employeeClient.getShift(
      passedShiftId,
      companyId.toString(),
      authToken,
    );

    if (!shiftData) {
      throw new AttendanceError(
        `Shift ${passedShiftId} not found`,
        "SHIFT_NOT_FOUND",
      );
    }

    if (!shiftData.isActive) {
      throw new AttendanceError(
        `Shift "${shiftData.name}" is inactive`,
        "SHIFT_INACTIVE",
      );
    }

    const shift: IShift = {
      _id: new Types.ObjectId(passedShiftId),
      companyId: companyId,
      data: shiftData,
    };

    const weeklyOffResult = validateWeeklyOff(shift.data, attendanceDate);

    if (!weeklyOffResult.allowed) {
      throw new AttendanceError(
        weeklyOffResult.reason ?? "Weekly off",
        "WEEKLY_OFF",
      );
    }

    const shiftResult = validateShiftTiming(shift.data, attendanceDate, now);

    if (!shiftResult.allowed) {
      throw new AttendanceError(
        shiftResult.reason ?? "Shift ended",
        "SHIFT_ENDED",
      );
    }

    // 6. Resolve gate-times for this attendance day
    const boundaries = resolveShiftBoundaries(shift.data, attendanceDate);

    // 7. Analyse lateness
    const checkInAnalysis = analyseCheckIn(now, boundaries);

    // 8. Build event payload
    const eventData: IAttendanceEvents = {
      companyId,
      employeeId,
      attendanceDate,
      eventType: "CHECK_IN",
      source: input.source,
      eventTime: now,
      createdAt: now,
      updatedAt: now,
    } as IAttendanceEvents;

    // 9. Build daily summary payload
    const dailyData: IAttendanceDaily = {
      companyId,
      employeeId,
      attendanceDate,
      shiftId: new Types.ObjectId(passedShiftId),
      firstCheckIn: now,
      lastCheckOut: null,
      lateMinutes: checkInAnalysis.lateMinutes,
      isLate: checkInAnalysis.isLate,
      earlyExitMinutes: 0,
      workingMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      effectiveMinutes: 0,
      payableDayFraction: 0,
      totalPunches: 1,
      status: "INCOMPLETE",
      regularized: false,
      wasAutoPunchOut: false,
      sourceSummary: [input.source],
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    } as IAttendanceDaily;

    return this.attendanceDao.createAttendanceEvent(eventData, dailyData);
  }

  public async checkOut(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    rawInput: unknown,
    authToken: string,
  ) {
    const input = checkOutSchema.parse(rawInput) as CheckOutInput;
    const now = input.eventTime ?? new Date();
    const attendanceDate = getAttendanceDate(now);

    //  1. Validate employee
    const employee = await this.employeeClient.getEmployee(
      employeeId.toString(),
      companyId.toString(),
      authToken,
    );

    if (!employee || employee.data.job.employeeStatus !== "Active") {
      throw new AttendanceError(
        "Employee not found or inactive",
        "EMPLOYEE_INVALID",
      );
    }

    // 2. Load today's daily record
    const daily = await this.attendanceDao.getAttendanceDaily(
      companyId,
      employeeId,
      attendanceDate,
    );

    if (!daily?.firstCheckIn) {
      const dateStr = attendanceDate.toISOString().split("T")[0];
      throw new AttendanceError(
        `No check-in record found for today (${dateStr})`,
        "NO_CHECKIN",
      );
    }

    if (daily.lastCheckOut) {
      const dateStr = attendanceDate.toISOString().split("T")[0];
      throw new AttendanceError(
        `Already checked out for today (${dateStr})`,
        "ALREADY_CHECKED_OUT",
      );
    }

    if (now <= daily.firstCheckIn) {
      throw new AttendanceError(
        "Check-out time must be after check-in time",
        "INVALID_CHECKOUT_TIME",
      );
    }
    if (!daily.shiftId) {
      throw new Error("Shift ID is missing");
    }

    // 3. Load shift from EmployeeClient for calculation
    const shiftData = await this.employeeClient.getShift(
      daily.shiftId.toString(),
      companyId.toString(),
      authToken,
    );

    if (!shiftData) {
      throw new AttendanceError(
        `Shift ${daily.shiftId.toString()} not found`,
        "SHIFT_NOT_FOUND",
      );
    }

    if (!shiftData.isActive) {
      throw new AttendanceError(
        `Shift "${shiftData.name}" is inactive`,
        "SHIFT_INACTIVE",
      );
    }

    const shift: IShift = {
      _id: daily.shiftId,
      companyId: companyId,
      data: shiftData,
    };

    const boundaries = resolveShiftBoundaries(shift.data, attendanceDate);

    // 4. Auto punch-out override
    const isAutoPunchOut =
      input.source === "AUTO" ||
      shouldAutoPunchOut(daily.firstCheckIn, boundaries, now);

    const effectiveCheckOut = isAutoPunchOut
      ? resolveAutoPunchOutTime(boundaries)
      : now;

    // 5. Full analysis
    const analysis = analyseCheckOut(
      daily.firstCheckIn,
      effectiveCheckOut,
      shift.data,
      boundaries,
      isAutoPunchOut,
    );

    // 6. Build payloads
    const eventData: IAttendanceEvents = {
      companyId,
      employeeId,
      attendanceDate,
      eventType: "CHECK_OUT",
      source: input.source,
      eventTime: effectiveCheckOut,
      notes: isAutoPunchOut
        ? "Auto punch-out applied"
        : (input.notes ?? undefined),
      createdAt: now,
      updatedAt: now,
    } as IAttendanceEvents;

    const dailyData: IAttendanceDaily = {
      ...daily,
      lastCheckOut: effectiveCheckOut,
      workingMinutes: analysis.workingMinutes,
      breakMinutes: analysis.breakMinutes,
      effectiveMinutes: analysis.effectiveMinutes,
      overtimeMinutes: analysis.overtimeMinutes,
      earlyExitMinutes: analysis.earlyExitMinutes,
      payableDayFraction: analysis.payableDayFraction,
      status: analysis.status,
      wasAutoPunchOut: analysis.wasAutoPunchOut,
      totalPunches: (daily.totalPunches ?? 1) + 1,
      sourceSummary: [...(daily.sourceSummary ?? []), input.source],
      updatedAt: now,
    } as IAttendanceDaily;

    return this.attendanceDao.punchOutAttendanceEvent(eventData, dailyData);
  }

  public async runAutoPunchOut(
    companyId: Types.ObjectId,
    attendanceDate: Date,
    authToken: string,
  ) {
    const incompleteRecords = await this.attendanceDao.getCompanyAttendance(
      companyId,
      attendanceDate,
    );

    const targets = incompleteRecords.filter(
      (r) => r.status === "INCOMPLETE" && r.firstCheckIn && !r.lastCheckOut,
    );

    const results = await Promise.allSettled(
      targets.map(async (record) => {
        if (!record.shiftId) {
          throw new Error("Shift ID not found");
        }

        const shiftData = await this.employeeClient.getShift(
          record.shiftId.toString(),
          companyId.toString(),
          authToken,
        );

        if (!shiftData) {
          throw new AttendanceError(
            `Shift ${record.shiftId.toString()} not found`,
            "SHIFT_NOT_FOUND",
          );
        }

        const shift: IShift = {
          _id: record.shiftId,
          companyId: companyId,
          data: shiftData,
        };

        const boundaries = resolveShiftBoundaries(shift.data, attendanceDate);

        if (!record.firstCheckIn) {
          return;
        }

        if (!shouldAutoPunchOut(record.firstCheckIn, boundaries)) {
          return null;
        }

        return this.checkOut(
          companyId,
          record.employeeId,
          {
            source: "AUTO",
            eventTime: boundaries.autoPunchOutAt,
          },
          authToken,
        );
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      console.error(
        `[AutoPunchOut] Failed for ${failed} out of ${targets.length} records`,
        results
          .filter((r) => r.status === "rejected")
          .map((r) => (r as PromiseRejectedResult).reason),
      );
    }

    return { succeeded, failed, total: targets.length };
  }

  public async getTodaySummary(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ) {
    const attendanceDate = getAttendanceDate();
    const [daily, events] = await Promise.all([
      this.attendanceDao.getAttendanceDaily(
        companyId,
        employeeId,
        attendanceDate,
      ),
      this.attendanceDao.getAttendanceEvents(
        companyId,
        employeeId,
        attendanceDate,
      ),
    ]);
    return { daily, events };
  }

  public async getHistory(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.attendanceDao.getEmployeeAttendanceHistory(
      companyId,
      employeeId,
      fromDate,
      toDate,
    );
  }

  public async getCompanyHistory(
    companyId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.attendanceDao.getCompanyAttendanceHistory(
      companyId,
      fromDate,
      toDate,
    );
  }

  public async getEmployeeEventsHistory(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.attendanceDao.getEmployeeAttendanceEventsHistory(
      companyId,
      employeeId,
      fromDate,
      toDate,
    );
  }

  public async getCompanyEventsHistory(
    companyId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ) {
    return this.attendanceDao.getCompanyAttendanceEventsHistory(
      companyId,
      fromDate,
      toDate,
    );
  }
  public async getCompanyEventsHistoryForEmployees(
    companyId: Types.ObjectId,
    employeeIds: Types.ObjectId[],
    fromDate: Date,
    toDate: Date,
  ) {
    return this.attendanceDao.getCompanyAttendanceEventsHistoryForEmployees(
      companyId,
      employeeIds,
      fromDate,
      toDate,
    );
  }
}
