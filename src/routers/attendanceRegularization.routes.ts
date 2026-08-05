// routes/attendanceRegularization.routes.ts

import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence"; // adjust import
import { Asyncwrapper } from "../common/middleware"; // adjust import
import { AttendanceRegularizationController } from "../controller";

const router = Router();
const controller = new AttendanceRegularizationController();

// Create Draft
router.post(
  "/draft",
  authenticate,
  Asyncwrapper((req, res, next) => controller.createDraft(req, res, next)),
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

// Get By Id
router.get(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getById(req, res, next)),
);

// List For Employee
router.get(
  "/employee/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) => controller.listForEmployee(req, res, next)),
);

// List Pending For Approver
router.get(
  "/pending",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.listPendingForApprover(req, res, next),
  ),
);

router.get(
  "/status/:status",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByStatus(req, res, next)),
);

router.get(
  "/date",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByDate(req, res, next)),
);

router.get(
  "/month",
  authenticate,
  Asyncwrapper((req, res, next) => controller.getByMonth(req, res, next)),
);

router.get(
  "/employee/:employeeId/status/:status",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.getByEmployeeAndStatus(req, res, next),
  ),
);

router.get(
  "/payroll",
  authenticate,
  Asyncwrapper((req, res, next) =>
    controller.getForPayrollPeriod(req, res, next),
  ),
);

router.get(
  "/pending/count",
  authenticate,
  Asyncwrapper((req, res, next) => controller.countPending(req, res, next)),
);

router.get(
  "/dashboard/stats",
  authenticate,
  Asyncwrapper((req, res, next) => controller.dashboardStats(req, res, next)),
);

export default router;
