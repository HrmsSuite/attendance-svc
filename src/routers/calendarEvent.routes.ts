import { Router } from "express";

import { authenticate } from "@hrmssuite/persistence";

import { Asyncwrapper } from "../common/middleware";
import { CalendarEventController } from "../controller";

const router = Router();

const CalendarEvent = new CalendarEventController();

/**
 * Creates a new calendar event.
 *
 * @params req.body Calendar event payload
 */
router.post(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.createCalendarEventController(req, res, next),
  ),
);

/**
 * Gets paginated calendar events.
 *
 * @params req.query.page Page number
 * @params req.query.limit Number of records per page
 * @params req.query.search Search term
 * @params req.query.eventType Event type
 * @params req.query.departmentId Department identifier
 * @params req.query.employeeId Employee identifier
 * @params req.query.startDate Start date
 * @params req.query.endDate End date
 */
router.get(
  "/",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getAllCalendarEventController(req, res, next),
  ),
);

/**
 * Gets calendar events by event type.
 *
 * @params req.params.eventType Event type
 */
router.get(
  "/type/:eventType",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarEventByTypeController(req, res, next),
  ),
);

/**
 * Gets published events applicable to an employee.
 *
 * @params req.params.departmentId Employee department identifier
 * @params req.params.employeeId Employee identifier
 */
router.get(
  "/individual/:departmentId/:employeeId",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getIndividualEventController(req, res, next),
  ),
);

/**
 * Gets calendar events overlapping a date range.
 *
 * @params req.query.startDate Range start date
 * @params req.query.endDate Range end date
 */
router.get(
  "/date-range",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarEventsByDateRangeController(req, res, next),
  ),
);

/**
 * Gets calendar dashboard information.
 *
 * @params req No route parameters
 */
router.get(
  "/dashboard",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarDashboardController(req, res, next),
  ),
);

/**
 * Updates a calendar event status.
 *
 * @params req.params.id Calendar event identifier
 * @params req.params.status New calendar event status
 */
router.patch(
  "/:id/status/:status",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.updateCalendarEventStatusController(req, res, next),
  ),
);

/**
 * Gets a calendar event by ID.
 *
 * @params req.params.id Calendar event identifier
 */
router.get(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.getCalendarEventByIdController(req, res, next),
  ),
);

/**
 * Updates a calendar event.
 *
 * @params req.params.id Calendar event identifier
 * @params req.body Calendar event fields to update
 */
router.patch(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.editCalendarEventController(req, res, next),
  ),
);

/**
 * Soft deletes a calendar event.
 *
 * @params req.params.id Calendar event identifier
 */
router.delete(
  "/:id",
  authenticate,
  Asyncwrapper((req, res, next) =>
    CalendarEvent.deleteCalendarEventController(req, res, next),
  ),
);

export default router;
