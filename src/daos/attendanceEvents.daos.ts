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
          returnDocument: "after",
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
          returnDocument: "after",
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
  ): Promise<IAttendanceDaily[]> {
    return AttendanceDaily.find({
      companyId,
      employeeId,
      attendanceDate: {
        $gte: fromDate,
        $lte: toDate,
      },
    })
      .sort({ attendanceDate: -1 })
      .lean();
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
        returnDocument: "after",
        session,
      },
    );
  }
}
