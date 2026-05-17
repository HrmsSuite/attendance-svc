import { Router } from "express";
import leavepolicy from "./leavepolicy.routes";
import calendarEvent from "./calendarEvent.routes"
const router = Router();

const apiPath = "/api/v1";

router.use(`${apiPath}/leavepolicy/`, leavepolicy);
router.use(`${apiPath}/events/`, calendarEvent);
export default router;
