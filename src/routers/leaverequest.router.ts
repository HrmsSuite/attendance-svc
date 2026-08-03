import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";
import { LeaveRequestController } from "../controller/leaverequest.controller";

const router = Router();
const leaveRequest = new LeaveRequestController();

// ─────────────────────────────
// CREATE LEAVE REQUEST
// ─────────────────────────────
router.post(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.createLeaveRequest(req, res, next),
  ),
);

// ─────────────────────────────
// APPROVE / REJECT
// ─────────────────────────────
router.patch(
  "/approve",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.approveLeaveRequest(req, res, next),
  ),
);

// ─────────────────────────────
// CANCEL LEAVE
// ─────────────────────────────
router.patch(
  "/cancel",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.cancelLeaveRequest(req, res, next),
  ),
);

// ─────────────────────────────
// WITHDRAW LEAVE
// ─────────────────────────────
router.patch(
  "/withdraw",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.withdrawLeaveRequest(req, res, next),
  ),
);

// ─────────────────────────────
// GET TEAM LEAVES (Manager)
// ─────────────────────────────
router.get(
  "/team/:managerId",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getTeamLeaveRequests(req, res, next),
  ),
);

// ─────────────────────────────
// GET EMPLOYEE HISTORY
// ─────────────────────────────
router.get(
  "/history/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getEmployeeLeaveHistory(req, res, next),
  ),
);

// ─────────────────────────────
// GET ALL LEAVE REQUESTS (Admin)
// ─────────────────────────────
router.get(
  "/all",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getAllLeaveRequests(req, res, next),
  ),
);

// ─────────────────────────────
// GET ADMIN PENDING APPROVALS
// ─────────────────────────────
router.get(
  "/admin/pending",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getAdminPendingApprovals(req, res, next),
  ),
);

// ─────────────────────────────
// CALENDAR VIEW
// ─────────────────────────────
router.get(
  "/calendar",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getLeaveCalendar(req, res, next),
  ),
);

// ─────────────────────────────
// GET BY ID
// ─────────────────────────────
router.get(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveRequest.getLeaveRequestById(req, res, next),
  ),

  // GET MY PENDING APPROVALS (Manager / Approver)
  router.get(
    "/pending",
    authenticate,
    Asyncwrapper((req, res, next) =>
      leaveRequest.getMyPendingApprovals(req, res, next),
    ),
  ),
);

export default router;
