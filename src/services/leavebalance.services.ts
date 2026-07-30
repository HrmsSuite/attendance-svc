import { Types } from "mongoose";
import { LeaveBalanceDao } from "../daos";
import { LeaveBalanceDetail } from "../typings";

export class LeaveBalanceService {
  private leaveBalanceDao: LeaveBalanceDao;

  constructor() {
    this.leaveBalanceDao = new LeaveBalanceDao();
  }

  public async getAllLeaveBalance(companyId: Types.ObjectId) {
    return await this.leaveBalanceDao.getAllLeaveBalance(companyId);
  }

  public async getLeaveBalanceById(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
  ): Promise<LeaveBalanceDetail[]> {
    return await this.leaveBalanceDao.getLeaveBalanceById(
      companyId,
      employeeId,
    );
  }

public async getLeaveBalancesForEmployees(
  companyId: Types.ObjectId,
  employeeIds: Types.ObjectId[],
): Promise<LeaveBalanceDetail[]> {
  return await this.leaveBalanceDao.getLeaveBalancesForEmployees(
    companyId,
    employeeIds,
  );
}
}
