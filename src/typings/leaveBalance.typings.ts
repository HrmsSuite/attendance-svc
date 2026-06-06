import { Types } from "mongoose";

export interface LeaveBalanceDetail {
  policyId: Types.ObjectId;
  leaveTypeName: string;
  total: number;
  balance: number;
  used: number;
}