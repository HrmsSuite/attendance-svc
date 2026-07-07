import mongoose from "mongoose";
import { AttendanceEventDaos } from "../../../daos";

const runTest = async () => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
  );

  try {
    const dao = new AttendanceEventDaos();

    const result = await dao.punchOutAttendanceEvent(
      {
        companyId: new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),
        employeeId: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
        attendanceDate: new Date("2026-06-12"),
        eventType: "CHECK_OUT",
        source: "WEB",
        eventTime: new Date(),
        createdAt: new Date(),
      },
      {
        companyId: new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),
        employeeId: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
        attendanceDate: new Date("2026-06-12"),

        payableDayFraction: 1,

        shiftId: new mongoose.Types.ObjectId("69f4cc7a3ac30f5edcf0d34e"),

        firstCheckIn: new Date("2026-06-10T09:00:00Z"),

        lastCheckOut: new Date(),

        workingMinutes: 480,

        breakMinutes: 60,

        overtimeMinutes: 0,

        lateMinutes: 0,

        earlyExitMinutes: 0,

        totalPunches: 2,

        status: "PRESENT",

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
