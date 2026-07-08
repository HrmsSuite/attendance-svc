import { Router } from "express";
import { authenticate, authorizeRoles } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";
import { AttendanceController } from "../controller";

const router = Router();
const attendance = new AttendanceController();

// ── Check In
router.post(
  "/check-in",
  authenticate,
  Asyncwrapper((req, res, next) =>
    attendance.checkInController(req, res, next),
  ),
);

// ── Check Out
router.post(
  "/check-out",
  authenticate,
  Asyncwrapper((req, res, next) =>
    attendance.checkOutController(req, res, next),
  ),
);

// ── Get Today Summary
router.get(
  "/today-summary",
  authenticate,
  Asyncwrapper((req, res, next) =>
    attendance.getTodaySummaryController(req, res, next),
  ),
);

router.get(
  "/employee/:employeeId/today-summary",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendance.getEmployeeTodaySummaryController(req, res, next),
  ),
);

router.get(
  "/employee/:employeeId/history",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendance.getEmployeeHistoryController(req, res, next),
  ),
);
// ── Get History
router.get(
  "/history",
  authenticate,
  Asyncwrapper((req, res, next) =>
    attendance.getHistoryController(req, res, next),
  ),
);

// ── Run Auto Punch Out (typically called by scheduled job)
router.post(
  "/auto-punch-out",
  authenticate,
  Asyncwrapper((req, res, next) =>
    attendance.runAutoPunchOutController(req, res, next),
  ),
);

router.get(
  "/company/history",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendance.getCompanyHistoryController(req, res, next),
  ),
);

router.get(
  "/employee/:employeeId/events",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendance.getEmployeeEventsHistoryController(req, res, next),
  ),
);

router.get(
  "/company/events",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendance.getCompanyEventsHistoryController(req, res, next),
  ),
);

export default router;
