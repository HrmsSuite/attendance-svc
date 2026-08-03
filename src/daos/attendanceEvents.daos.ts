import {
  AttendanceDaily,
  AttendanceEvents,
  IAttendanceDaily,
  IAttendanceEvents,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";

export class AttendanceEventDaos {
  public async createAttendanceEvent(
    eventData: IAttendanceEvents,
    dailyData: IAttendanceDaily,
  ): Promise<{ event: IAttendanceEvents; daily: IAttendanceDaily }> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const existingDaily = await AttendanceDaily.findOne({
        companyId: eventData.companyId,
        employeeId: eventData.employeeId,
        attendanceDate: eventData.attendanceDate,
      }).session(session);

      if (existingDaily) {
        const employeeIdStr = eventData.employeeId.toString();
        const dateStr = eventData.attendanceDate.toISOString().split("T")[0];
        throw new Error(
          `Employee ${employeeIdStr} has already checked in on ${dateStr}`,
        );
      }

      const [createdEvent] = await AttendanceEvents.create([eventData], {
        session,
      });

      const createdDaily = await AttendanceDaily.findOneAndUpdate(
        {
          companyId: dailyData.companyId,
          employeeId: dailyData.employeeId,
          attendanceDate: dailyData.attendanceDate,
        },
        { $set: dailyData },
        {
          upsert: true,
          new: true,
          session,
        },
      );

      if (!createdDaily) {
        throw new Error("Failed to create attendance daily record");
      }

      await session.commitTransaction();

      return {
        event: createdEvent,
        daily: createdDaily,
      };
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof Error) {
        console.error(
          "[AttendanceDAO] createAttendanceEvent error:",
          error.message,
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public async punchOutAttendanceEvent(
    eventData: IAttendanceEvents,
    dailyData: IAttendanceDaily,
  ): Promise<{ event: IAttendanceEvents; daily: IAttendanceDaily }> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const existingDaily = await AttendanceDaily.findOne({
        companyId: eventData.companyId,
        employeeId: eventData.employeeId,
        attendanceDate: eventData.attendanceDate,
      }).session(session);

      if (!existingDaily) {
        const employeeIdStr = eventData.employeeId.toString();
        const dateStr = eventData.attendanceDate.toISOString().split("T")[0];
        throw new Error(
          `Employee ${employeeIdStr} has not checked in on ${dateStr}`,
        );
      }

      if (!existingDaily.firstCheckIn) {
        const employeeIdStr = eventData.employeeId.toString();
        const dateStr = eventData.attendanceDate.toISOString().split("T")[0];
        throw new Error(
          `Employee ${employeeIdStr} has no check-in record on ${dateStr}`,
        );
      }

      if (existingDaily.lastCheckOut) {
        const employeeIdStr = eventData.employeeId.toString();
        const dateStr = eventData.attendanceDate.toISOString().split("T")[0];
        throw new Error(
          `Employee ${employeeIdStr} has already checked out on ${dateStr}`,
        );
      }

      const [createdEvent] = await AttendanceEvents.create([eventData], {
        session,
      });

      const updatedDaily = await AttendanceDaily.findOneAndUpdate(
        {
          companyId: dailyData.companyId,
          employeeId: dailyData.employeeId,
          attendanceDate: dailyData.attendanceDate,
        },
        { $set: dailyData },
        {
          new: true,
          session,
        },
      );

      if (!updatedDaily) {
        throw new Error("Failed to update attendance daily record");
      }

      await session.commitTransaction();

      return {
        event: createdEvent,
        daily: updatedDaily,
      };
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof Error) {
        console.error(
          "[AttendanceDAO] punchOutAttendanceEvent error:",
          error.message,
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public async getAttendanceDaily(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDate: Date,
  ): Promise<IAttendanceDaily | null> {
    return AttendanceDaily.findOne({
      companyId,
      employeeId,
      attendanceDate,
    }).lean();
  }

  public async getAttendanceEvents(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDate: Date,
  ): Promise<IAttendanceEvents[]> {
    return AttendanceEvents.find({
      companyId,
      employeeId,
      attendanceDate,
    })
      .sort({ eventTime: 1 })
      .lean();
  }

  public async getLatestEvent(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDate: Date,
  ): Promise<IAttendanceEvents | null> {
    return AttendanceEvents.findOne({
      companyId,
      employeeId,
      attendanceDate,
    })
      .sort({ eventTime: -1 })
      .lean();
  }

  public async getCompanyAttendance(
    companyId: Types.ObjectId,
    attendanceDate: Date,
  ): Promise<IAttendanceDaily[]> {
    return AttendanceDaily.find({
      companyId,
      attendanceDate,
    }).lean();
  }

  public async getEmployeeAttendanceHistory(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceDaily.aggregate([
      {
        $match: {
          companyId,
          employeeId,
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          attendanceDate: -1,
        },
      },
    ]);
  }

  public async updateAttendanceDaily(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    attendanceDate: Date,
    updateData: Partial<IAttendanceDaily>,
    session?: mongoose.ClientSession,
  ): Promise<IAttendanceDaily | null> {
    return AttendanceDaily.findOneAndUpdate(
      {
        companyId,
        employeeId,
        attendanceDate,
      },
      { $set: updateData },
      {
        new: true,
        session,
      },
    );
  }

  // AttendanceEventDaos — ADD these two methods

  /**
   * Company-wide daily summaries across a date range (admin dashboard).
   */
  public async getCompanyAttendanceHistory(
    companyId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceDaily.aggregate([
      {
        $match: {
          companyId,
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          attendanceDate: -1,
          employeeId: 1,
        },
      },
    ]);
  }

  /**
   * Raw punch-event log for ONE employee across a date range.
   * Use this for a "log view" — every individual check-in/check-out,
   * not the collapsed daily summary.
   */
  public async getEmployeeAttendanceEventsHistory(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceEvents.aggregate([
      {
        $match: {
          companyId,
          employeeId,
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "employee.data.job.shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          eventTime: 1,
        },
      },
    ]);
  }
  /**
   * Raw punch-event log for the WHOLE COMPANY across a date range.
   * Admin-only — every punch by every employee, useful for audit trails.
   */
  public async getCompanyAttendanceEventsHistory(
    companyId: Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceEvents.aggregate([
      {
        $match: {
          companyId,
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "employee.data.job.shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          eventTime: -1,
        },
      },
    ]);
  }

  /**
   * Raw punch-event log for a specific set of employees (hierarchy-based).
   */
  public async getCompanyAttendanceEventsHistoryForEmployees(
    companyId: Types.ObjectId,
    employeeIds: Types.ObjectId[],
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceEvents.aggregate([
      {
        $match: {
          companyId,
          employeeId: { $in: employeeIds },
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "employee.data.job.shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          eventTime: -1,
        },
      },
    ]);
  }
  /**
   * Company-wide daily summaries across a date range, filtered by employee set.
   */
  public async getCompanyAttendanceHistoryForEmployees(
    companyId: Types.ObjectId,
    employeeIds: Types.ObjectId[],
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return AttendanceDaily.aggregate([
      {
        $match: {
          companyId,
          employeeId: { $in: employeeIds },
          attendanceDate: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: {
          path: "$shift",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          employeeName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.data.basic.firstName", ""] },
                  " ",
                  { $ifNull: ["$employee.data.basic.lastName", ""] },
                ],
              },
            },
          },
          employeeCode: "$employee.data.basic.employeeId",
          shiftName: "$shift.data.name",
        },
      },

      {
        $project: {
          employee: 0,
          shift: 0,
        },
      },

      {
        $sort: {
          attendanceDate: -1,
          employeeId: 1,
        },
      },
    ]);
  }
}
