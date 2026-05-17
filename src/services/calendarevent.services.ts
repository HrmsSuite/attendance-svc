import { ICalendarEvent } from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { CalendarEventDao } from "../daos";
import { CalendarEventZodSchema, CalendarEventPartialSchema } from "../common/validators";
import { Apperror } from "../common/errorhandlers";

export class CalendarEventServices {
  private calendarEvent: CalendarEventDao;

  constructor() {
    this.calendarEvent = new CalendarEventDao();
  }

  // ── Create
  public async createCalendarEventServices(
    data: ICalendarEvent,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const parsed = CalendarEventZodSchema.safeParse({
        ...data,
        companyId: companyId.toString(),
      });
      if (!parsed.success) {
        throw new Apperror(parsed.error.issues[0].message, 400);
      }

      const created = await this.calendarEvent.createCalendarEvent(
        data,
        companyId,
        userId,
      );
      return created;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to create calendar event", 400);
    }
  }

  // ── Get All
  public async getAllCalendarEventServices(
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const events = await this.calendarEvent.getAllCalendarEvent(companyId);
      return events;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to get all calendar events", 400);
    }
  }

  // ── Get By Id
  public async getCalendarEventByIdServices(
    id: string,
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const event = await this.calendarEvent.getCalendarEventById(id, companyId);
      if (!event) {
        throw new Apperror("Calendar event not found", 404);
      }
      return event;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to get calendar event", 400);
    }
  }

  // ── Get By Type
  public async getCalendarEventByTypeServices(
    eventType: ICalendarEvent["eventType"],
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const events = await this.calendarEvent.getCalendarEventByType(
        eventType,
        companyId,
      );
      return events;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to get calendar events by type", 400);
    }
  }

  // ── Get Individual (employee calendar view)
  public async getIndividualEventServices(
    companyId: Types.ObjectId,
    departmentId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const events = await this.calendarEvent.getIndividualEvent(
        companyId,
        departmentId,
        employeeId,
      );
      return events;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to get individual calendar events", 400);
    }
  }

  // ── Edit
  public async editCalendarEventServices(
    id: string,
    data: Partial<ICalendarEvent>,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const parsed = CalendarEventPartialSchema.safeParse(data);
      if (!parsed.success) {
        throw new Apperror(parsed.error.issues[0].message, 400);
      }

      const updated = await this.calendarEvent.editCalendarEvent(
        id,
        parsed.data as Partial<ICalendarEvent>,
        companyId,
        userId,
      );
      return updated;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to edit calendar event", 400);
    }
  }

  // ── Delete
  public async deleteCalendarEventServices(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const deleted = await this.calendarEvent.deleteCalendarEvent(
        id,
        companyId,
        userId,
      );
      return deleted;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to delete calendar event", 400);
    }
  }
}