import { Router } from "express";
import { LeaveBalanceController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";

const router = Router();
const leaveBalance = new LeaveBalanceController();

// ── Get All
router.get(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveBalance.getAllLeaveBalance(req, res, next),
  ),
);

router.get(
  "/my-leave-balance",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveBalance.getMyLeaveBalance(req, res, next),
  ),
);

// ── Get By Employee
router.get(
  "/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leaveBalance.getLeaveBalanceById(req, res, next),
  ),
);

export default router;
