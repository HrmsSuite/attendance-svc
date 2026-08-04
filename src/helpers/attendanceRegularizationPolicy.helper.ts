// attendanceRegularizationPolicy.helper.ts
import { Types } from "mongoose";
import { CreateAttendanceRegularizationPolicyDto } from "../common/validators";

type PolicyInput = Omit<
  CreateAttendanceRegularizationPolicyDto,
  "approverId"
> & {
  approverId?: Types.ObjectId;
};

export class AttendanceRegularizationPolicyHelper {
  public static validatePolicy(data: PolicyInput): void {
    // If policy is enabled, approverId must be set
    if (data.enabled && !data.approverId) {
      throw new Error("Approver must be selected when policy is enabled");
    }

    // Attachment required but reason not mandatory
    if (data.attachmentRequired && !data.reasonMandatory) {
      throw new Error("Reason must be mandatory when attachments are required");
    }

    // Multiple requests per day doesn't make sense if monthly limit is 1
    if (data.allowMultipleRequestsPerDay && data.maxRequestsPerMonth === 1) {
      throw new Error(
        "Multiple requests per day cannot be enabled when monthly limit is 1",
      );
    }
  }
}
