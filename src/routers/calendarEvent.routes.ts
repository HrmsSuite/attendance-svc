import { Router } from "express"; 
import { authenticate } from "@hrmssuite/persistence";
import { Asyncwrapper } from "../common/middleware";
import { CalendarEventController } from "../controller";

const router = Router();
const CalendarEvent = new CalendarEventController();

// ── Create
router.post(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.createCalendarEventController(req, res, next),
  ),
);

// ── Get All
router.get(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getAllCalendarEventController(req, res, next),
  ),
);

// ── Get By Type
router.get(
  "/type/:eventType",       // CalendarEvent leaveTypeName → eventType
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarEventByTypeController(req, res, next),
  ),
);

// ── Get Individual (employee calendar view)  CalendarEvent missing route
router.get(
  "/individual/:departmentId/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getIndividualEventController(req, res, next),
  ),
);

// ── Get By Id  CalendarEvent missing route — always last (specific routes before dynamic)
router.get(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarEventByIdController(req, res, next),
  ),
);

// ── Edit
router.patch(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.editCalendarEventController(req, res, next),
  ),
);

// ── Delete
router.delete(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.deleteCalendarEventController(req, res, next),
  ),
);

export default router;