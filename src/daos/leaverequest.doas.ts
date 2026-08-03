import {
  AccountsModel,
  EmployeeModel,
  IApprovalStep,
  ILeaveRequest,
  LeaveBalanceModel,
  LeavePolicyModel,
  LeaveRequestModel,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";
import { resolveApproverFromConfig } from "../helpers/resolveApproverFromConfig.helper";

export class LeaveRequestDao {
  // ─────────────────────────────────────────────
  // HELPER: resolve employee + manager in ONE aggregation
  // instead of 3 separate DB round-trips
  // ─────────────────────────────────────────────
  private async resolveEmployeeAndManager(
    employeeId: Types.ObjectId,
    companyId: Types.ObjectId,
    session: mongoose.ClientSession,
  ): Promise<{
    employeeId: Types.ObjectId;
    managerId: Types.ObjectId;
    managerName: string;
    employeeName: string;
  }> {
    const [result] = await AccountsModel.aggregate([
      // 1. Find the account for this employee + company
      {
        $match: {
          employee: new Types.ObjectId(employeeId),
          companyId: new Types.ObjectId(companyId),
        },
      },
      // 2. Join employee document
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      // 3. Join manager document using reportingManagerId from employee
      {
        $lookup: {
          from: "employees",
          localField: "employee.data.job.reportingManagerId",
          foreignField: "_id",
          as: "manager",
        },
      },
      { $unwind: "$manager" },
      // 4. Project only what we need
      {
        $project: {
          _id: 0,
          employeeId: "$employee._id",
          employeeName: {
            $concat: [
              "$employee.data.basic.firstName",
              " ",
              "$employee.data.basic.lastName",
            ],
          },
          managerId: "$manager._id",
          managerName: {
            $concat: [
              "$manager.data.basic.firstName",
              " ",
              "$manager.data.basic.lastName",
            ],
          },
        },
      },
    ]).session(session);

    if (!result) throw new Error("Account / Employee / Manager not found");

    return result;
  }

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────
  public async createLeaveRequest(
    data: ILeaveRequest,
    companyId: Types.ObjectId,
  ): Promise<ILeaveRequest> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { employeeId, managerId } = await this.resolveEmployeeAndManager(
        data.employeeId,
        companyId,
        session,
      );

      const [leavePolicy, leaveBalanceDoc] = await Promise.all([
        LeavePolicyModel.findById(data.leavePolicyId)
          .select("approvalLevels approvalConfig")
          .session(session),
        LeaveBalanceModel.findOne({ employeeId, companyId }).session(session),
      ]);

      if (!leavePolicy) throw new Error("Leave policy not found");
      if (!leaveBalanceDoc) throw new Error("Leave balance not found");

      const leaveEntry = leaveBalanceDoc.leave.find(
        (l) => l.policyId.toString() === data.leavePolicyId.toString(),
      );
      if (!leaveEntry) throw new Error("Leave policy not assigned to employee");
      if (data.totalDays > leaveEntry.balance)
        throw new Error("Insufficient leave balance");

      const approvalChain: IApprovalStep[] = [];

      // Use approvalConfig instead of hardcoding "manager"/"admin"
      const stepsToCreate = leavePolicy.approvalConfig
        .filter((step) => step.level <= leavePolicy.approvalLevels)
        .sort((a, b) => a.level - b.level);

      for (const stepConfig of stepsToCreate) {
        const approverId = await resolveApproverFromConfig(
          stepConfig,
          { ...data, employeeId, managerId } as ILeaveRequest,
          session,
        );

        approvalChain.push({
          level: stepConfig.level,
          role: stepConfig.type,
          approverId,
          status: "pending",
        });
      }

      const leaveRequest = await LeaveRequestModel.create(
        [
          {
            companyId,
            employeeId,
            managerId,
            leavePolicyId: data.leavePolicyId,
            startDate: data.startDate,
            endDate: data.endDate,
            totalDays: data.totalDays,
            isHalfDay: data.isHalfDay,
            halfDaySession: data.halfDaySession,
            reason: data.reason,
            attachmentUrl: data.attachmentUrl || undefined,
            status: "pending",
            approvalChain,
            currentLevel: approvalChain[0]?.level ?? null,
            handoverEmployeeId: data.handoverEmployeeId || undefined,
            activityLog: [
              {
                action: "created",
                performedBy: employeeId,
                performedAt: new Date(),
                remarks: "Leave request created",
              },
            ],
            audit: {
              createdBy: employeeId,
              createdAt: new Date(),
              updatedBy: employeeId,
              updatedAt: new Date(),
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return leaveRequest[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────
  // APPROVE
  // ─────────────────────────────────────────────
  public async approveLeaveRequest(
    leaveRequestId: Types.ObjectId,
    approverId: Types.ObjectId,
    action: "approved" | "rejected" | "escalated",
    remarks?: string,
  ): Promise<ILeaveRequest> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const leave =
        await LeaveRequestModel.findById(leaveRequestId).session(session);
      if (!leave) throw new Error("Leave request not found");
      if (leave.status === "approved" || leave.status === "rejected")
        throw new Error("Leave already completed");
      if (leave.currentLevel === null)
        throw new Error("No active approval level");

      const currentStep = leave.approvalChain.find(
        (a) => a.level === leave.currentLevel,
      );
      if (!currentStep) throw new Error("Current approval step not found");
      if (currentStep.approverId.toString() !== approverId.toString())
        throw new Error("Unauthorized approver");

      // Common log for any action
      currentStep.remarks = remarks ?? "";
      currentStep.actedAt = new Date();

      // ────────────────────────────────────────
      // REJECTED
      // ────────────────────────────────────────
      if (action === "rejected") {
        currentStep.status = "rejected";

        leave.activityLog.push({
          action: "rejected",
          performedBy: approverId,
          performedAt: new Date(),
          remarks,
        });

        leave.status = "rejected";
        leave.currentLevel = null;
        leave.audit.updatedBy = approverId;
        leave.audit.updatedAt = new Date();

        await leave.save({ session });
        await session.commitTransaction();
        return leave;
      }

      // ────────────────────────────────────────
      // APPROVED (final approval by this approver)
      // ────────────────────────────────────────
      if (action === "approved") {
        currentStep.status = "approved";

        leave.activityLog.push({
          action:
            currentStep.role === "admin"
              ? "admin_approved"
              : "manager_approved",
          performedBy: approverId,
          performedAt: new Date(),
          remarks,
        });

        leave.currentLevel = null;
        leave.status = "approved";

        const updateResult = await LeaveBalanceModel.updateOne(
          {
            employeeId: leave.employeeId,
            companyId: leave.companyId,
            "leave.policyId": leave.leavePolicyId,
            "leave.balance": { $gte: leave.totalDays },
          },
          {
            $inc: {
              "leave.$.used": leave.totalDays,
              "leave.$.balance": -leave.totalDays,
            },
          },
          { session },
        );

        if (updateResult.modifiedCount === 0)
          throw new Error("Insufficient balance OR concurrent update conflict");

        leave.audit.updatedBy = approverId;
        leave.audit.updatedAt = new Date();

        await leave.save({ session });
        await session.commitTransaction();
        return leave;
      }

      // ────────────────────────────────────────
      // ESCALATED
      // ────────────────────────────────────────
      // action === "escalated"
      currentStep.status = "pending";

      leave.activityLog.push({
        action: "escalated",
        performedBy: approverId,
        performedAt: new Date(),
        remarks,
      });

      // Find next escalation level from policy
      const policy = await LeavePolicyModel.findById(leave.leavePolicyId)
        .select("approvalConfig")
        .session(session);
      if (!policy) throw new Error("Policy not found for escalation");

      const currentConfigIndex = policy.approvalConfig.findIndex(
        (step) => step.level === leave.currentLevel,
      );
      const nextConfig = policy.approvalConfig[currentConfigIndex + 1];

      if (!nextConfig) {
        // No further configured level: treat as approved (final)
        leave.currentLevel = null;
        leave.status = "approved";

        const updateResult = await LeaveBalanceModel.updateOne(
          {
            employeeId: leave.employeeId,
            companyId: leave.companyId,
            "leave.policyId": leave.leavePolicyId,
            "leave.balance": { $gte: leave.totalDays },
          },
          {
            $inc: {
              "leave.$.used": leave.totalDays,
              "leave.$.balance": -leave.totalDays,
            },
          },
          { session },
        );

        if (updateResult.modifiedCount === 0)
          throw new Error("Insufficient balance OR concurrent update conflict");

        leave.audit.updatedBy = approverId;
        leave.audit.updatedAt = new Date();

        await leave.save({ session });
        await session.commitTransaction();
        return leave;
      }

      // Resolve approverId for nextConfig.type
      const nextApproverId = await resolveApproverFromConfig(
        nextConfig,
        leave,
        session,
      );

      // Add or update next step in chain (no undefined issue)
      const nextStep = leave.approvalChain.find(
        (s) => s.level === nextConfig.level,
      );

      if (!nextStep) {
        leave.approvalChain.push({
          level: nextConfig.level,
          role: nextConfig.type,
          approverId: nextApproverId,
          status: "pending",
        } as IApprovalStep);
      } else {
        nextStep.approverId = nextApproverId;
        nextStep.status = "pending";
      }

      leave.currentLevel = nextConfig.level;
      leave.status = "pending";

      leave.audit.updatedBy = approverId;
      leave.audit.updatedAt = new Date();

      await leave.save({ session });
      await session.commitTransaction();
      return leave;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────
  // CANCEL (unchanged logic, untouched)
  // ─────────────────────────────────────────────
  public async cancelLeaveRequest(
    leaveRequestId: Types.ObjectId,
    employeeId: Types.ObjectId,
    cancelReason?: string,
  ): Promise<ILeaveRequest> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const leave =
        await LeaveRequestModel.findById(leaveRequestId).session(session);

      if (!leave) throw new Error("Leave request not found");
      if (leave.employeeId.toString() !== employeeId.toString())
        throw new Error("Unauthorized");
      if (leave.status !== "approved")
        throw new Error("Only approved leave can be cancelled");
      if (new Date() >= new Date(leave.startDate))
        throw new Error("Cannot cancel after leave start date");

      const updateResult = await LeaveBalanceModel.updateOne(
        {
          employeeId,
          companyId: leave.companyId,
          "leave.policyId": leave.leavePolicyId,
        },
        {
          $inc: {
            "leave.$.used": -leave.totalDays,
            "leave.$.balance": leave.totalDays,
          },
        },
        { session },
      );

      if (updateResult.modifiedCount === 0)
        throw new Error("Balance update conflict");

      leave.status = "cancelled";
      leave.cancelReason = cancelReason ?? null;
      leave.currentLevel = null;
      leave.activityLog.push({
        action: "cancelled",
        performedBy: employeeId,
        performedAt: new Date(),
        remarks: cancelReason,
      });
      leave.audit.updatedBy = employeeId;
      leave.audit.updatedAt = new Date();

      await leave.save({ session });
      await session.commitTransaction();
      return leave;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────
  // WITHDRAW (unchanged logic, untouched)
  // ─────────────────────────────────────────────
  public async withdrawLeaveRequest(
    leaveRequestId: Types.ObjectId,
    employeeId: Types.ObjectId,
    reason?: string,
  ) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const leave =
        await LeaveRequestModel.findById(leaveRequestId).session(session);

      if (!leave) throw new Error("Leave request not found");
      if (leave.employeeId.toString() !== employeeId.toString())
        throw new Error("Unauthorized");
      if (leave.status !== "pending")
        throw new Error("Only pending leave requests can be withdrawn");
      if (leave.approvalChain.some((s) => s.status === "approved"))
        throw new Error("Cannot withdraw after approval started");

      leave.status = "withdrawn";
      leave.cancelReason = reason ?? null;
      leave.currentLevel = null;
      leave.activityLog.push({
        action: "withdrawn",
        performedBy: employeeId,
        performedAt: new Date(),
        remarks: reason,
      });
      leave.audit.updatedBy = employeeId;
      leave.audit.updatedAt = new Date();
      await leave.save({ session });
      await session.commitTransaction();
      return leave;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─────────────────────────────────────────────
  // GET PENDING APPROVALS (unchanged logic, untouched)
  // ─────────────────────────────────────────────
  public async getPendingApprovals(approverId: Types.ObjectId) {
    const requests = await LeaveRequestModel.find({
      status: "pending",
      approvalChain: {
        $elemMatch: { approverId, status: "pending" },
      },
    });

    return requests.filter((leave) => {
      const currentStep = leave.approvalChain.find(
        (a) => a.level === leave.currentLevel,
      );
      return (
        currentStep &&
        currentStep.approverId.toString() === approverId.toString()
      );
    });
  }

  // ─────────────────────────────────────────────
  // GET EMPLOYEE LEAVE HISTORY — with employee name via aggregation
  // ─────────────────────────────────────────────
  public async getEmployeeLeaveHistory(employeeId: Types.ObjectId) {
    return LeaveRequestModel.aggregate([
      { $match: { employeeId: new Types.ObjectId(employeeId) } },
      { $sort: { createdAt: -1 } },
      // Join employee to get name
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
                email: "$data.basic.email",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      // Join leave policy name
      {
        $lookup: {
          from: "leavepolicies",
          localField: "leavePolicyId",
          foreignField: "_id",
          pipeline: [{ $project: { leaveTypeName: 1 } }],
          as: "leavePolicy",
        },
      },
      { $unwind: { path: "$leavePolicy", preserveNullAndEmptyArrays: true } },
    ]);
  }

  // ─────────────────────────────────────────────
  // GET TEAM LEAVE REQUESTS — with employee names via aggregation
  // ─────────────────────────────────────────────
  public async getTeamLeaveRequests(managerId: Types.ObjectId) {
    return LeaveRequestModel.aggregate([
      { $match: { managerId: new Types.ObjectId(managerId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
                email: "$data.basic.email",
                profilePhotoUrl: "$data.basic.profilePhotoUrl",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "leavepolicies",
          localField: "leavePolicyId",
          foreignField: "_id",
          pipeline: [{ $project: { leaveTypeName: 1 } }],
          as: "leavePolicy",
        },
      },
      { $unwind: { path: "$leavePolicy", preserveNullAndEmptyArrays: true } },
    ]);
  }

  // ─────────────────────────────────────────────
  // GET LEAVE REQUEST BY ID — with names
  // ─────────────────────────────────────────────
  public async getLeaveRequestById(id: Types.ObjectId) {
    const [leave] = await LeaveRequestModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
                email: "$data.basic.email",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "managerId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
              },
            },
          ],
          as: "manager",
        },
      },
      { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "leavepolicies",
          localField: "leavePolicyId",
          foreignField: "_id",
          pipeline: [{ $project: { leaveTypeName: 1 } }],
          as: "leavePolicy",
        },
      },
      { $unwind: { path: "$leavePolicy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "activityLog.performedBy",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
              },
            },
          ],
          as: "activityPerformers",
        },
      },
    ]);

    if (!leave) throw new Error("Leave request not found");
    return leave;
  }

  // ─────────────────────────────────────────────
  // GET LEAVE CALENDAR (unchanged logic, untouched)
  // ─────────────────────────────────────────────
  public async getLeaveCalendar(params: any) {
    const { companyId, employeeId, startDate, endDate } = params;

    const filter: any = { companyId, status: "approved" };
    if (employeeId) filter.employeeId = employeeId;
    if (startDate && endDate) {
      filter.startDate = { $gte: startDate };
      filter.endDate = { $lte: endDate };
    }

    return LeaveRequestModel.find(filter).sort({ startDate: 1 });
  }

  // ─────────────────────────────────────────────
  // GET ALL LEAVE REQUESTS — with employee names
  // ─────────────────────────────────────────────
  public async getAllLeaveRequests(companyId: Types.ObjectId) {
    return LeaveRequestModel.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
                email: "$data.basic.email",
                profilePhotoUrl: "$data.basic.profilePhotoUrl",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "leavepolicies",
          localField: "leavePolicyId",
          foreignField: "_id",
          pipeline: [{ $project: { leaveTypeName: 1 } }],
          as: "leavePolicy",
        },
      },
      { $unwind: { path: "$leavePolicy", preserveNullAndEmptyArrays: true } },
    ]);
  }

  // ─────────────────────────────────────────────
  // GET ADMIN PENDING APPROVALS — with employee names
  // ─────────────────────────────────────────────
  public async getAdminPendingApprovals(
    companyId: Types.ObjectId,
    approverId: Types.ObjectId,
  ) {
    return LeaveRequestModel.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: "pending",
          currentLevel: 2,
          approvalChain: {
            $elemMatch: {
              level: 2,
              approverId: new Types.ObjectId(approverId),
              status: "pending",
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                name: {
                  $concat: [
                    "$data.basic.firstName",
                    " ",
                    "$data.basic.lastName",
                  ],
                },
                email: "$data.basic.email",
                profilePhotoUrl: "$data.basic.profilePhotoUrl",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "leavepolicies",
          localField: "leavePolicyId",
          foreignField: "_id",
          pipeline: [{ $project: { leaveTypeName: 1 } }],
          as: "leavePolicy",
        },
      },
      { $unwind: { path: "$leavePolicy", preserveNullAndEmptyArrays: true } },
    ]);
  }
}
