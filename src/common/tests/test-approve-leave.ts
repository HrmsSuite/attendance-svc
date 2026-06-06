import mongoose from "mongoose";
import { LeaveRequestDao } from "../../daos";

const runTest = async () => {
  await mongoose.connect(
    "mongodb://127.0.0.1:27018/HRMS?directConnection=true",
  );

  try {
    const dao = new LeaveRequestDao();

    const result =
      // manager approve:
        await dao.approveLeaveRequest(
          new mongoose.Types.ObjectId(
            "6a1697608c7eb650a09d918f",
          ),

          new mongoose.Types.ObjectId(
            "69f6089fe7acbec2abc7b247",
          ),

          "approved", 
        );
      //   admin Approval:
    //   await dao.approveLeaveRequest(
    //     new mongoose.Types.ObjectId("6a1686405368e1f98bc7f53a"),

    //     new mongoose.Types.ObjectId("69ea395382f3e6e93e36b988"),

    //     "approved",

    //     "Admin approved",
    //   );
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();
