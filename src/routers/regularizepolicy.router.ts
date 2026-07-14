import { Router } from "express";
import { authenticate, authorizeRoles } from "@hrmssuite/persistence";

import { AttendanceRegularizationPolicyController } from "../controller";
import { Asyncwrapper } from "../common/middleware";

const router = Router();

const attendanceRegularizationPolicy =
  new AttendanceRegularizationPolicyController();

// ── Create
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendanceRegularizationPolicy.createAttendanceRegularizationPolicyController(
      req,
      res,
      next,
    ),
  ),
);

// ── Get
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendanceRegularizationPolicy.getAttendanceRegularizationPolicyController(
      req,
      res,
      next,
    ),
  ),
);

// ── Update
router.patch(
  "/",
  authenticate,
  authorizeRoles("admin"),
  Asyncwrapper((req, res, next) =>
    attendanceRegularizationPolicy.updateAttendanceRegularizationPolicyController(
      req,
      res,
      next,
    ),
  ),
);

export default router;
