import {
  EmployeeModel,
  IApprovalConfigStep,
  ILeaveRequest,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";

export async function resolveApproverFromConfig(
  config: IApprovalConfigStep,
  leave: ILeaveRequest,
  session: mongoose.ClientSession,
): Promise<Types.ObjectId> {
  switch (config.type) {
    case "direct_manager": {
      if (!leave.managerId) {
        throw new Error("Manager not found for employee");
      }
      return leave.managerId;
    }

    case "manager_of_manager": {
      const [empWithManager] = await EmployeeModel.aggregate([
        { $match: { _id: new Types.ObjectId(leave.managerId) } },
        {
          $lookup: {
            from: "employees",
            localField: "data.job.reportingManagerId",
            foreignField: "_id",
            as: "manager",
          },
        },
        { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            managerId: "$manager._id",
          },
        },
      ]).session(session);

      if (!empWithManager?.managerId) {
        throw new Error("Manager of manager not found");
      }
      return new Types.ObjectId(empWithManager.managerId);
    }

    case "department_head": {
      const [empWithDept] = await EmployeeModel.aggregate([
        { $match: { _id: leave.employeeId } },
        {
          $lookup: {
            from: "departments",
            localField: "data.job.department",
            foreignField: "_id",
            as: "department",
          },
        },
        { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            departmentHeadId: "$department.departmentHeadId",
          },
        },
      ]).session(session);

      if (!empWithDept?.departmentHeadId) {
        throw new Error("Department head not found");
      }
      return new Types.ObjectId(empWithDept.departmentHeadId);
    }

    case "admin": {
      return new Types.ObjectId(leave.companyId);
    }

    default: {
      throw new Error(`Unknown approval config type: ${config.type}`);
    }
  }
}
