// daos/attendanceRegularization.dao.ts

import {
  AttendanceRegularize,
  IApprovalHistory,
  IAttendanceRegularization,
  IAttendanceDaily,
  AttendanceDaily,
  RegularizationStatus,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { employeeLookupStages } from "../helpers";

type AttendanceRegularizationUpdateFilter = {
  employeeId?: Types.ObjectId;
  approverId?: Types.ObjectId;
  status?: RegularizationStatus;
};

export class AttendanceRegularizationDao {
  /**
   * Create Regularization Request
   */
  public async createAttendanceRegularization(
    companyId: Types.ObjectId,
    data: Omit<
      IAttendanceRegularization,
      "companyId" | "createdAt" | "updatedAt" | "isDeleted" | "deletedAt"
    >,
  ): Promise<IAttendanceRegularization> {
    const regularization = await AttendanceRegularize.create({
      companyId,
      ...data,
    });

    return regularization.toObject();
  }

  /**
   * Get Request By Id
   */
  public async getAttendanceRegularizationById(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
  ): Promise<any | null> {
    const result = await AttendanceRegularize.aggregate([
      {
        $match: {
          _id: requestId,
          companyId,
          isDeleted: false,
        },
      },

      ...employeeLookupStages,
    ]);

    return result[0] ?? null;
  }

  /**
   * Get Employee Requests (paginated)
   */
  public async getEmployeeAttendanceRegularizations(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{
    data: IAttendanceRegularization[];
    total: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      companyId,
      employeeId,
      isDeleted: false,
    };

    const [data, total] = await Promise.all([
      AttendanceRegularize.aggregate([
        {
          $match: filter,
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: safeLimit,
        },

        ...employeeLookupStages,
      ]),

      AttendanceRegularize.countDocuments(filter),
    ]);

    return {
      data,
      total,
    };
  }

  /**
   * Get Pending Requests For Approver (paginated)
   */
  public async getPendingAttendanceRegularizations(
    companyId: Types.ObjectId,
    approverId: Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{
    data: IAttendanceRegularization[];
    total: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      companyId,
      approverId,
      status: RegularizationStatus.PENDING,
      isDeleted: false,
    };

    const [data, total] = await Promise.all([
      AttendanceRegularize.aggregate([
        {
          $match: filter,
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: safeLimit,
        },

        ...employeeLookupStages,
      ]),

      AttendanceRegularize.countDocuments(filter),
    ]);

    return {
      data,
      total,
    };
  }

  /**
   * Check Existing Active Request (DRAFT/PENDING) for the same attendance record
   */
  public async getActiveAttendanceRegularization(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDailyId: Types.ObjectId,
  ): Promise<IAttendanceRegularization | null> {
    return AttendanceRegularize.findOne({
      companyId,
      employeeId,
      attendanceDailyId,
      status: {
        $in: [RegularizationStatus.DRAFT, RegularizationStatus.PENDING],
      },
      isDeleted: false,
    }).lean();
  }

  /**
   * Generic update (e.g. draft edits). `extraFilter` lets callers bake in
   * ownership/status guards atomically instead of fetch-then-write.
   */
  public async updateAttendanceRegularization(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    data: Partial<IAttendanceRegularization>,
    extraFilter: AttendanceRegularizationUpdateFilter = {},
  ): Promise<IAttendanceRegularization | null> {
    return AttendanceRegularize.findOneAndUpdate(
      {
        _id: requestId,
        companyId,
        isDeleted: false,
        ...extraFilter,
      },
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  /**
   * Atomic status transition: matches current status (+ any ownership filter)
   * in the same query as the write, so concurrent transitions can't stomp
   * each other. Returns null if the doc no longer matches (already moved,
   * wrong owner, not found, deleted) — caller decides how to report that.
   */
  public async transitionStatus(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    expectedStatus: RegularizationStatus,
    data: Partial<IAttendanceRegularization>,
    historyEntry: IApprovalHistory,
    extraFilter: AttendanceRegularizationUpdateFilter = {},
  ): Promise<IAttendanceRegularization | null> {
    return AttendanceRegularize.findOneAndUpdate(
      {
        _id: requestId,
        companyId,
        status: expectedStatus,
        isDeleted: false,
        ...extraFilter,
      },
      {
        $set: data,
        $push: { approvalHistory: historyEntry },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  /**
   * Soft Delete
   */
  public async deleteAttendanceRegularization(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
  ): Promise<boolean> {
    const result = await AttendanceRegularize.updateOne(
      {
        _id: requestId,
        companyId,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Atomic approve + attendance update.
   *
   * - Transitions request: PENDING → APPROVED.
   * - Updates AttendanceDaily with the provided partial update.
   * - Marks isAttendanceUpdated = true, attendanceUpdatedAt = now.
   *
   * Returns null if:
   *  - request not found,
   *  - status not PENDING,
   *  - approver mismatch,
   *  - or already processed.
   *
   * Caller should treat null as a conflict / not-approvable situation.
   */
  public async approveWithAttendanceUpdate(
    companyId: Types.ObjectId,
    requestId: Types.ObjectId,
    approverId: Types.ObjectId,
    remarks: string | undefined,
    attendanceUpdate: Partial<IAttendanceDaily>,
    session?: mongoose.ClientSession,
  ): Promise<IAttendanceRegularization | null> {
    const updatedRequest = await AttendanceRegularize.findOneAndUpdate(
      {
        _id: requestId,
        companyId,
        status: RegularizationStatus.PENDING,
        approverId,
        isDeleted: false,
      },
      {
        $set: {
          status: RegularizationStatus.APPROVED,
          reviewedBy: approverId,
          reviewedAt: new Date(),
          reviewRemarks: remarks,
          updatedBy: approverId,
          isAttendanceUpdated: true,
          attendanceUpdatedAt: new Date(),
        },
        $push: {
          approvalHistory: {
            action: "APPROVED" as const,
            previousStatus: RegularizationStatus.PENDING,
            newStatus: RegularizationStatus.APPROVED,
            performedBy: approverId,
            remarks,
            performedAt: new Date(),
          },
        },
      },
      {
        new: true,
        session,
      },
    ).lean();

    if (!updatedRequest) {
      return null;
    }

    // Apply update to AttendanceDaily in the same transaction
    const attendanceResult = await AttendanceDaily.findOneAndUpdate(
      {
        _id: updatedRequest.attendanceDailyId,
        companyId,
        employeeId: updatedRequest.employeeId,
      },
      {
        $set: {
          ...attendanceUpdate,
          regularized: true,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        session,
      },
    );

    console.log("========== ATTENDANCE UPDATE ==========");
    console.log("Request ID:", requestId.toString());
    console.log("Attendance ID:", updatedRequest.attendanceDailyId.toString());
    console.log("Attendance Result:", attendanceResult);
    console.log("Regularized:", attendanceResult?.regularized);
    console.log("========================================");

    if (!attendanceResult) {
      throw new Error(
        `AttendanceDaily record not found: ${updatedRequest.attendanceDailyId}`,
      );
    }

    return updatedRequest;
  }

  public async getByStatus(
    companyId: Types.ObjectId,
    status: RegularizationStatus,
    page = 1,
    limit = 20,
  ): Promise<any[]> {
    const skip = (page - 1) * limit;

    return AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          status,
          isDeleted: false,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $skip: skip,
      },

      {
        $limit: limit,
      },

      ...employeeLookupStages,
    ]);
  }

  public async getByDate(
    companyId: Types.ObjectId,
    date: Date,
  ): Promise<any[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          attendanceDate: {
            $gte: start,
            $lte: end,
          },
          isDeleted: false,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      ...employeeLookupStages,
    ]);
  }

  public async getByMonth(
    companyId: Types.ObjectId,
    year: number,
    month: number,
  ): Promise<any[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          attendanceDate: {
            $gte: start,
            $lt: end,
          },
          isDeleted: false,
        },
      },

      {
        $sort: {
          attendanceDate: -1,
        },
      },

      ...employeeLookupStages,
    ]);
  }

  public async getByEmployeeAndStatus(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    status: RegularizationStatus,
  ): Promise<any[]> {
    return AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          employeeId,
          status,
          isDeleted: false,
        },
      },

      {
        $sort: {
          attendanceDate: -1,
        },
      },

      ...employeeLookupStages,
    ]);
  }

  public async getForPayrollPeriod(
    companyId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    return AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          attendanceDate: {
            $gte: from,
            $lte: to,
          },
          status: RegularizationStatus.APPROVED,
          payrollAffected: false,
          isDeleted: false,
        },
      },

      {
        $sort: {
          attendanceDate: 1,
        },
      },

      ...employeeLookupStages,
    ]);
  }

  public async countMonthlyRequests(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    year: number,
    month: number,
  ): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return AttendanceRegularize.countDocuments({
      companyId,
      employeeId,
      attendanceDate: {
        $gte: start,
        $lt: end,
      },
      status: {
        $in: [RegularizationStatus.PENDING, RegularizationStatus.APPROVED],
      },
      isDeleted: false,
    });
  }

  public async countPending(companyId: Types.ObjectId): Promise<number> {
    return AttendanceRegularize.countDocuments({
      companyId,
      status: RegularizationStatus.PENDING,
      isDeleted: false,
    });
  }

  public async dashboardStats(companyId: Types.ObjectId) {
    const result = await AttendanceRegularize.aggregate([
      {
        $match: {
          companyId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    return result;
  }

  /**
   * Get all regularization requests for a company (paginated).
   * Includes every status:
   * DRAFT, PENDING, APPROVED, REJECTED, WITHDRAWN, etc.
   */
  public async getAllAttendanceRegularizations(
    companyId: Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{
    data: IAttendanceRegularization[];
    total: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const skip = (safePage - 1) * safeLimit;

    const filter = {
      companyId,
      isDeleted: false,
    };

    const [data, total] = await Promise.all([
      AttendanceRegularize.aggregate([
        {
          $match: filter,
        },

        {
          $sort: {
            createdAt: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: safeLimit,
        },

        // Calculate monthly regularization count
        // for the same employee and attendance month
        {
          $lookup: {
            from: "attendanceregularizations",
            let: {
              employeeId: "$employeeId",
              attendanceDate: "$attendanceDate",
              companyId: "$companyId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$companyId", "$$companyId"],
                      },
                      {
                        $eq: ["$employeeId", "$$employeeId"],
                      },
                      {
                        $eq: ["$isDeleted", false],
                      },
                      {
                        $in: [
                          "$status",
                          [
                            RegularizationStatus.PENDING,
                            RegularizationStatus.APPROVED,
                          ],
                        ],
                      },

                      // Same year
                      {
                        $eq: [
                          {
                            $year: "$attendanceDate",
                          },
                          {
                            $year: "$$attendanceDate",
                          },
                        ],
                      },

                      // Same month
                      {
                        $eq: [
                          {
                            $month: "$attendanceDate",
                          },
                          {
                            $month: "$$attendanceDate",
                          },
                        ],
                      },
                    ],
                  },
                },
              },

              {
                $count: "count",
              },
            ],
            as: "monthlyRequests",
          },
        },

        {
          $set: {
            monthlyRequestCount: {
              $ifNull: [
                {
                  $arrayElemAt: ["$monthlyRequests.count", 0],
                },
                0,
              ],
            },
          },
        },

        {
          $unset: "monthlyRequests",
        },

        // Employee details + final projection
        ...employeeLookupStages,
      ]),

      AttendanceRegularize.countDocuments(filter),
    ]);

    return {
      data,
      total,
    };
  }
}
