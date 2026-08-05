// attendanceRegularization.zod.ts

import { z } from "zod";
import { RegularizationType, RequestSource } from "@hrmssuite/persistence";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(255),

  fileUrl: z.string().trim().url("Invalid attachment URL"),
});

export const createAttendanceRegularizationSchema = z
  .object({
    attendanceDailyId: z.string().regex(objectIdRegex, "Invalid attendance id"),

    requestedCheckIn: z.coerce.date().optional(),

    requestedCheckOut: z.coerce.date().optional(),

    regularizationType: z.nativeEnum(RegularizationType),

    requestSource: z.nativeEnum(RequestSource).default(RequestSource.WEB),

    reason: z
      .string()
      .trim()
      .min(5, "Reason must be at least 5 characters")
      .max(500, "Reason cannot exceed 500 characters"),

    attachments: z
      .array(attachmentSchema)
      .max(5, "Maximum 5 attachments allowed")
      .optional(),
  })
  .superRefine((data, ctx) => {
    switch (data.regularizationType) {
      case RegularizationType.CHECK_IN:
        if (!data.requestedCheckIn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckIn"],
            message: "Requested check-in is required.",
          });
        }
        break;

      case RegularizationType.CHECK_OUT:
        if (!data.requestedCheckOut) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckOut"],
            message: "Requested check-out is required.",
          });
        }
        break;

      case RegularizationType.BOTH:
        if (!data.requestedCheckIn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckIn"],
            message: "Requested check-in is required.",
          });
        }

        if (!data.requestedCheckOut) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckOut"],
            message: "Requested check-out is required.",
          });
        }

        if (
          data.requestedCheckIn &&
          data.requestedCheckOut &&
          data.requestedCheckIn >= data.requestedCheckOut
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckOut"],
            message: "Requested check-out must be after requested check-in.",
          });
        }
        break;

      case RegularizationType.MISSED_PUNCH:
        if (!data.requestedCheckIn && !data.requestedCheckOut) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["requestedCheckIn"],
            message: "Provide at least one requested punch time.",
          });
        }
        break;
    }
  });

export type CreateAttendanceRegularizationDto = z.infer<
  typeof createAttendanceRegularizationSchema
>;

export const updateAttendanceRegularizationSchema =
  createAttendanceRegularizationSchema.partial();

export type UpdateAttendanceRegularizationDto = z.infer<
  typeof updateAttendanceRegularizationSchema
>;
