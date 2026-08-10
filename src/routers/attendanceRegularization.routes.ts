// routes/attendanceRegularization.routes.ts

import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";
import { AttendanceRegularizationController } from "../controller";

const router = Router();
const controller = new AttendanceRegularizationController();

// Create Draft
router.post(
  "/draft",
  authenticate,
  Asyncwrapper((req, res, next) => controller.createDraft(req, res, next)),
);

router.get(
  "/all",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.listAllForCompany(req, res, next),
  ),
);

// Update Draft
router.patch(
  "/:id/draft",
  authenticate,
  Asyncwrapper((req, res, next) => controller.updateDraft(req, res, next)),
);

// Submit Draft
router.post(
  "/:id/submit",
  authenticate,
  Asyncwrapper((req, res, next) => controller.submitDraft(req, res, next)),
);

// Withdraw
router.post(
  "/:id/withdraw",
  authenticate,
  Asyncwrapper((req, res, next) => controller.withdraw(req, res, next)),
);

// Approve
router.post(
  "/:id/approve",
  authenticate,
  Asyncwrapper((req, res, next) => controller.approve(req, res, next)),
);

// Reject
router.post(
  "/:id/reject",
  authenticate,
  Asyncwrapper((req, res, next) => controller.reject(req, res, next)),
);

// Pending count must come before /pending
router.get(
  "/pending/count",
  authenticate,
  Asyncwrapper((req, res, next) => controller.countPending(req, res, next)),
);

// Dashboard stats
router.get(
  "/dashboard/stats",
  authenticate,
  Asyncwrapper((req, res, next) => controller.dashboardStats(req, res, next)),
);

// Pending requests
router.get(
  "/pending",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.listPendingForApprover(req, res, next),
  ),
);

// Employee requests by employee ID and status
router.get(
  "/employee/:employeeId/status/:status",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.getByEmployeeAndStatus(req, res, next),
  ),
);

router.get(
  "/my-regularization",
  authenticate,
  Asyncwrapper((req, res, next) => controller.listMyRequests(req, res, next)),
);

// Employee requests
router.get(
  "/employee/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) => controller.listForEmployee(req, res, next)),
);

// Requests by status
router.get(
  "/status/:status",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByStatus(req, res, next)),
);

// Requests by date
router.get(
  "/date",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByDate(req, res, next)),
);

// Requests by month
router.get(
  "/month",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByMonth(req, res, next)),
);

// Requests for payroll period
router.get(
  "/payroll",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.getForPayrollPeriod(req, res, next),
  ),
);

// Get request by ID
router.get(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getById(req, res, next)),
);

export default router;
