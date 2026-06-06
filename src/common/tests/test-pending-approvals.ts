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
      await dao.getPendingApprovals(
        new mongoose.Types.ObjectId(
          "69f6089fe7acbec2abc7b247",
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