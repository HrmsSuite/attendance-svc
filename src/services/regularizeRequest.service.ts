// services/attendanceRegularization.service.ts

import { Types } from "mongoose";
import mongoose from "mongoose";

import {
  IAttendanceRegularization,
  RegularizationStatus,
  AttendanceDaily,
} from "@hrmssuite/persistence";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../common/errors";
import {
  AttendanceRegularizationHistoryHelper,
  AttendanceRegularizationAttendanceHelper,
  AttendanceRegularizationValidationHelper,
} from "../helpers";
import {
  CreateAttendanceRegularizationDto,
  createAttendanceRegularizationSchema,
  UpdateAttendanceRegularizationDto,
  updateAttendanceRegularizationSchema,
} from "../common/validators";
import { EmployeeClient } from "../client/employee.client";
import {
  AttendanceRegularizationDao,
  AttendanceRegularizationPolicyDao,
} from "../daos";
import { IShiftData } from "../typings";

export interface SubmitRegularizationContext {
  monthlyRequestCount: number;
  isHoliday: boolean;
  isWeekOff: boolean;
  payrollProcessed: boolean;
}

interface AttendanceSnapshot {
  attendanceDate: Date;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
}

export class AttendanceRegularizationService {
  private attendanceRegularizationDao = new AttendanceRegularizationDao();
  private attendanceRegularizationPolicyDao =
    new AttendanceRegularizationPolicyDao();
  private employeeClient: EmployeeClient;

  constructor(employeeClient: EmployeeClient) {
    this.employeeClient = employeeClient;
  }

  /**
   * Save Draft
   */
  public async createDraft(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    approverId: Types.ObjectId,
    attendance: AttendanceSnapshot,
    payload: CreateAttendanceRegularizationDto,
  ): Promise<IAttendanceRegularization> {
    const validated = createAttendanceRegularizationSchema.parse(payload);

    AttendanceRegularizationValidationHelper.validateRequestedTime(
      validated.regularizationType,
      validated.requestedCheckIn,
      validated.requestedCheckOut,
    );

    const policy =
      await this.attendanceRegularizationPolicyDao.getAttendanceRegularizationPolicy(
        companyId,
      );

    const attendanceDailyId = new Types.ObjectId(validated.attendanceDailyId);

    const existing =
      await this.attendanceRegularizationDao.getActiveAttendanceRegularization(
        companyId,
        employeeId,
        attendanceDailyId,
      );

    if (policy) {
      AttendanceRegularizationValidationHelper.validateDuplicateRequest(
        policy,
        !!existing,
      );
    } else if (existing) {
      throw new ConflictError(
        "A draft or pending regularization request already exists.",
      );
    }

    const request = AttendanceRegularizationHistoryHelper.build(
      // actually BuilderHelper in your code
      // using your existing builder helper
      companyId,
      employeeId,
      approverId,
      {
        attendanceDailyId,
        attendanceDate: attendance.attendanceDate,
        currentCheckIn: attendance.firstCheckIn ?? undefined,
        currentCheckOut: attendance.lastCheckOut ?? undefined,
      },
      validated,
      RegularizationStatus.DRAFT,
    );

    return this.attendanceRegularizationDao.createAttendanceRegularization(
      companyId,
      request as unknown as Omit<
        IAttendanceRegularization,
        "createdAt" | "updatedAt" | "isDeleted" | "deletedAt"
      >,
    );
  }

  /**
   * Update Draft — atomic: only succeeds if the caller owns the request
   * and it is still in DRAFT.
   */
  public async updateDraft(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    requestId: Types.ObjectId,
    payload: UpdateAttendanceRegularizationDto,
  ): Promise<IAttendanceRegularization> {
    const validated = updateAttendanceRegularizationSchema.parse(payload);

    const request =
      await this.attendanceRegularizationDao.getAttendanceRegularizationById(
        companyId,
        requestId,
      );

    if (!request) {
      throw new NotFoundError("Regularization request not found.");
    }

    AttendanceRegularizationValidationHelper.validateRequestedTime(
      validated.regularizationType ?? request.regularizationType,
      validated.requestedCheckIn ?? request.requestedCheckIn,
      validated.requestedCheckOut ?? request.requestedCheckOut,
    );

    const updateData: Partial<IAttendanceRegularization> = {
      updatedBy: employeeId,
    };

    if (validated.attendanceDailyId) {
      updateData.attendanceDailyId = new Types.ObjectId(
        validated.attendanceDailyId,
      );
    }

    if (validated.requestedCheckIn !== undefined) {
      updateData.requestedCheckIn = validated.requestedCheckIn;
    }

    if (validated.requestedCheckOut !== undefined) {
      updateData.requestedCheckOut = validated.requestedCheckOut;
    }

    if (validated.regularizationType !== undefined) {
      updateData.regularizationType = validated.regularizationType;
    }

    if (validated.requestSource !== undefined) {
      updateData.requestSource = validated.requestSource;
    }

    if (validated.reason !== undefined) {
      updateData.reason = validated.reason;
    }

    if (validated.attachments !== undefined) {
      updateData.attachments = validated.attachments;
    }

    const updated =
      await this.attendanceRegularizationDao.updateAttendanceRegularization(
        companyId,
        requestId,
        updateData,
        {
          employeeId,
          status: RegularizationStatus.DRAFT,
        },
      );

    if (!updated) {
      await this.assertTransitionFailureReason(
        companyId,
        requestId,
        { employeeId },
        RegularizationStatus.DRAFT,
      );
    }

    return updated as IAttendanceRegularization;
  }

  /**
   * Submit Draft — runs full policy validation, then atomically flips
   * DRAFT -> PENDING.
   */
  public async submitDraft(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    requestId: Types.ObjectId,
    context: SubmitRegularizationContext,
  ): Promise<IAttendanceRegularization> {
    const request =
      await this.attendanceRegularizationDao.getAttendanceRegularizationById(
        companyId,
        requestId,
      );

    if (!request) {
      throw new NotFoundError("Regularization request not found.");
    }

    if (!request.employeeId.equals(employeeId)) {
      throw new ForbiddenError("You are not allowed to submit this request.");
    }

    if (request.status !== RegularizationStatus.DRAFT) {
      throw new ConflictError("Only draft requests can be submitted.");
    }

    const policy =
      await this.attendanceRegularizationPolicyDao.getAttendanceRegularizationPolicy(
        companyId,
      );

    if (!policy) {
      throw new BadRequestError(
        "Attendance regularization policy not configured.",
      );
    }

    AttendanceRegularizationValidationHelper.validatePolicyEnabled(policy);
    AttendanceRegularizationValidationHelper.validateBackdatedDays(
      policy,
      request.attendanceDate,
    );
    AttendanceRegularizationValidationHelper.validateMonthlyLimit(
      policy,
      context.monthlyRequestCount,
    );
    AttendanceRegularizationValidationHelper.validateHoliday(
      policy,
      context.isHoliday,
    );
    AttendanceRegularizationValidationHelper.validateWeekOff(
      policy,
      context.isWeekOff,
    );
    AttendanceRegularizationValidationHelper.validatePayrollLock(
      policy,
      context.payrollProcessed,
    );
    AttendanceRegularizationValidationHelper.validateReason(
      policy,
      request.reason,
    );
    AttendanceRegularizationValidationHelper.validateAttachment(
      policy,
      request.attachments,
    );
    AttendanceRegularizationValidationHelper.validateRequestedTime(
      request.regularizationType,
      request.requestedCheckIn,
      request.requestedCheckOut,
    );

    const historyEntry = AttendanceRegularizationHistoryHelper.build(
      "SUBMITTED" as any,
      RegularizationStatus.DRAFT,
      RegularizationStatus.PENDING,
      employeeId,
    );

    const updated = await this.attendanceRegularizationDao.transitionStatus(
      companyId,
      requestId,
      RegularizationStatus.DRAFT,
      {
        status: RegularizationStatus.PENDING,
        updatedBy: employeeId,
      },
      historyEntry,
      { employeeId },
    );

    if (!updated) {
      await this.assertTransitionFailureReason(
        companyId,
        requestId,
        { employeeId },
        RegularizationStatus.DRAFT,
      );
    }

    return updated as IAttendanceRegularization;
  }

  /**
   * Withdraw — employee-only, PENDING -> WITHDRAWN.
   */
  public async withdraw(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<IAttendanceRegularization> {
    const historyEntry = AttendanceRegularizationHistoryHelper.build(
      "WITHDRAWN" as any,
      RegularizationStatus.PENDING,
      RegularizationStatus.WITHDRAWN,
      employeeId,
    );

    const updated = await this.attendanceRegularizationDao.transitionStatus(
      companyId,
      requestId,
      RegularizationStatus.PENDING,
      {
        status: RegularizationStatus.WITHDRAWN,
        updatedBy: employeeId,
      },
      historyEntry,
      { employeeId },
    );

    if (!updated) {
      await this.assertTransitionFailureReason(
        companyId,
        requestId,
        { employeeId },
        RegularizationStatus.PENDING,
      );
    }

    return updated as IAttendanceRegularization;
  }

  /**
   * Approve — approver-only, PENDING -> APPROVED.
   * Also updates AttendanceDaily in the same transaction.
   */
  public async approve(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    approverId: Types.ObjectId,
    remarks?: string,
  ): Promise<IAttendanceRegularization> {
    const request =
      await this.attendanceRegularizationDao.getAttendanceRegularizationById(
        companyId,
        requestId,
      );

    if (!request) {
      throw new NotFoundError("Regularization request not found.");
    }

    if (request.status !== RegularizationStatus.PENDING) {
      throw new ConflictError("Only pending requests can be approved.");
    }

    if (!request.approverId.equals(approverId)) {
      throw new ForbiddenError(
        "You are not authorized to approve this request.",
      );
    }

    // Load AttendanceDaily
    const daily = await AttendanceDaily.findOne({
      companyId,
      employeeId: request.employeeId,
      attendanceDate: request.attendanceDate,
    }).lean();

    if (!daily) {
      throw new NotFoundError("Attendance daily record not found.");
    }

    // Load shift config
    const shift = await this.getShiftForRecord(daily);

    // Build attendance update using helper
    const attendanceUpdate =
      AttendanceRegularizationAttendanceHelper.buildAttendanceUpdate(
        daily,
        request,
        shift,
      );

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updated =
        await this.attendanceRegularizationDao.approveWithAttendanceUpdate(
          companyId,
          requestId,
          approverId,
          remarks,
          attendanceUpdate,
          session,
        );

      if (!updated) {
        await session.abortTransaction();
        throw new ConflictError(
          "Request could not be approved. It may have already been processed.",
        );
      }

      await session.commitTransaction();
      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Reject — approver-only, PENDING -> REJECTED. Remarks mandatory.
   */
  public async reject(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    approverId: Types.ObjectId,
    remarks: string,
  ): Promise<IAttendanceRegularization> {
    if (!remarks?.trim()) {
      throw new BadRequestError(
        "Remarks are required while rejecting a request.",
      );
    }

    const historyEntry = AttendanceRegularizationHistoryHelper.build(
      "REJECTED" as any,
      RegularizationStatus.PENDING,
      RegularizationStatus.REJECTED,
      approverId,
      remarks,
    );

    const updated = await this.attendanceRegularizationDao.transitionStatus(
      companyId,
      requestId,
      RegularizationStatus.PENDING,
      {
        status: RegularizationStatus.REJECTED,
        updatedBy: approverId,
        reviewedBy: approverId,
        reviewedAt: new Date(),
        reviewRemarks: remarks,
      },
      historyEntry,
      { approverId },
    );

    if (!updated) {
      await this.assertTransitionFailureReason(
        companyId,
        requestId,
        { approverId },
        RegularizationStatus.PENDING,
      );
    }

    return updated as IAttendanceRegularization;
  }

  /**
   * Read helpers
   */
  public async getById(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
  ): Promise<IAttendanceRegularization> {
    const request =
      await this.attendanceRegularizationDao.getAttendanceRegularizationById(
        companyId,
        requestId,
      );

    if (!request) {
      throw new NotFoundError("Regularization request not found.");
    }

    return request;
  }

  public listForEmployee(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getEmployeeAttendanceRegularizations(
      companyId,
      employeeId,
      page,
      limit,
    );
  }

  public listPendingForApprover(
    companyId: Types.ObjectId,
    approverId: Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getPendingAttendanceRegularizations(
      companyId,
      approverId,
      page,
      limit,
    );
  }

  /**
   * Helper to load shift data for a given attendance daily record.
   */
  private async getShiftForRecord(daily: {
    companyId: Types.ObjectId;
    shiftId?: Types.ObjectId | null;
  }): Promise<IShiftData> {
    if (!daily.shiftId) {
      throw new BadRequestError(
        "Shift ID is missing for this attendance record.",
      );
    }

    const shiftDoc = await this.employeeClient.getShift(
      daily.shiftId.toString(),
      daily.companyId.toString(),
      "", // authToken if needed; adapt as per your setup
    );

    if (!shiftDoc) {
      throw new NotFoundError("Shift not found.");
    }

    if (!shiftDoc.isActive) {
      throw new BadRequestError("Shift is inactive.");
    }

    return shiftDoc as IShiftData;
  }

  /**
   * Figures out *why* an atomic transition returned null (not found /
   * wrong owner / already moved to a different status) and throws the
   * precise error. Only called on the unhappy path.
   */
  private async assertTransitionFailureReason(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    owner: { employeeId?: Types.ObjectId; approverId?: Types.ObjectId },
    expectedStatus: RegularizationStatus,
  ): Promise<never> {
    const existing =
      await this.attendanceRegularizationDao.getAttendanceRegularizationById(
        companyId,
        requestId,
      );

    if (!existing) {
      throw new NotFoundError("Regularization request not found.");
    }

    if (owner.employeeId && !existing.employeeId.equals(owner.employeeId)) {
      throw new ForbiddenError(
        "You are not allowed to perform this action on this request.",
      );
    }

    if (owner.approverId && !existing.approverId.equals(owner.approverId)) {
      throw new ForbiddenError(
        "You are not authorized to act on this request.",
      );
    }

    if (existing.status !== expectedStatus) {
      throw new ConflictError(
        `Request is currently '${existing.status}' and can no longer be transitioned from '${expectedStatus}'.`,
      );
    }

    throw new ConflictError(
      "The request was modified by another operation. Please refresh and try again.",
    );
  }

  public async getApproverIdForEmployee(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    authToken: string,
  ): Promise<Types.ObjectId> {
    const employee = await this.employeeClient.getEmployee(
      employeeId.toString(),
      companyId.toString(),
      authToken,
    );

    if (!employee) {
      throw new NotFoundError("Employee not found.");
    }

    const reportingManagerId = employee.data.job.reportingManagerId;

    if (!reportingManagerId) {
      throw new BadRequestError("Reporting manager is not configured.");
    }

    return new Types.ObjectId(reportingManagerId);
  }

  public async buildSubmitContext(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDate: Date,
  ): Promise<SubmitRegularizationContext> {
    const monthlyRequestCount =
      await this.attendanceRegularizationDao.countMonthlyRequests(
        companyId,
        employeeId,
        attendanceDate.getFullYear(),
        attendanceDate.getMonth() + 1,
      );

    const attendance = await AttendanceDaily.findOne({
      companyId,
      employeeId,
      attendanceDate,
    }).lean();

    if (!attendance) {
      throw new NotFoundError("Attendance record not found.");
    }

    return {
      monthlyRequestCount,
      isHoliday: attendance.status === "HOLIDAY",
      isWeekOff: attendance.status === "WEEK_OFF",
      payrollProcessed: false,
    };
  }

  /**
   * Get requests by status
   */
  public getByStatus(
    companyId: Types.ObjectId,
    status: RegularizationStatus,
    page = 1,
    limit = 20,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getByStatus(
      companyId,
      status,
      page,
      limit,
    );
  }

  /**
   * Get requests for a specific attendance date
   */
  public getByDate(
    companyId: Types.ObjectId,
    date: Date,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getByDate(companyId, date);
  }

  /**
   * Get requests for a month
   */
  public getByMonth(
    companyId: Types.ObjectId,
    year: number,
    month: number,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getByMonth(companyId, year, month);
  }

  /**
   * Employee + Status
   */
  public getByEmployeeAndStatus(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    status: RegularizationStatus,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getByEmployeeAndStatus(
      companyId,
      employeeId,
      status,
    );
  }

  /**
   * Payroll Engine
   */
  public getForPayrollPeriod(
    companyId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<IAttendanceRegularization[]> {
    return this.attendanceRegularizationDao.getForPayrollPeriod(
      companyId,
      from,
      to,
    );
  }

  /**
   * Pending Count
   */
  public countPending(companyId: Types.ObjectId): Promise<number> {
    return this.attendanceRegularizationDao.countPending(companyId);
  }

  /**
   * Dashboard
   */
  public dashboardStats(companyId: Types.ObjectId) {
    return this.attendanceRegularizationDao.dashboardStats(companyId);
  }
}
