import {
  ApprovalAction,
  IApprovalHistory,
  IAttendanceRegularization,
  RegularizationStatus,
  RegularizationType,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

import { AttendanceRegularizationHistoryHelper } from "./attendanceRegularizationHistory.helper";

export class AttendanceRegularizationBuilderHelper {
  static build(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    approverId: Types.ObjectId,
    attendance: {
      attendanceDailyId: Types.ObjectId;
      attendanceDate: Date;
      currentCheckIn?: Date;
      currentCheckOut?: Date;
    },
    payload: {
      regularizationType: RegularizationType;
      requestSource: IAttendanceRegularization["requestSource"];
      requestedCheckIn?: Date;
      requestedCheckOut?: Date;
      reason: string;
      attachments?: IAttendanceRegularization["attachments"];
    },
    initialStatus: RegularizationStatus = RegularizationStatus.DRAFT,
  ): Omit<IAttendanceRegularization, "createdAt" | "updatedAt"> {
    const approvalHistory: IApprovalHistory[] =
      initialStatus === RegularizationStatus.DRAFT
        ? []
        : [
            AttendanceRegularizationHistoryHelper.build(
              ApprovalAction.SUBMITTED,
              undefined,
              initialStatus,
              employeeId,
            ),
          ];

    return {
      companyId,
      employeeId,
      attendanceDailyId: attendance.attendanceDailyId,
      attendanceDate: attendance.attendanceDate,
      currentCheckIn: attendance.currentCheckIn,
      currentCheckOut: attendance.currentCheckOut,
      requestedCheckIn: payload.requestedCheckIn,
      requestedCheckOut: payload.requestedCheckOut,
      regularizationType: payload.regularizationType,
      requestSource: payload.requestSource,
      reason: payload.reason,
      attachments: payload.attachments ?? [],
      approverId,
      status: initialStatus,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewRemarks: undefined,
      approvalHistory,
      isAttendanceUpdated: false,
      attendanceUpdatedAt: undefined,
      payrollAffected: false,
      createdBy: employeeId,
      updatedBy: undefined,
      isDeleted: false,
      deletedAt: undefined,
    };
  }
}
