import { ILeavePolicy, LeavePolicyModel } from "@hrmssuite/persistence";
import { Apperror } from "../common/errorhandlers";
import { Types } from "mongoose";

export class LeavePolicyDao {

  public async CreateLeavePolicy(
  data: ILeavePolicy,
  companyId: Types.ObjectId,
  userId: Types.ObjectId,
): Promise<ILeavePolicy> {
  try {
    const create = await LeavePolicyModel.create({
      ...data,
      companyId,
      audit: {
        createdBy: userId,
        createdAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });
    return create;
  } catch (error) {
    console.error("CreateLeavePolicy error:", error); // 👈 Add this first
    throw new Apperror("Policy not created", 400);
  }
}

  public async getLeavePolicy(
    companyId: Types.ObjectId,
  ): Promise<ILeavePolicy[]> {
    try {
      const getAll = await LeavePolicyModel.find({ 
        companyId,
      });
      return getAll;
    } catch (error) {
      throw new Apperror("Something went wrong to get leavepolicy", 400);
    }
  }

  public async getLeavePolicyByType(
    companyId: Types.ObjectId,
    leaveTypeName: ILeavePolicy["leaveTypeName"],
  ): Promise<ILeavePolicy | null> {  //null return — throw பண்ணாத
    try {
      const policy = await LeavePolicyModel.findOne({
        companyId,
        leaveTypeName,
        isActive: true,
      });
      return policy;                
    } catch (error) {
      throw new Apperror("Failed to fetch leave policy", 400);
    }
  }

  public async editLeavePolicy(
    companyId: Types.ObjectId,
    id: string,
    data: Partial<ILeavePolicy>,
    userId: Types.ObjectId,         //userId parameter
  ): Promise<ILeavePolicy> {
    try {
      const updated = await LeavePolicyModel.findOneAndUpdate(
        { _id: id, companyId },
        {
          $set: {
            ...data,
            "audit.updatedBy": userId,  // 
            "audit.updatedAt": new Date(),
          },
        },
        { new: true, runValidators: true },
      );

      if (!updated) {
        throw new Apperror("Leave policy not found", 404);
      }

      return updated;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Leave policy not updated", 400);
    }
  }

  public async deleteLeavePolicy(
    id: string,
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ILeavePolicy> {
    try {
      const deleted = await LeavePolicyModel.findOneAndDelete({
        _id: id,
        companyId,
      });

      if (!deleted) {
        throw new Apperror("Leave policy not found", 404);
      }

      return deleted;
    } catch (error) {
      if (error instanceof Apperror) throw error;
      throw new Apperror("Leave policy not deleted", 400);
    }
  }
}