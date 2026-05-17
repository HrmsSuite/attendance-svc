import { ICalendarEvent } from "@hrmssuite/persistence";
import { NextFunction, Request, Response } from "express";
import { CalendarEventServices } from "../services";
import { Types } from "mongoose";
import { Apperror } from "../common/errorhandlers";

export class CalendarEventController {
  private calendarEventControl: CalendarEventServices;

  constructor() {
    this.calendarEventControl = new CalendarEventServices();
  }

  // ── Create
  public async createCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);

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

  // ── Get All
  public async getAllCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const events =
        await this.calendarEventControl.getAllCalendarEventServices(companyId);

      res.status(200).json({
        success: true,
        message: "Calendar events fetched successfully",
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get By Id
  public async getCalendarEventByIdController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const id = req.params.id as string;

      if (!id) {
        throw new Apperror("Unauthorized", 401);
      }

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

  // ── Get By Type
  public async getCalendarEventByTypeController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const { eventType } = req.params;

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

  // ── Get Individual (employee calendar view)
  public async getIndividualEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const departmentId = req.params.departmentId as string;
      const employeeId = req.params.employeeId as string;

      if (!departmentId || !employeeId) {
        throw new Apperror("departmentId and employeeId are required", 400);
      }

      const events = await this.calendarEventControl.getIndividualEventServices(
        companyId,
        new Types.ObjectId(departmentId),
        new Types.ObjectId(employeeId),
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

  // ── Edit
  public async editCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);
      const id = req.params.id as string;

      if (!id) {
        throw new Apperror("Event id is required", 400);
      }

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

  // ── Delete
  public async deleteCalendarEventController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);
      const id = req.params.id as string;

      if (!id) {
        throw new Apperror("Event id is required", 400);
      }

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
