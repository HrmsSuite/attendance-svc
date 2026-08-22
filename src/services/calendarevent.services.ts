import {
  EVENT_STATUS,
  ICalendarEvent,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

import { CalendarEventDao } from "../daos";
import {
  CalendarEventZodSchema,
  CalendarEventPartialSchema,
} from "../common/validators";
import { Apperror } from "../common/errorhandlers";

import {
  CalendarDashboardResult,
  GetAllCalendarEventParams,
  PaginatedCalendarEventResult,
} from "../typings";

import {
  CalendarEventStatus,
  validateCalendarEventStatusTransition,
} from "../helpers";

export class CalendarEventServices {
  private readonly calendarEvent: CalendarEventDao;

  constructor() {
    this.calendarEvent = new CalendarEventDao();
  }

  /**
   * Creates a new calendar event.
   *
   * The company and audit information are controlled by the service/DAO
   * layer and are not trusted from the request payload.
   *
   * @param data Calendar event payload.
   * @param companyId Authenticated company identifier.
   * @param userId Authenticated user identifier.
   * @returns The created calendar event.
   */
  public async createCalendarEventServices(
    data: ICalendarEvent,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      this.validateObjectId(companyId, "Invalid company ID");
      this.validateObjectId(userId, "Invalid user ID");

      const payload = this.buildCreatePayload(data, companyId);

      const parsed = CalendarEventZodSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Apperror(
          parsed.error.issues[0]?.message ??
            "Invalid calendar event data",
          400,
        );
      }

      const validatedData = this.normalizeCreatePayload(parsed.data);

      return await this.calendarEvent.createCalendarEvent(
        validatedData,
        companyId,
        userId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to create calendar event",
      );
    }
  }

  /**
   * Gets paginated published calendar events.
   *
   * Supports pagination, search, event type, department,
   * employee and date-range filtering.
   *
   * @param companyId Company identifier.
   * @param params Calendar event query parameters.
   * @returns Paginated calendar event result.
   */
  public async getAllCalendarEventServices(
    companyId: Types.ObjectId,
    params: GetAllCalendarEventParams = {},
  ): Promise<PaginatedCalendarEventResult> {
    try {
      this.validateObjectId(companyId, "Invalid company ID");
      this.validateCalendarEventQueryParams(params);

      return await this.calendarEvent.getAllCalendarEvent(
        companyId,
        params,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get all calendar events",
      );
    }
  }

  /**
   * Gets an active calendar event by ID.
   *
   * @param id Calendar event identifier.
   * @param companyId Company identifier.
   * @returns The requested calendar event.
   * @throws Apperror when the event does not exist.
   */
  public async getCalendarEventByIdServices(
    id: string,
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      this.validateObjectIdString(
        id,
        "Invalid calendar event ID",
      );

      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      const event = await this.calendarEvent.getCalendarEventById(
        id,
        companyId,
      );

      if (!event) {
        throw new Apperror(
          "Calendar event not found",
          404,
        );
      }

      return event;
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get calendar event",
      );
    }
  }

  /**
   * Gets published calendar events by event type.
   *
   * @param eventType Calendar event type.
   * @param companyId Company identifier.
   * @returns Published calendar events matching the event type.
   */
  public async getCalendarEventByTypeServices(
    eventType: ICalendarEvent["eventType"],
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      if (!eventType) {
        throw new Apperror(
          "Event type is required",
          400,
        );
      }

      return await this.calendarEvent.getCalendarEventByType(
        eventType,
        companyId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get calendar events by type",
      );
    }
  }

  /**
   * Gets published events applicable to an employee.
   *
   * Applicability is determined by the DAO using:
   * - All
   * - Department
   * - Individual
   *
   * @param companyId Company identifier.
   * @param departmentId Employee department identifier.
   * @param employeeId Employee identifier.
   * @returns Applicable published calendar events.
   */
  public async getIndividualEventServices(
    companyId: Types.ObjectId,
    departmentId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      this.validateObjectId(
        departmentId,
        "Invalid department ID",
      );

      this.validateObjectId(
        employeeId,
        "Invalid employee ID",
      );

      return await this.calendarEvent.getIndividualEvent(
        companyId,
        departmentId,
        employeeId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get individual calendar events",
      );
    }
  }

  /**
   * Gets published calendar events overlapping a date range.
   *
   * An event overlaps the requested range when:
   *
   * event.startDate <= requested.endDate
   * AND
   * event.endDate >= requested.startDate
   *
   * @param companyId Company identifier.
   * @param startDate Requested range start date.
   * @param endDate Requested range end date.
   * @returns Calendar events overlapping the requested range.
   */
  public async getCalendarEventsByDateRangeServices(
    companyId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<ICalendarEvent[]> {
    try {
      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      this.validateDate(
        startDate,
        "Invalid start date",
      );

      this.validateDate(
        endDate,
        "Invalid end date",
      );

      if (endDate < startDate) {
        throw new Apperror(
          "End date must be greater than or equal to start date",
          400,
        );
      }

      const events =
        await this.calendarEvent.getCalendarEventsByDateRange(
          companyId,
          startDate,
          endDate,
        );

      return events as ICalendarEvent[];
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get calendar events by date range",
      );
    }
  }

  /**
   * Gets calendar dashboard information.
   *
   * @param companyId Company identifier.
   * @returns Calendar dashboard data.
   */
  public async getCalendarDashboardServices(
    companyId: Types.ObjectId,
  ): Promise<CalendarDashboardResult> {
    try {
      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      return await this.calendarEvent.getCalendarDashboard(
        companyId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to get calendar dashboard",
      );
    }
  }

  /**
   * Updates a calendar event using PATCH semantics.
   *
   * The following fields are server-controlled and cannot be updated
   * through this method:
   *
   * - companyId
   * - audit
   * - isActive
   * - scope.status
   *
   * Status changes must use the dedicated status service so that
   * status-transition rules are always enforced.
   *
   * @param id Calendar event identifier.
   * @param data Partial calendar event update.
   * @param companyId Company identifier.
   * @param userId User performing the update.
   * @returns Updated calendar event.
   */
  public async editCalendarEventServices(
    id: string,
    data: Partial<ICalendarEvent>,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      this.validateObjectIdString(
        id,
        "Invalid calendar event ID",
      );

      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      this.validateObjectId(
        userId,
        "Invalid user ID",
      );

      const sanitizedData =
        this.sanitizeUpdatePayload(data);

      const parsed =
        CalendarEventPartialSchema.safeParse(
          sanitizedData,
        );

      if (!parsed.success) {
        throw new Apperror(
          parsed.error.issues[0]?.message ??
            "Invalid calendar event data",
          400,
        );
      }

      const validatedData =
        this.normalizePartialUpdatePayload(parsed.data);

      return await this.calendarEvent.editCalendarEvent(
        id,
        validatedData,
        companyId,
        userId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to edit calendar event",
      );
    }
  }

  /**
   * Updates a calendar event status.
   *
   * Supported transitions:
   *
   * draft -> published
   * draft -> cancelled
   *
   * Published and cancelled events cannot be transitioned through
   * this API.
   *
   * @param id Calendar event identifier.
   * @param companyId Company identifier.
   * @param status Requested new status.
   * @param userId User performing the status update.
   * @returns Updated calendar event.
   */
  public async updateCalendarEventStatusServices(
    id: string,
    companyId: Types.ObjectId,
    status: CalendarEventStatus,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      this.validateObjectIdString(
        id,
        "Invalid calendar event ID",
      );

      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      this.validateObjectId(
        userId,
        "Invalid user ID",
      );

      this.validateCalendarEventStatus(status);

      const existingEvent =
        await this.calendarEvent.getCalendarEventById(
          id,
          companyId,
        );

      if (!existingEvent) {
        throw new Apperror(
          "Calendar event not found",
          404,
        );
      }

      const currentStatus =
        existingEvent.scope.status;

      validateCalendarEventStatusTransition(
        currentStatus,
        status,
      );

      return await this.calendarEvent.updateCalendarEventStatus(
        id,
        companyId,
        status,
        userId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to update calendar event status",
      );
    }
  }

  /**
   * Soft deletes a calendar event.
   *
   * @param id Calendar event identifier.
   * @param companyId Company identifier.
   * @param userId User performing the deletion.
   * @returns Soft-deleted calendar event.
   */
  public async deleteCalendarEventServices(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      this.validateObjectIdString(
        id,
        "Invalid calendar event ID",
      );

      this.validateObjectId(
        companyId,
        "Invalid company ID",
      );

      this.validateObjectId(
        userId,
        "Invalid user ID",
      );

      return await this.calendarEvent.deleteCalendarEvent(
        id,
        companyId,
        userId,
      );
    } catch (error) {
      this.handleServiceError(
        error,
        "Failed to delete calendar event",
      );
    }
  }

  /**
   * Builds the create payload expected by the Zod schema.
   *
   * The validation schema expects companyId as a string, while
   * persistence expects companyId as a Mongoose ObjectId.
   *
   * @param data Calendar event input.
   * @param companyId Authenticated company identifier.
   * @returns Payload compatible with CalendarEventZodSchema.
   */
  private buildCreatePayload(
    data: ICalendarEvent,
    companyId: Types.ObjectId,
  ): unknown {
    return {
      ...data,
      companyId: companyId.toString(),
    };
  }

  /**
   * Converts the validated Zod create payload into the persistence
   * calendar event structure.
   *
   * @param data Validated calendar event input.
   * @returns Calendar event compatible with the persistence layer.
   */
  private normalizeCreatePayload(
    data: ReturnType<
      typeof CalendarEventZodSchema.parse
    >,
  ): ICalendarEvent {
    const classification = {
      ...data.classification,
      departmentId:
        data.classification.departmentId
          ? new Types.ObjectId(
              data.classification.departmentId,
            )
          : undefined,
      employeeId:
        data.classification.employeeId
          ? new Types.ObjectId(
              data.classification.employeeId,
            )
          : undefined,
    };

    const scope = {
      ...data.scope,
      departmentId:
        data.scope.departmentId
          ? new Types.ObjectId(
              data.scope.departmentId,
            )
          : undefined,
      employeeId:
        data.scope.employeeId
          ? new Types.ObjectId(
              data.scope.employeeId,
            )
          : undefined,
    };

    return {
      ...data,
      companyId: new Types.ObjectId(data.companyId),
      classification,
      scope,
    } as ICalendarEvent;
  }

  /**
   * Converts validated PATCH data into the persistence representation.
   *
   * @param data Validated partial calendar event payload.
   * @returns Persistence-compatible partial calendar event.
   */
  private normalizePartialUpdatePayload(
    data: ReturnType<
      typeof CalendarEventPartialSchema.parse
    >,
  ): Partial<ICalendarEvent> {
    const normalized: Record<string, unknown> = {
      ...data,
    };

    if (data.classification) {
      normalized.classification = {
        ...data.classification,
        departmentId:
          data.classification.departmentId
            ? new Types.ObjectId(
                data.classification.departmentId,
              )
            : undefined,
        employeeId:
          data.classification.employeeId
            ? new Types.ObjectId(
                data.classification.employeeId,
              )
            : undefined,
      };
    }

    if (data.scope) {
      normalized.scope = {
        ...data.scope,
        departmentId:
          data.scope.departmentId
            ? new Types.ObjectId(
                data.scope.departmentId,
              )
            : undefined,
        employeeId:
          data.scope.employeeId
            ? new Types.ObjectId(
                data.scope.employeeId,
              )
            : undefined,
      };
    }

    return normalized as Partial<ICalendarEvent>;
  }

  /**
   * Validates a Mongoose ObjectId.
   *
   * @param value ObjectId value.
   * @param message Error message.
   */
  private validateObjectId(
    value: Types.ObjectId,
    message: string,
  ): void {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new Apperror(message, 400);
    }
  }

  /**
   * Validates an ObjectId represented as a string.
   *
   * @param value ObjectId string.
   * @param message Error message.
   */
  private validateObjectIdString(
    value: string,
    message: string,
  ): void {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new Apperror(message, 400);
    }
  }

  /**
   * Validates a Date instance.
   *
   * @param value Date value.
   * @param message Error message.
   */
  private validateDate(
    value: Date,
    message: string,
  ): void {
    if (
      !(value instanceof Date) ||
      Number.isNaN(value.getTime())
    ) {
      throw new Apperror(message, 400);
    }
  }

  /**
   * Validates a date query parameter.
   *
   * @param value Date string.
   * @param message Error message.
   */
  private validateDateString(
    value: string,
    message: string,
  ): void {
    if (
      !value ||
      Number.isNaN(new Date(value).getTime())
    ) {
      throw new Apperror(message, 400);
    }
  }

  /**
   * Validates calendar event status.
   *
   * @param status Calendar event status.
   */
  private validateCalendarEventStatus(
    status: CalendarEventStatus,
  ): void {
    if (!EVENT_STATUS.includes(status)) {
      throw new Apperror(
        "Invalid calendar event status",
        400,
      );
    }
  }

  /**
   * Validates calendar event list query parameters.
   *
   * @param params Calendar event query parameters.
   */
  private validateCalendarEventQueryParams(
    params: GetAllCalendarEventParams,
  ): void {
    if (params.page !== undefined) {
      const page = Number(params.page);

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        throw new Apperror(
          "Page must be a positive integer",
          400,
        );
      }
    }

    if (params.limit !== undefined) {
      const limit = Number(params.limit);

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        throw new Apperror(
          "Limit must be an integer between 1 and 100",
          400,
        );
      }
    }

    if (params.eventType !== undefined) {
      if (!params.eventType) {
        throw new Apperror(
          "Invalid event type",
          400,
        );
      }
    }

    if (params.departmentId !== undefined) {
      this.validateObjectIdString(
        params.departmentId,
        "Invalid department ID",
      );
    }

    if (params.employeeId !== undefined) {
      this.validateObjectIdString(
        params.employeeId,
        "Invalid employee ID",
      );
    }

    if (params.startDate !== undefined) {
      this.validateDateString(
        params.startDate,
        "Invalid start date",
      );
    }

    if (params.endDate !== undefined) {
      this.validateDateString(
        params.endDate,
        "Invalid end date",
      );
    }

    if (
      params.startDate &&
      params.endDate
    ) {
      const startDate = new Date(
        `${params.startDate}T00:00:00.000Z`,
      );

      const endDate = new Date(
        `${params.endDate}T23:59:59.999Z`,
      );

      if (endDate < startDate) {
        throw new Apperror(
          "End date must be greater than or equal to start date",
          400,
        );
      }
    }

    if (params.search !== undefined) {
      const search = params.search.trim();

      if (search.length > 100) {
        throw new Apperror(
          "Search query cannot exceed 100 characters",
          400,
        );
      }
    }
  }

  /**
   * Removes fields that are controlled by the service/DAO layer.
   *
   * Status is deliberately removed rather than assigning undefined.
   * This avoids violating the required IScope.status type.
   *
   * @param data Partial calendar event update.
   * @returns Sanitized update payload.
   */
  private sanitizeUpdatePayload(
    data: Partial<ICalendarEvent>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {
      ...data,
    };

    delete sanitized.companyId;
    delete sanitized.audit;
    delete sanitized.isActive;

    if (
      sanitized.scope &&
      typeof sanitized.scope === "object"
    ) {
      const scope = {
        ...(sanitized.scope as Record<string, unknown>),
      };

      delete scope.status;

      if (Object.keys(scope).length > 0) {
        sanitized.scope = scope;
      } else {
        delete sanitized.scope;
      }
    }

    return sanitized;
  }

  /**
   * Centralizes service-level error handling.
   *
   * Existing Apperror instances are preserved so their original
   * message and HTTP status are not lost.
   *
   * @param error Unknown caught error.
   * @param fallbackMessage Message used for unexpected errors.
   * @throws Apperror.
   */
  private handleServiceError(
    error: unknown,
    fallbackMessage: string,
  ): never {
    if (error instanceof Apperror) {
      throw error;
    }

    throw new Apperror(
      fallbackMessage,
      400,
    );
  }
}