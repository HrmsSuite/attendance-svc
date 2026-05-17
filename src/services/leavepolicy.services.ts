import { ILeavePolicy } from "@hrmssuite/persistence";
import { LeavePolicyDao } from "../daos";
import { Types } from "mongoose";
import { LeavePolicyPartialSchema, LeavePolicyZodSchema } from "../common/validators";
import { Apperror } from "../common/errorhandlers";

export class LeavePolicyServices {
  private leavepolicy: LeavePolicyDao;

  constructor() {
    this.leavepolicy = new LeavePolicyDao();
  }

  public async createLeavePolicyServices(
    data: ILeavePolicy,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ILeavePolicy> {
    try {
      // Step 1 — Validate
      const parsed = LeavePolicyZodSchema.safeParse({
        ...data,
        companyId: companyId.toString(),
      });
      if (!parsed.success) {
        throw new Apperror(parsed.error.issues[0].message, 400);
      }

      // Step 2 — Duplicate check
      const existing = await this.leavepolicy.getLeavePolicyByType(
        companyId,
        data.leaveTypeName,
      );
      if (existing) {
        throw new Apperror(
          `${data.leaveTypeName} policy already exists for this company`,
          409,
        );
      }

      // Step 3 — Create
      const created = await this.leavepolicy.CreateLeavePolicy(
        data,
        companyId,
        userId,
      );
      return created;

    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to create leave policy", 400);
    }
  }

  public async getLeavePolicyServices(
    companyId: Types.ObjectId,
  ): Promise<ILeavePolicy[]> {
    try {
      const policies = await this.leavepolicy.getLeavePolicy(companyId);
      return policies;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to fetch leave policies", 400);
    }
  }

  public async getLeavePolicyByTypeService(
    companyId: Types.ObjectId,
    leaveTypeName: ILeavePolicy["leaveTypeName"],
  ): Promise<ILeavePolicy> {
    try {
      const policy = await this.leavepolicy.getLeavePolicyByType(
        companyId,
        leaveTypeName,
      );
      if (!policy) {
        throw new Apperror("Leave policy not found", 404);
      }
      return policy;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to fetch leave policy", 400);
    }
  }

  public async editLeavePolicyServices(
    companyId: Types.ObjectId,
    id: string,
    data: Partial<ILeavePolicy>,
    userId: Types.ObjectId,
  ): Promise<ILeavePolicy> {
    try {
      const parsed = LeavePolicyPartialSchema.safeParse(data);
      if (!parsed.success) {
        throw new Apperror(parsed.error.issues[0].message, 400);
      }
      const updated = await this.leavepolicy.editLeavePolicy(
        companyId,
        id,
        parsed.data as Partial<ILeavePolicy>,
        userId,
      );
      return updated;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to update leave policy", 400);
    }
  }

  public async deleteLeavePolicyService(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ILeavePolicy> {
    try {
      const deleted = await this.leavepolicy.deleteLeavePolicy(
        id,
        companyId,
        userId,
      );
      return deleted;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Failed to delete leave policy", 400);
    }
  }
}