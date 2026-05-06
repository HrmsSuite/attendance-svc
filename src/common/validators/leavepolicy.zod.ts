import { GENDER_ELIGIBILITY, LEAVE_TYPE_NAMES } from "@hrmssuite/persistence";
import { z } from "zod";

// ── Audit Sub Schema
const AuditZodSchema = z.object({
  createdBy: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
  createdAt: z.date().default(() => new Date()),
  updatedBy: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
  updatedAt: z.date().default(() => new Date()),
});

// ── Base Schema (ZodObject — supports .partial())
const LeavePolicyBaseSchema = z.object({
  companyId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId"),
  leaveTypeName: z.enum([...LEAVE_TYPE_NAMES]),
  maxDaysPerYear: z.number().min(0),
  maxDaysPerMonth: z.number().min(0).nullable().optional(),
  maxDaysPerApplication: z.number().min(0).nullable().optional(),
  minDaysPerApplication: z.number().min(0.5).default(0.5),
  carryForwardAllowed: z.boolean().default(false),
  maxCarryForwardDays: z.number().min(0).nullable().optional(),
  encashmentAllowed: z.boolean().default(false),
  maxEncashmentDays: z.number().min(0).nullable().optional(),
  genderEligibility: z.enum([...GENDER_ELIGIBILITY]).default("all"),
  probationEligible: z.boolean().default(false),
  minServiceDays: z.number().min(0).default(0),
  advanceNoticeDays: z.number().min(0).default(0),
  backdatedAllowed: z.boolean().default(false),
  maxBackdatedDays: z.number().min(0).nullable().optional(),
  approvalLevels: z.union([z.literal(1), z.literal(2)]).default(2),
  audit: AuditZodSchema.optional(),
  isActive: z.boolean().default(true),
});

// ── Full Schema — reuse base, add refines (used for CREATE)
export const LeavePolicyZodSchema = LeavePolicyBaseSchema  // ✅ no duplicate z.object()
  .refine(
    (data) => !(data.carryForwardAllowed && !data.maxCarryForwardDays),
    { message: "maxCarryForwardDays required when carryForwardAllowed is true", path: ["maxCarryForwardDays"] },
  )
  .refine(
    (data) => !(data.encashmentAllowed && !data.maxEncashmentDays),
    { message: "maxEncashmentDays required when encashmentAllowed is true", path: ["maxEncashmentDays"] },
  )
  .refine(
    (data) => !(data.backdatedAllowed && !data.maxBackdatedDays),
    { message: "maxBackdatedDays required when backdatedAllowed is true", path: ["maxBackdatedDays"] },
  )
  .refine(
    (data) => !(data.maxDaysPerApplication && data.maxDaysPerApplication > data.maxDaysPerYear),
    { message: "maxDaysPerApplication cannot exceed maxDaysPerYear", path: ["maxDaysPerApplication"] },
  );

// ── Partial Schema — base only, no refines (used for PATCH)
export const LeavePolicyPartialSchema = LeavePolicyBaseSchema.partial();

// ── Types
export type LeavePolicyInput = z.infer<typeof LeavePolicyZodSchema>;
export type LeavePolicyPartialInput = z.infer<typeof LeavePolicyPartialSchema>;