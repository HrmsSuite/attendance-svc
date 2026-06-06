import mongoose from "mongoose";
import { LeaveRequestDao } from "../../daos";

const runTest = async () => {
  try {
    await mongoose.connect(
      "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
    );

    const dao =
      new LeaveRequestDao();

    const result =
      await dao.getEmployeeLeaveHistory(
        new mongoose.Types.ObjectId(
          "6a1209d18144b8e5ca259b02",
        ),
      );

    console.log(
      JSON.stringify(result, null, 2),
    );
  } finally {
    await mongoose.disconnect();
  }
};

runTest();