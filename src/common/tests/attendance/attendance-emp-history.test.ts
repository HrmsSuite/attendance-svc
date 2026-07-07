import mongoose from "mongoose";
import { AttendanceEventDaos } from "../../../daos";

const runTest = async () => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
  );

  try {
    const dao = new AttendanceEventDaos();

    const result = await dao.getEmployeeAttendanceHistory(
      new mongoose.Types.ObjectId(
        "69e8bbf9d1d0f1ddd760194c",
      ), // companyId

      new mongoose.Types.ObjectId(
        "6a1209d18144b8e5ca259b02",
      ), // employeeId

      new Date("2026-06-01"), // fromDate

      new Date("2026-06-30"), // toDate
    );

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();