import {
  ApprovalAction,
  IApprovalHistory,
  RegularizationStatus,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

export class AttendanceRegularizationHistoryHelper {
  static build(
    action: ApprovalAction,
    previousStatus:
      | RegularizationStatus
      | undefined,
    newStatus: RegularizationStatus,
    employeeId: Types.ObjectId,
    remarks?: string,
  ): IApprovalHistory {
    return {
      action,
      previousStatus,
      newStatus,
      performedBy: employeeId,
      remarks,
      performedAt: new Date(),
    };
  }
}