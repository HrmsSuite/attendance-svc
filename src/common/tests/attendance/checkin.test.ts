import mongoose from "mongoose";
import { AttendanceEventDaos } from "../../../daos";

const runTest = async () => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
  );

  try {
    const dao = new AttendanceEventDaos();

    const result = await dao.createAttendanceEvent(
      {
        companyId: new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),
        employeeId: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
        attendanceDate: new Date("2026-06-11"),
        eventType: "CHECK_IN",
        source: "WEB",
        eventTime: new Date(),
        createdAt: new Date(),
      },
      {
        companyId: new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),
        employeeId: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
        attendanceDate: new Date("2026-06-11"),
        payableDayFraction: 0,
        shiftId: new mongoose.Types.ObjectId("69f4cc7a3ac30f5edcf0d34e"),
        firstCheckIn: new Date(),
        lastCheckOut: null,
        workingMinutes: 0,
        breakMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyExitMinutes: 0,
        totalPunches: 1,
        status: "INCOMPLETE",
        regularized: false,
        sourceSummary: ["WEB"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();
