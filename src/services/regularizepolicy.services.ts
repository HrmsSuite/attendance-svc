import { Types } from "mongoose";

import { AttendanceRegularizationPolicyHelper } from "../helpers/attendanceRegularizationPolicy.helper";
import { AttendanceRegularizationPolicyDao } from "../daos";
import {
  AttendanceRegularizationPolicySchema,
  CreateAttendanceRegularizationPolicyDto,
  UpdateAttendanceRegularizationPolicyDto,
} from "../common/validators";

export class AttendanceRegularizationPolicyService {
  private attendanceRegularizationPolicyDao =
    new AttendanceRegularizationPolicyDao();

  /**
   * Create Policy
   */
  public async createAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
    payload: CreateAttendanceRegularizationPolicyDto,
  ) {
    console.log("CREATE POLICY SERVICE HIT");
    const validated = AttendanceRegularizationPolicySchema.parse(payload);

    AttendanceRegularizationPolicyHelper.validatePolicy(validated);

    const existing =
      await this.attendanceRegularizationPolicyDao.getAttendanceRegularizationPolicy(
        companyId,
      );

    if (existing) {
      throw new Error("Attendance regularization policy already exists");
    }

    return this.attendanceRegularizationPolicyDao.createAttendanceRegularizationPolicy(
      companyId,
      validated,
    );
  }

  /**
   * Get Policy
   */
  public async getAttendanceRegularizationPolicy(companyId: Types.ObjectId) {
    return this.attendanceRegularizationPolicyDao.getAttendanceRegularizationPolicy(
      companyId,
    );
  }

  /**
   * Update Policy
   */
  public async updateAttendanceRegularizationPolicy(
    companyId: Types.ObjectId,
    payload: UpdateAttendanceRegularizationPolicyDto,
  ) {
    const validated =
      AttendanceRegularizationPolicySchema.partial().parse(payload);

    const existing =
      await this.attendanceRegularizationPolicyDao.getAttendanceRegularizationPolicy(
        companyId,
      );

    if (!existing) {
      throw new Error("Attendance regularization policy not found");
    }

    AttendanceRegularizationPolicyHelper.validatePolicy({
      ...existing,
      ...validated,
    });

    return this.attendanceRegularizationPolicyDao.updateAttendanceRegularizationPolicy(
      companyId,
      validated,
    );
  }

  /**
   * Delete Policy
   */
  public async deleteAttendanceRegularizationPolicy(companyId: Types.ObjectId) {
    return this.attendanceRegularizationPolicyDao.deleteAttendanceRegularizationPolicy(
      companyId,
    );
  }
}
