import { EVENT_STATUS } from "@hrmssuite/persistence";
import { Apperror } from "../common/errorhandlers";

export type CalendarEventStatus = (typeof EVENT_STATUS)[number];

export interface CalendarEventStatusTransition {
  from: CalendarEventStatus;
  to: CalendarEventStatus;
}

/**
 * Validates whether an event status transition is allowed.
 *
 * Draft events can be published or cancelled.
 * Published and cancelled events cannot be transitioned through this API.
 */
export const validateCalendarEventStatusTransition = (
  currentStatus: CalendarEventStatus,
  nextStatus: CalendarEventStatus,
): void => {
  if (currentStatus !== "draft") {
    throw new Apperror(
      `Event status cannot be changed from ${currentStatus}`,
      400,
    );
  }

  if (nextStatus !== "published" && nextStatus !== "cancelled") {
    throw new Apperror(
      "Event can only be published or cancelled from draft status",
      400,
    );
  }
};

/**
 * Returns the supported status transitions for calendar events.
 */
export const getCalendarEventStatusTransitions =
  (): CalendarEventStatusTransition[] => [
    {
      from: "draft",
      to: "published",
    },
    {
      from: "draft",
      to: "cancelled",
    },
  ];