import { z } from "zod";
import {
  EVENT_TYPES,
  HOLIDAY_CATEGORIES,
  RECURRENCE_TYPES,
  APPLICABLE_TO,
  VISIBILITY,
  EVENT_STATUS,
} from "@hrmssuite/persistence";

// ── Audit Sub Schema
const AuditZodSchema = z.object({
  createdBy: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
  createdAt: z.date().default(() => new Date()),
  updatedBy: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
  updatedAt: z.date().default(() => new Date()),
});

// ── Classification Sub Schema
const ClassificationZodSchema = z.object({
  category: z.enum([...HOLIDAY_CATEGORIES]),
  recurrence: z.enum([...RECURRENCE_TYPES]).default("none"),
  recurrenceEndDate: z.date().optional(),
  applicableTo: z.enum([...APPLICABLE_TO]).default("All"),
  departmentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId").optional(),
  employeeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId").optional(),
})
.refine(
  (data) => !(data.applicableTo === "Department" && !data.departmentId),
  { message: "departmentId required when applicableTo is Department", path: ["departmentId"] },
)
.refine(
  (data) => !(data.applicableTo === "Individual" && !data.employeeId),
  { message: "employeeId required when applicableTo is Individual", path: ["employeeId"] },
);

// ── Scope Sub Schema
const ScopeZodSchema = z.object({
  departmentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId").optional(),
  employeeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId").optional(),
  visibility: z.enum([...VISIBILITY]).default("public"),
  status: z.enum([...EVENT_STATUS]).default("draft"),
});

// ── Base Schema
const CalendarEventBaseSchema = z.object({
  companyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
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

// ── Full Schema with refines (CREATE)
export const CalendarEventZodSchema = CalendarEventBaseSchema
  .refine(
    (data) => data.endDate >= data.startDate,
    { message: "endDate must be after startDate", path: ["endDate"] },
  )
  .refine(
    (data) => !(data.isFullDay === false && !data.startTime),
    { message: "startTime required when isFullDay is false", path: ["startTime"] },
  )
  .refine(
    (data) => !(data.isFullDay === false && !data.endTime),
    { message: "endTime required when isFullDay is false", path: ["endTime"] },
  );

// ── Partial Schema (PATCH)
export const CalendarEventPartialSchema = CalendarEventBaseSchema.partial();

// ── Types
export type CalendarEventInput = z.infer<typeof CalendarEventZodSchema>;
export type CalendarEventPartialInput = z.infer<typeof CalendarEventPartialSchema>;