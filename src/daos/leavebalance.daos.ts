import { LeaveBalanceModel } from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { LeaveBalanceDetail } from "../typings";

export class LeaveBalanceDao {
  public async getAllLeaveBalance(companyId: Types.ObjectId) {
    try {
      return await LeaveBalanceModel.aggregate([
        {
          $match: {
            companyId,
          },
        },
        {
          $unwind: "$leave",
        },
        {
          $lookup: {
            from: "leavepolicies",
            localField: "leave.policyId",
            foreignField: "_id",
            as: "policy",
          },
        },
        {
          $unwind: {
            path: "$policy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "employees",
            localField: "employeeId",
            foreignField: "_id",
            as: "employee",
          },
        },
        {
          $unwind: {
            path: "$employee",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            employeeName: {
              $concat: [
                { $ifNull: ["$employee.data.basic.firstName", ""] },
                " ",
                { $ifNull: ["$employee.data.basic.lastName", ""] },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            companyId: { $first: "$companyId" },
            employeeId: { $first: "$employeeId" },
            employeeName: { $first: "$employeeName" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            leave: {
              $push: {
                policyId: "$leave.policyId",
                leaveTypeName: "$policy.leaveTypeName",
                total: "$leave.total",
                balance: "$leave.balance",
                used: "$leave.used",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            companyId: 1,
            employeeId: 1,
            employeeName: 1,
            createdAt: 1,
            updatedAt: 1,
            leave: 1,
          },
        },
      ]);
    } catch (error) {
      throw new Error(`Failed to fetch leave balances: ${error}`);
    }
  }

  public async getLeaveBalanceById(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<LeaveBalanceDetail[]> {
    try {
      return await LeaveBalanceModel.aggregate([
        {
          $match: {
            companyId,
            employeeId,
          },
        },
        {
          $unwind: "$leave",
        },
        {
          $lookup: {
            from: "leavepolicies",
            localField: "leave.policyId",
            foreignField: "_id",
            as: "policy",
          },
        },
        {
          $unwind: {
            path: "$policy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            policyId: "$leave.policyId",
            leaveTypeName: "$policy.leaveTypeName",
            total: "$leave.total",
            balance: "$leave.balance",
            used: "$leave.used",
          },
        },
      ]);
    } catch (error) {
      throw new Error(`Failed to fetch leave balance: ${error}`);
    }
  }
}
