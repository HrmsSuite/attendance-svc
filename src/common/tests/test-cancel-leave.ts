// src/common/tests/test-cancel-leave.ts

import mongoose from "mongoose";
import { LeaveRequestDao } from "../../daos";

const runTest = async () => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
  );

  try {
    const dao = new LeaveRequestDao();

    const result = await dao.cancelLeaveRequest(
      new mongoose.Types.ObjectId(
        "6a1697608c7eb650a09d918f", // approved leave
      ),

      new mongoose.Types.ObjectId(
        "6a1209d18144b8e5ca259b02", // employee
      ),
    );

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();
