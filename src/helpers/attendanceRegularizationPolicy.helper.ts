import { CreateAttendanceRegularizationPolicyDto } from "../common/validators";

export class AttendanceRegularizationPolicyHelper {
  public static validatePolicy(
    data: CreateAttendanceRegularizationPolicyDto,
  ): void {
    // Disabled policy should not have an approval flow configured
    if (!data.enabled && data.approvalFlow === "REPORTING_MANAGER_THEN_HR") {
      throw new Error(
        "Approval flow cannot be configured when policy is disabled",
      );
    }

    // Attachment required but reason not mandatory
    if (data.attachmentRequired && !data.reasonMandatory) {
      throw new Error("Reason must be mandatory when attachments are required");
    }

    // Multiple requests per day doesn't make much sense if monthly limit is 1
    if (data.allowMultipleRequestsPerDay && data.maxRequestsPerMonth === 1) {
      throw new Error(
        "Multiple requests per day cannot be enabled when monthly limit is 1",
      );
    }
  }
}
