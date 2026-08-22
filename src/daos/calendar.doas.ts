import { CalendarEventModel, ICalendarEvent } from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { Apperror } from "../common/errorhandlers";
import {
  CalendarDashboardResult,
  CalendarEventQuery,
  GetAllCalendarEventParams,
  PaginatedCalendarEventResult,
} from "../typings";

export class CalendarEventDao {
  /**
   * Create a calendar event.
   *
   * @param data Event data
   * @param companyId Company identifier
   * @param userId User creating the event
   * @returns Created calendar event
   */
  public async createCalendarEvent(
    data: ICalendarEvent,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const event = await CalendarEventModel.create({
        ...data,
        companyId,
        audit: {
          createdBy: userId,
          createdAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      return event;
    } catch (error) {
      throw new Apperror("Failed to create calendar event", 400);
    }
  }

  /**
   * Get paginated calendar events.
   *
   * Supports pagination, search, event type, department,
   * employee and date filtering.
   *
   * Employee and department information is enriched
   * through aggregation lookups.
   *
   * @param companyId Company identifier
   * @param params Query parameters
   * @returns Paginated calendar events
   */
  public async getAllCalendarEvent(
    companyId: Types.ObjectId,
    params: GetAllCalendarEventParams = {},
  ): Promise<PaginatedCalendarEventResult> {
    try {
      const page = Math.max(Number(params.page) || 1, 1);
      const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const match: CalendarEventQuery = {
        companyId,
        isActive: true,
        // "scope.status": "published",
      };

      if (params.eventType) {
        match.eventType = params.eventType;
      }

      if (params.departmentId) {
        match["classification.departmentId"] = new Types.ObjectId(
          params.departmentId,
        );
      }

      if (params.employeeId) {
        match["classification.employeeId"] = new Types.ObjectId(
          params.employeeId,
        );
      }

      if (params.startDate || params.endDate) {
        const dateFilter: {
          $gte?: Date;
          $lte?: Date;
        } = {};

        if (params.startDate) {
          dateFilter.$gte = new Date(`${params.startDate}T00:00:00.000Z`);
        }

        if (params.endDate) {
          dateFilter.$lte = new Date(`${params.endDate}T23:59:59.999Z`);
        }

        match.startDate = dateFilter;
      }

      const search = params.search?.trim();

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        Object.assign(match, {
          $or: [
            {
              eventName: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
            {
              eventType: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
          ],
        });
      }

      const [result] = await CalendarEventModel.aggregate([
        {
          $match: match,
        },
        {
          $facet: {
            data: [
              {
                $sort: {
                  startDate: 1,
                  "audit.createdAt": -1,
                  _id: 1,
                },
              },
              {
                $skip: skip,
              },
              {
                $limit: limit,
              },

              {
                $lookup: {
                  from: "departments",
                  let: {
                    departmentId: "$classification.departmentId",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$_id", "$$departmentId"],
                            },
                            {
                              $eq: ["$companyId", companyId],
                            },
                            {
                              $eq: ["$meta.isDeleted", false],
                            },
                          ],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: "$data.name",
                      },
                    },
                  ],
                  as: "department",
                },
              },

              {
                $lookup: {
                  from: "employees",
                  let: {
                    employeeId: "$classification.employeeId",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$_id", "$$employeeId"],
                            },
                            {
                              $eq: ["$companyId", companyId],
                            },
                            {
                              $eq: ["$meta.isDeleted", false],
                            },
                          ],
                        },
                      },
                    },

                    {
                      $lookup: {
                        from: "departments",
                        let: {
                          departmentId: "$data.job.department",
                        },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [
                                  {
                                    $eq: ["$_id", "$$departmentId"],
                                  },
                                  {
                                    $eq: ["$companyId", companyId],
                                  },
                                  {
                                    $eq: ["$meta.isDeleted", false],
                                  },
                                ],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: 1,
                              name: "$data.name",
                            },
                          },
                        ],
                        as: "employeeDepartment",
                      },
                    },

                    {
                      $lookup: {
                        from: "designations",
                        let: {
                          designationId: "$data.job.designation",
                        },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $eq: ["$_id", "$$designationId"],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: 1,
                              name: "$data.name",
                            },
                          },
                        ],
                        as: "designation",
                      },
                    },

                    {
                      $project: {
                        _id: 1,
                        employeeId: "$data.basic.employeeId",
                        firstName: "$data.basic.firstName",
                        lastName: "$data.basic.lastName",
                        email: "$data.basic.email",
                        profilePhotoUrl: "$data.basic.profilePhotoUrl",
                        department: {
                          $arrayElemAt: ["$employeeDepartment", 0],
                        },
                        designation: {
                          $arrayElemAt: ["$designation", 0],
                        },
                      },
                    },
                  ],
                  as: "employee",
                },
              },

              {
                $set: {
                  department: {
                    $arrayElemAt: ["$department", 0],
                  },
                  employee: {
                    $arrayElemAt: ["$employee", 0],
                  },
                },
              },
            ],

            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      const data = result?.data ?? [];
      const total = result?.totalCount?.[0]?.count ?? 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      throw new Apperror("Failed to get all calendar events", 400);
    }
  }

  /**
   * Get published calendar events for a date range.
   *
   * @param companyId Company identifier
   * @param startDate Range start date
   * @param endDate Range end date
   * @returns Calendar events overlapping the requested range
   */
  public async getCalendarEventsByDateRange(
    companyId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      const events = await CalendarEventModel.aggregate([
        {
          $match: {
            companyId,
            isActive: true,
            "scope.status": "published",
            startDate: {
              $lte: endDate,
            },
            endDate: {
              $gte: startDate,
            },
          },
        },

        {
          $sort: {
            startDate: 1,
            _id: 1,
          },
        },

        {
          $lookup: {
            from: "departments",
            let: {
              departmentId: "$classification.departmentId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$_id", "$$departmentId"],
                      },
                      {
                        $eq: ["$companyId", companyId],
                      },
                      {
                        $eq: ["$meta.isDeleted", false],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: "$data.name",
                },
              },
            ],
            as: "department",
          },
        },

        {
          $lookup: {
            from: "employees",
            let: {
              employeeId: "$classification.employeeId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$_id", "$$employeeId"],
                      },
                      {
                        $eq: ["$companyId", companyId],
                      },
                      {
                        $eq: ["$meta.isDeleted", false],
                      },
                    ],
                  },
                },
              },

              {
                $lookup: {
                  from: "departments",
                  let: {
                    departmentId: "$data.job.department",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$_id", "$$departmentId"],
                            },
                            {
                              $eq: ["$companyId", companyId],
                            },
                            {
                              $eq: ["$meta.isDeleted", false],
                            },
                          ],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: "$data.name",
                      },
                    },
                  ],
                  as: "employeeDepartment",
                },
              },

              {
                $lookup: {
                  from: "designations",
                  let: {
                    designationId: "$data.job.designation",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ["$_id", "$$designationId"],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: "$data.name",
                      },
                    },
                  ],
                  as: "designation",
                },
              },

              {
                $project: {
                  _id: 1,
                  employeeId: "$data.basic.employeeId",
                  firstName: "$data.basic.firstName",
                  lastName: "$data.basic.lastName",
                  email: "$data.basic.email",
                  profilePhotoUrl: "$data.basic.profilePhotoUrl",
                  department: {
                    $arrayElemAt: ["$employeeDepartment", 0],
                  },
                  designation: {
                    $arrayElemAt: ["$designation", 0],
                  },
                },
              },
            ],
            as: "employee",
          },
        },

        {
          $set: {
            department: {
              $arrayElemAt: ["$department", 0],
            },
            employee: {
              $arrayElemAt: ["$employee", 0],
            },
          },
        },
      ]);

      return events;
    } catch (error) {
      throw new Apperror("Failed to get calendar events by date range", 400);
    }
  }

  /**
   * Get a calendar event by ID.
   *
   * @param id Event identifier
   * @param companyId Company identifier
   * @returns Calendar event or null
   */
  public async getCalendarEventById(
    id: string,
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent | null> {
    try {
      return await CalendarEventModel.findOne({
        _id: id,
        companyId,
        isActive: true,
      }).lean();
    } catch (error) {
      throw new Apperror("Failed to get calendar event by id", 400);
    }
  }

  /**
   * Get calendar events by event type.
   *
   * @param eventType Event type
   * @param companyId Company identifier
   * @returns Published calendar events
   */
  public async getCalendarEventByType(
    eventType: ICalendarEvent["eventType"],
    companyId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      return await CalendarEventModel.find({
        eventType,
        companyId,
        isActive: true,
        "scope.status": "published",
      })
        .sort({
          startDate: 1,
        })
        .lean();
    } catch (error) {
      throw new Apperror("Failed to get calendar event type", 400);
    }
  }

  /**
   * Get calendar dashboard data.
   *
   * @param companyId Company identifier
   * @returns Calendar dashboard information
   */
  public async getCalendarDashboard(
    companyId: Types.ObjectId,
  ): Promise<CalendarDashboardResult> {
    try {
      const now = new Date();

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      const [result] = await CalendarEventModel.aggregate([
        {
          $match: {
            companyId,
            isActive: true,
            "scope.status": "published",
          },
        },

        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,

                  total: {
                    $sum: 1,
                  },

                  upcoming: {
                    $sum: {
                      $cond: [
                        {
                          $gte: ["$startDate", now],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  today: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            {
                              $gte: ["$startDate", startOfToday],
                            },
                            {
                              $lt: ["$startDate", endOfToday],
                            },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  holidays: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$eventType", "holiday"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  meetings: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$eventType", "meeting"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  leaveRequests: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$eventType", "leave"],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },

              {
                $project: {
                  _id: 0,
                },
              },
            ],

            upcomingEvents: [
              {
                $match: {
                  startDate: {
                    $gte: now,
                  },
                },
              },

              {
                $sort: {
                  startDate: 1,
                  _id: 1,
                },
              },

              {
                $limit: 10,
              },

              {
                $lookup: {
                  from: "departments",
                  let: {
                    departmentId: "$classification.departmentId",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$_id", "$$departmentId"],
                            },
                            {
                              $eq: ["$companyId", companyId],
                            },
                            {
                              $eq: ["$meta.isDeleted", false],
                            },
                          ],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        name: "$data.name",
                      },
                    },
                  ],
                  as: "department",
                },
              },

              {
                $lookup: {
                  from: "employees",
                  let: {
                    employeeId: "$classification.employeeId",
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: ["$_id", "$$employeeId"],
                            },
                            {
                              $eq: ["$companyId", companyId],
                            },
                            {
                              $eq: ["$meta.isDeleted", false],
                            },
                          ],
                        },
                      },
                    },

                    {
                      $project: {
                        _id: 1,
                        employeeId: "$data.basic.employeeId",
                        firstName: "$data.basic.firstName",
                        lastName: "$data.basic.lastName",
                        email: "$data.basic.email",
                        profilePhotoUrl: "$data.basic.profilePhotoUrl",
                        departmentId: "$data.job.department",
                        designationId: "$data.job.designation",
                      },
                    },
                  ],
                  as: "employee",
                },
              },

              {
                $set: {
                  department: {
                    $arrayElemAt: ["$department", 0],
                  },
                  employee: {
                    $arrayElemAt: ["$employee", 0],
                  },
                },
              },

              {
                $project: {
                  _id: 1,
                  eventName: 1,
                  eventType: 1,
                  startDate: 1,
                  endDate: 1,
                  isFullDay: 1,
                  startTime: 1,
                  endTime: 1,
                  description: 1,
                  classification: 1,
                  scope: 1,
                  department: 1,
                  employee: 1,
                },
              },
            ],

            eventTypeStats: [
              {
                $group: {
                  _id: "$eventType",
                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            departmentStats: [
              {
                $match: {
                  "classification.departmentId": {
                    $ne: null,
                  },
                },
              },

              {
                $group: {
                  _id: "$classification.departmentId",
                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $lookup: {
                  from: "departments",
                  localField: "_id",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $match: {
                        companyId,
                        "meta.isDeleted": false,
                      },
                    },
                    {
                      $project: {
                        _id: 0,
                        name: "$data.name",
                      },
                    },
                  ],
                  as: "department",
                },
              },

              {
                $set: {
                  departmentName: {
                    $ifNull: [
                      {
                        $arrayElemAt: ["$department.name", 0],
                      },
                      "Unknown",
                    ],
                  },
                },
              },

              {
                $project: {
                  _id: 1,
                  departmentName: 1,
                  count: 1,
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],
          },
        },
      ]);

      const summary = result?.summary?.[0] ?? {
        total: 0,
        upcoming: 0,
        today: 0,
        holidays: 0,
        meetings: 0,
        leaveRequests: 0,
      };

      return {
        summary,
        upcomingEvents: result?.upcomingEvents ?? [],
        eventTypeStats: result?.eventTypeStats ?? [],
        departmentStats: result?.departmentStats ?? [],
      };
    } catch (error) {
      throw new Apperror("Failed to get calendar dashboard", 400);
    }
  }

  /**
   * Edit a calendar event.
   *
   * @param id Event identifier
   * @param data Fields to update
   * @param companyId Company identifier
   * @param userId User performing the update
   * @returns Updated calendar event
   */
  public async editCalendarEvent(
    id: string,
    data: Partial<ICalendarEvent>,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const event = await CalendarEventModel.findOneAndUpdate(
        {
          _id: id,
          companyId,
        },
        {
          $set: {
            ...data,
            "audit.updatedBy": userId,
            "audit.updatedAt": new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!event) {
        throw new Apperror("Calendar event not found", 404);
      }

      return event;
    } catch (error) {
      if (error instanceof Apperror) {
        throw error;
      }

      throw new Apperror("Failed to edit calendar event", 400);
    }
  }

  /**
   * Updates the status of a calendar event.
   *
   * @param id Calendar event ID.
   * @param companyId Company ID.
   * @param status New event status.
   * @param userId User performing the update.
   * @returns Updated calendar event.
   */
  public async updateCalendarEventStatus(
    id: string,
    companyId: Types.ObjectId,
    status: ICalendarEvent["scope"]["status"],
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const event = await CalendarEventModel.findOneAndUpdate(
        {
          _id: id,
          companyId,
          isActive: true,
        },
        {
          $set: {
            "scope.status": status,
            "audit.updatedBy": userId,
            "audit.updatedAt": new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

      if (!event) {
        throw new Apperror("Calendar event not found", 404);
      }

      return event;
    } catch (error) {
      if (error instanceof Apperror) {
        throw error;
      }

      throw new Apperror("Failed to update calendar event status", 400);
    }
  }

  /**
   * Soft delete a calendar event.
   *
   * @param id Event identifier
   * @param companyId Company identifier
   * @param userId User performing the deletion
   * @returns Deleted calendar event
   */
  public async deleteCalendarEvent(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ICalendarEvent> {
    try {
      const event = await CalendarEventModel.findOneAndUpdate(
        {
          _id: id,
          companyId,
        },
        {
          $set: {
            isActive: false,
            "audit.updatedBy": userId,
            "audit.updatedAt": new Date(),
          },
        },
        {
          new: true,
        },
      );

      if (!event) {
        throw new Apperror("Calendar event not found", 404);
      }

      return event;
    } catch (error) {
      if (error instanceof Apperror) {
        throw error;
      }

      throw new Apperror("Failed to delete calendar event", 400);
    }
  }

  /**
   * Get published events applicable to an employee.
   *
   * @param companyId Company identifier
   * @param departmentId Employee department identifier
   * @param employeeId Employee identifier
   * @returns Applicable published events
   */
  public async getIndividualEvent(
    companyId: Types.ObjectId,
    departmentId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<ICalendarEvent[]> {
    try {
      return await CalendarEventModel.find({
        companyId,
        isActive: true,
        "scope.status": "published",
        $or: [
          {
            "classification.applicableTo": "All",
          },
          {
            "classification.applicableTo": "Department",
            "classification.departmentId": departmentId,
          },
          {
            "classification.applicableTo": "Individual",
            "classification.employeeId": employeeId,
          },
        ],
      })
        .sort({
          startDate: 1,
        })
        .lean();
    } catch (error) {
      throw new Apperror("Failed to fetch events for employee", 400);
    }
  }
}
