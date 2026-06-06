import { Router } from "express";
import leavepolicy from "./leavepolicy.routes";
import calendarEvent from "./calendarEvent.routes";
import leaverequest from "./leaverequest.router";
import leavebalance from "./leavebalance.routes";
const router = Router();

const apiPath = "/api/v1";

router.use(`${apiPath}/leavepolicy/`, leavepolicy);
router.use(`${apiPath}/events/`, calendarEvent);
router.use(`${apiPath}/leaverequest/`, leaverequest);
router.use(`${apiPath}/leavebalance/`, leavebalance);
export default router;
