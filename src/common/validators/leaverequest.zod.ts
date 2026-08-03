import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string(),
    leavePolicyId: z.string(),

    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid startDate",
    }),

    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid endDate",
    }),

    totalDays: z
      .number()
      .min(0.5)
      .refine((val) => val % 0.5 === 0, {
        message: "totalDays must be in increments of 0.5",
      }),

    isHalfDay: z.boolean().optional(),

    halfDaySession: z.enum(["morning", "afternoon"]).optional(),

    reason: z.string().min(1, "Reason is required"),

    attachmentUrl: z.string().optional(),

    handoverEmployeeId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.totalDays % 1 !== 0) {
        return !!data.halfDaySession;
      }
      return true;
    },
    {
      message: "halfDaySession is required for half-day leave",
      path: ["halfDaySession"],
    },
  );

export const approveLeaveRequestSchema = z.object({
  leaveRequestId: z.string(),

  approverId: z.string(),

  action: z.enum(["approved", "rejected", "escalated"]),

  remarks: z.string().optional(),
});

export const cancelLeaveRequestSchema = z.object({
  leaveRequestId: z.string(),

  employeeId: z.string(),

  cancelReason: z.string().optional(),
});

export const withdrawLeaveRequestSchema = z.object({
  leaveRequestId: z.string(),

  employeeId: z.string(),

  cancelReason: z.string().optional(),
});

export const getPendingApprovalsSchema = z.object({
  approverId: z.string(),
});

export const getTeamLeaveSchema = z.object({
  managerId: z.string(),
});

export const getLeaveByIdSchema = z.object({
  leaveRequestId: z.string(),
});

export const getLeaveCalendarSchema = z.object({
  companyId: z.string(),

  employeeId: z.string().optional(),

  startDate: z.string().optional(),

  endDate: z.string().optional(),
});
