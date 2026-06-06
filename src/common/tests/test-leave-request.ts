import mongoose from "mongoose";
import { LeaveRequestDao } from "../../daos";

console.log("TEST FILE EXECUTED");
console.log("DATABASE_URL =", process.env.DATABASE_URL);
const runTest = async () => { 
  console.log("CONNECTING...");

await mongoose.connect(
  "mongodb://127.0.0.1:27018/HRMS?directConnection=true"
);

  const dao = new LeaveRequestDao();

  try {
    const result = await dao.createLeaveRequest(
      {
        employeeId: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
        leavePolicyId: new mongoose.Types.ObjectId("6a0851bf67913503d0596048"),

        startDate: new Date("2026-06-05"),
        endDate: new Date("2026-06-06"),
        totalDays: 2,

        isHalfDay: false,
        halfDaySession: undefined,

        reason: "Personal work",
        attachmentUrl: "",

        status: "pending",
        currentLevel: 1,

        companyId: new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),

        handoverEmployeeId: undefined,

        audit: {
          createdBy: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
          createdAt: new Date(),
          updatedBy: new mongoose.Types.ObjectId("6a1209d18144b8e5ca259b02"),
          updatedAt: new Date(),
        },
      } as any,
      new mongoose.Types.ObjectId("69e8bbf9d1d0f1ddd760194c"),
    );

    console.log("✅ Leave Request Created:");
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();