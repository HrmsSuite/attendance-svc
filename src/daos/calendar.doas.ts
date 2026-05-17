import { CalendarEventModel, ICalendarEvent } from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { Apperror } from "../common/errorhandlers";

export class CalendarEventDao {
  //create
  public async createCalendarEvent(
    data: ICalendarEvent,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const create = await CalendarEventModel.create({
        ...data,
        companyId,
        audit: {
          createdBy: userId,
          createdAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
      return create;
    } catch (error) {
      throw new Apperror("Failed to create calendar event", 400);
    }
  }
  //get all
  public async getAllCalendarEvent(
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const getAll = await CalendarEventModel.find({
        companyId,
        isActive: true,
        "scope.status": "published",
      });
      return getAll;
    } catch (error) {
      throw new Apperror("Failed to get all calendar events", 400);
    }
  }
  // getById
  public async getCalendarEventById(
    id: string,
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent | null> {
    try {
      const getById = await CalendarEventModel.findOne({
        _id: id,
        companyId,
        isActive: true,
      });
      return getById;
    } catch (error) {
      throw new Apperror("Failed to get calendar event by id", 400);
    }
  }
  //getByType
  public async getCalendarEventByType(
    eventType: ICalendarEvent["eventType"],
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const calendarType = await CalendarEventModel.find({
        eventType,
        companyId,
        isActive: true,
      });
      return calendarType;
    } catch (error) {
      throw new Apperror("Failed to get calendar event type", 400);
    }
  }
  //Edit
  public async editCalendarEvent(
    id: string,
    data: Partial<ICalendarEvent>,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const editCalendar = await CalendarEventModel.findOneAndUpdate(
        { _id: id, companyId },
        {
          $set: {
            ...data,
            "audit.updatedBy": userId,
            "audit.updatedAt": new Date(),
          },
        },
        { new: true, runValidators: true },
      );
      if (!editCalendar) {
        throw new Apperror("Calendar event not found", 404);
      }
      return editCalendar;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to edit calendar event", 400);
    }
  }
  //delete
  public async deleteCalendarEvent(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const deleted = await CalendarEventModel.findOneAndUpdate(
        { _id: id, companyId },
        {
          $set: {
            isActive: false,
            "audit.updatedBy": userId,
            "audit.updatedAt": new Date(),
          },
        },
        { new: true },
      );
      if (!deleted) {
        throw new Apperror("Calendar event not found", 404);
      }

      return deleted;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to delete calendar event", 400);
    }
  }
  //getCalendarEventbyIndividual
  public async getIndividualEvent(
    companyId: Types.ObjectId,
    departmentId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      const individualData = await CalendarEventModel.find({
        companyId,
        isActive: true,
        "scope.status": "published",
        $or: [
          { "classification.applicableTo": "All" },
          {
            "classification.applicableTo": "Department",
            "classification.departmentId": departmentId,
          },
          {
            "classification.applicableTo": "Individual",
            "classification.employeeId": employeeId,
          },
        ],
      });
      return individualData;
    } catch (error) {
      throw new Apperror("Failed to fetch events for employee", 400);
    }
  }
}
