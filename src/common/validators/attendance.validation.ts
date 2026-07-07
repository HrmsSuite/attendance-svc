import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid ObjectId");

// ─── Check-in ─────────────────────────────────────────────────────────────────

export const checkInSchema = z.object({
  shiftId: objectIdSchema,
  /**
   * Optional override — defaults to server `now`.
   * Useful for kiosk devices that may buffer punches offline.
   */
  eventTime: z.coerce.date().optional(),
  source: z
    .enum(["WEB", "MOBILE", "KIOSK", "BIOMETRIC"])
    .default("WEB"),
  notes: z.string().max(500).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

// ─── Check-out ────────────────────────────────────────────────────────────────

export const checkOutSchema = z.object({
  eventTime: z.coerce.date().optional(),
  source: z
    .enum(["WEB", "MOBILE", "KIOSK", "BIOMETRIC", "AUTO"])
    .default("WEB"),
  notes: z.string().max(500).optional(),
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;

// ─── Query schemas ────────────────────────────────────────────────────────────

export const historyQuerySchema = z
  .object({
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
  })
  .refine((d) => d.fromDate <= d.toDate, {
    message: "fromDate must be before or equal to toDate",
    path: ["fromDate"],
  });

export type HistoryQuery = z.infer<typeof historyQuerySchema>;