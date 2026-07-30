import {
  attendanceRegularizationPolicyModel,
  IAttendanceRegularizationPolicy,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

export class AttendanceRegularizationPolicyDao {
  public async createAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
    data: Omit<
      IAttendanceRegularizationPolicy,
      "companyId" | "createdAt" | "updatedAt"
    >,
  ): Promise<IAttendanceRegularizationPolicy> {
    console.log("CREATE POLICY DAO HIT");
    const policy = await attendanceRegularizationPolicyModel.create({
      companyId,
      ...data,
    });

    return policy.toObject();
  }

  public async getAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
  ): Promise<IAttendanceRegularizationPolicy | null> {
    return attendanceRegularizationPolicyModel
      .findOne({
        companyId,
      })
      .lean();
  }

  public async updateAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
    data: Partial<IAttendanceRegularizationPolicy>,
  ): Promise<IAttendanceRegularizationPolicy | null> {
    return attendanceRegularizationPolicyModel
      .findOneAndUpdate(
        { companyId },
        {
          $set: data,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();
  }

  public async deleteAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
  ): Promise<boolean> {
    const result = await attendanceRegularizationPolicyModel.deleteOne({
      companyId,
    });

    return result.deletedCount > 0;
  }
}
