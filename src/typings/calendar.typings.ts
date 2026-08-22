import { ICalendarEvent } from "@hrmssuite/persistence";
import { Types } from "mongoose";

type CalendarEventType = ICalendarEvent["eventType"];

export interface GetAllCalendarEventParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  eventType?: CalendarEventType;
  departmentId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedCalendarEventResult {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CalendarEventQuery {
  companyId: Types.ObjectId;
  isActive: boolean;
  // "scope.status": "published";
  eventType?: CalendarEventType;
  "classification.departmentId"?: Types.ObjectId;
  "classification.employeeId"?: Types.ObjectId;
  startDate?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface CalendarDashboardResult {
  summary: {
    total: number;
    upcoming: number;
    today: number;
    holidays: number;
    meetings: number;
    leaveRequests: number;
  };

  upcomingEvents: any[];

  eventTypeStats: Array<{
    _id: string;
    count: number;
  }>;

  departmentStats: Array<{
    _id: Types.ObjectId | null;
    departmentName: string;
    count: number;
  }>;
}

export interface CalendarEventIdParams {
  id: string;
}

export interface CalendarEventTypeParams {
  eventType: string;
}

export interface IndividualCalendarEventParams {
  departmentId: string;
  employeeId: string;
}

export interface CalendarEventStatusParams {
  id: string;
  status: string;
}

export interface CalendarEventDateRangeQuery {
  startDate?: string;
  endDate?: string;
}
