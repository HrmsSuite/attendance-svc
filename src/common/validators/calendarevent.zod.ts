import { z } from "zod";
import { Types } from "mongoose";
import {
  EVENT_TYPES,
  HOLIDAY_CATEGORIES,
  RECURRENCE_TYPES,
  APPLICABLE_TO,
  VISIBILITY,
  EVENT_STATUS,
} from "@hrmssuite/persistence";

/**
 * Validates and transforms a MongoDB ObjectId string.
 */
const ObjectIdZodSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId")
  .transform((value) => new Types.ObjectId(value));

/**
 * Audit information.
 *
 * Audit fields are normally controlled by the service/DAO layer and should
 * not be trusted directly from API input.
 */
const AuditZodSchema = z.object({
  createdBy: ObjectIdZodSchema,
  createdAt: z.coerce.date().default(() => new Date()),
  updatedBy: ObjectIdZodSchema,
  updatedAt: z.coerce.date().default(() => new Date()),
});

/**
 * Calendar event classification.
 */
const ClassificationZodSchema = z
  .object({
    category: z.enum([...HOLIDAY_CATEGORIES]),
    recurrence: z.enum([...RECURRENCE_TYPES]).default("none"),
    recurrenceEndDate: z.coerce.date().optional(),
    applicableTo: z.enum([...APPLICABLE_TO]).default("All"),

    departmentId: ObjectIdZodSchema.optional(),

    employeeId: ObjectIdZodSchema.optional(),
  })
  .refine(
    (data) => !(data.applicableTo === "Department" && !data.departmentId),
    {
      message: "departmentId required when applicableTo is Department",
      path: ["departmentId"],
    },
  )
  .refine((data) => !(data.applicableTo === "Individual" && !data.employeeId), {
    message: "employeeId required when applicableTo is Individual",
    path: ["employeeId"],
  });

/**
 * Calendar event scope.
 */
const ScopeZodSchema = z.object({
  departmentId: ObjectIdZodSchema.optional(),

  employeeId: ObjectIdZodSchema.optional(),

  visibility: z.enum([...VISIBILITY]).default("public"),

  status: z.enum([...EVENT_STATUS]).default("draft"),
});

/**
 * Base calendar event schema.
 */
const CalendarEventBaseSchema = z.object({
  companyId: ObjectIdZodSchema,

  eventName: z.string().min(1, "Event name is required").trim(),

  eventType: z.enum([...EVENT_TYPES]),

  startDate: z.coerce.date(),

  endDate: z.coerce.date(),

  isFullDay: z.boolean().default(true),

  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format")
    .optional(),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format")
    .optional(),

  description: z.string().trim().optional(),

  classification: ClassificationZodSchema,

  scope: ScopeZodSchema,

  audit: AuditZodSchema.optional(),

  isActive: z.boolean().default(true),
});

/**
 * Complete calendar event schema used during creation.
 *
 * Business rules:
 * - endDate cannot be before startDate.
 * - startTime is required for non-full-day events.
 * - endTime is required for non-full-day events.
 */
export const CalendarEventZodSchema = CalendarEventBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "endDate must be after startDate",
    path: ["endDate"],
  },
)
  .refine((data) => !(data.isFullDay === false && !data.startTime), {
    message: "startTime required when isFullDay is false",
    path: ["startTime"],
  })
  .refine((data) => !(data.isFullDay === false && !data.endTime), {
    message: "endTime required when isFullDay is false",
    path: ["endTime"],
  });

/**
 * Partial calendar event schema used for PATCH operations.
 */
export const CalendarEventPartialSchema = CalendarEventBaseSchema.partial();

/**
 * Input type after Zod validation/transformation.
 *
 * ObjectId string fields are transformed into Types.ObjectId.
 */
export type CalendarEventInput = z.infer<typeof CalendarEventZodSchema>;

/**
 * Partial input type after Zod validation/transformation.
 */
export type CalendarEventPartialInput = z.infer<
  typeof CalendarEventPartialSchema
>;
