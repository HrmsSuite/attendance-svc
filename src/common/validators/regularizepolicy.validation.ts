import { z } from "zod";

export const AttendanceRegularizationPolicySchema = z.object({
  enabled: z.boolean(),
  maxRequestsPerMonth: z.number().int().positive().optional(),
  maxBackdatedDays: z.number().int().nonnegative().optional(),
  allowMissedPunchRegularization: z.boolean(),
  allowWeekOffRegularization: z.boolean(),
  allowHolidayRegularization: z.boolean(),
  allowMultipleRequestsPerDay: z.boolean(),
  allowAfterPayrollProcessed: z.boolean(),
  approvalFlow: z.enum([
    "REPORTING_MANAGER",
    "HR",
    "REPORTING_MANAGER_THEN_HR",
  ]),
  attachmentRequired: z.boolean(),
  reasonMandatory: z.boolean(),
});

export type CreateAttendanceRegularizationPolicyDto = z.infer<
  typeof AttendanceRegularizationPolicySchema
>;

export type UpdateAttendanceRegularizationPolicyDto =
  Partial<CreateAttendanceRegularizationPolicyDto>;
