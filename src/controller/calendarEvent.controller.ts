import {
  EVENT_STATUS,
  EVENT_TYPES,
  ICalendarEvent,
} from "@hrmssuite/persistence";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { Apperror } from "../common/errorhandlers";
import { CalendarEventServices } from "../services";
import {
  CalendarEventDateRangeQuery,
  CalendarEventIdParams,
  CalendarEventStatusParams,
  CalendarEventTypeParams,
  GetAllCalendarEventParams,
  IndividualCalendarEventParams,
} from "../typings";
import { CalendarEventStatus } from "../helpers";

export class CalendarEventController {
  private readonly calendarEventControl: CalendarEventServices;

  constructor() {
    this.calendarEventControl = new CalendarEventServices();
  }

  /**
   * Creates a new calendar event.
   *
   * @param req Express request containing calendar event data.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async createCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!req.user?.id) {
        throw new Apperror("User authentication is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new Apperror("Invalid user ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user.id);

      const created =
        await this.calendarEventControl.createCalendarEventServices(
          req.body,
          companyId,
          userId,
        );

      res.status(201).json({
        success: true,
        message: "Calendar event created successfully",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets paginated calendar events.
   *
   * @param req Express request containing pagination and filter parameters.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getAllCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);

      const params: GetAllCalendarEventParams = {
        page: typeof req.query.page === "string" ? req.query.page : undefined,

        limit:
          typeof req.query.limit === "string" ? req.query.limit : undefined,

        search:
          typeof req.query.search === "string" ? req.query.search : undefined,

        eventType:
          typeof req.query.eventType === "string"
            ? (req.query.eventType as ICalendarEvent["eventType"])
            : undefined,

        departmentId:
          typeof req.query.departmentId === "string"
            ? req.query.departmentId
            : undefined,

        employeeId:
          typeof req.query.employeeId === "string"
            ? req.query.employeeId
            : undefined,

        startDate:
          typeof req.query.startDate === "string"
            ? req.query.startDate
            : undefined,

        endDate:
          typeof req.query.endDate === "string" ? req.query.endDate : undefined,
      };

      const events =
        await this.calendarEventControl.getAllCalendarEventServices(
          companyId,
          params,
        );

      res.status(200).json({
        success: true,
        message: "Calendar events fetched successfully",
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets a calendar event by ID.
   *
   * @param req Express request containing the event ID.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getCalendarEventByIdController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const params = req.params as Partial<CalendarEventIdParams>;
      const id = params.id;

      if (!id) {
        throw new Apperror("Event ID is required", 400);
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new Apperror("Invalid event ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);

      const event =
        await this.calendarEventControl.getCalendarEventByIdServices(
          id,
          companyId,
        );

      res.status(200).json({
        success: true,
        message: "Calendar event fetched successfully",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets published calendar events by event type.
   *
   * @param req Express request containing the event type.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getCalendarEventByTypeController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const params = req.params as Partial<CalendarEventTypeParams>;
      const eventType = params.eventType;

      if (!eventType) {
        throw new Apperror("Event type is required", 400);
      }

      if (!EVENT_TYPES.includes(eventType as ICalendarEvent["eventType"])) {
        throw new Apperror("Invalid event type", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);

      const events =
        await this.calendarEventControl.getCalendarEventByTypeServices(
          eventType as ICalendarEvent["eventType"],
          companyId,
        );

      res.status(200).json({
        success: true,
        message: "Calendar events fetched successfully",
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets published events applicable to an employee.
   *
   * @param req Express request containing department and employee IDs.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getIndividualEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const params = req.params as Partial<IndividualCalendarEventParams>;

      const departmentId = params.departmentId;
      const employeeId = params.employeeId;

      if (!departmentId) {
        throw new Apperror("Department ID is required", 400);
      }

      if (!employeeId) {
        throw new Apperror("Employee ID is required", 400);
      }

      if (!Types.ObjectId.isValid(departmentId)) {
        throw new Apperror("Invalid department ID", 400);
      }

      if (!Types.ObjectId.isValid(employeeId)) {
        throw new Apperror("Invalid employee ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);
      const departmentObjectId = new Types.ObjectId(departmentId);
      const employeeObjectId = new Types.ObjectId(employeeId);

      const events = await this.calendarEventControl.getIndividualEventServices(
        companyId,
        departmentObjectId,
        employeeObjectId,
      );

      res.status(200).json({
        success: true,
        message: "Individual calendar events fetched successfully",
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets published calendar events overlapping a date range.
   *
   * @param req Express request containing startDate and endDate query values.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getCalendarEventsByDateRangeController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const query = req.query as unknown as CalendarEventDateRangeQuery;

      const startDate = query.startDate;
      const endDate = query.endDate;

      if (!startDate) {
        throw new Apperror("Start date is required", 400);
      }

      if (!endDate) {
        throw new Apperror("End date is required", 400);
      }

      const parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);

      const parsedEndDate = new Date(`${endDate}T23:59:59.999Z`);

      if (Number.isNaN(parsedStartDate.getTime())) {
        throw new Apperror("Invalid start date", 400);
      }

      if (Number.isNaN(parsedEndDate.getTime())) {
        throw new Apperror("Invalid end date", 400);
      }

      if (parsedEndDate < parsedStartDate) {
        throw new Apperror(
          "End date must be greater than or equal to start date",
          400,
        );
      }

      const companyId = new Types.ObjectId(req.companyId);

      const events =
        await this.calendarEventControl.getCalendarEventsByDateRangeServices(
          companyId,
          parsedStartDate,
          parsedEndDate,
        );

      res.status(200).json({
        success: true,
        message: "Calendar events fetched successfully",
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets calendar dashboard information.
   *
   * @param req Express request containing the authenticated company ID.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async getCalendarDashboardController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);

      const dashboard =
        await this.calendarEventControl.getCalendarDashboardServices(companyId);

      res.status(200).json({
        success: true,
        message: "Calendar dashboard fetched successfully",
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a calendar event.
   *
   * @param req Express request containing event ID and update payload.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async editCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!req.user?.id) {
        throw new Apperror("User authentication is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new Apperror("Invalid user ID", 400);
      }

      const params = req.params as Partial<CalendarEventIdParams>;
      const id = params.id;

      if (!id) {
        throw new Apperror("Event ID is required", 400);
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new Apperror("Invalid event ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user.id);

      const updated = await this.calendarEventControl.editCalendarEventServices(
        id,
        req.body,
        companyId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Calendar event updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a calendar event status.
   *
   * Supported transitions are enforced by the service:
   * - draft -> published
   * - draft -> cancelled
   *
   * @param req Express request containing event ID and status.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async updateCalendarEventStatusController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!req.user?.id) {
        throw new Apperror("User authentication is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new Apperror("Invalid user ID", 400);
      }

      const params = req.params as Partial<CalendarEventStatusParams>;

      const id = params.id;
      const status = params.status;

      if (!id) {
        throw new Apperror("Event ID is required", 400);
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new Apperror("Invalid event ID", 400);
      }

      if (!status) {
        throw new Apperror("Event status is required", 400);
      }

      if (!EVENT_STATUS.includes(status as ICalendarEvent["scope"]["status"])) {
        throw new Apperror("Invalid calendar event status", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user.id);

      const updated =
        await this.calendarEventControl.updateCalendarEventStatusServices(
          id,
          companyId,
          status as CalendarEventStatus,
          userId,
        );

      res.status(200).json({
        success: true,
        message: "Calendar event status updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft deletes a calendar event.
   *
   * @param req Express request containing event ID.
   * @param res Express response.
   * @param next Express error handler.
   */
  public async deleteCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.companyId) {
        throw new Apperror("Company ID is required", 401);
      }

      if (!req.user?.id) {
        throw new Apperror("User authentication is required", 401);
      }

      if (!Types.ObjectId.isValid(req.companyId)) {
        throw new Apperror("Invalid company ID", 400);
      }

      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new Apperror("Invalid user ID", 400);
      }

      const params = req.params as Partial<CalendarEventIdParams>;
      const id = params.id;

      if (!id) {
        throw new Apperror("Event ID is required", 400);
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new Apperror("Invalid event ID", 400);
      }

      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user.id);

      const deleted =
        await this.calendarEventControl.deleteCalendarEventServices(
          id,
          companyId,
          userId,
        );

      res.status(200).json({
        success: true,
        message: "Calendar event deleted successfully",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
}
