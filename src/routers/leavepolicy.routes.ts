import { Router } from "express";
import { LeavePolicyController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";

const router = Router();
const leavepolicy = new LeavePolicyController();

// ── Create
router.post(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leavepolicy.createLeavePolicyController(req, res, next),
  ),
);

// ── Get All
router.get(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leavepolicy.getLeavePolicyController(req, res, next),
  ),
);

// ── Get By Type
router.get(
  "/type/:leaveTypeName",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leavepolicy.getLeavePolicyByTypeController(req, res, next),
  ),
);

// ── Edit
router.patch(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leavepolicy.editLeavePolicyController(req, res, next),
  ),
);

// ── Delete
router.delete(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    leavepolicy.deleteLeavePolicyController(req, res, next),
  ),
);

export default router;
