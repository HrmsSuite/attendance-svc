import mongoose from "mongoose";
import { LeaveRequestDao } from "../daos";
import {
  approveLeaveRequestSchema,
  cancelLeaveRequestSchema,
  createLeaveRequestSchema,
  withdrawLeaveRequestSchema,
  getLeaveCalendarSchema,
} from "../common/validators/leaverequest.zod";

export class LeaveRequestServices {
  private dao = new LeaveRequestDao();

  // CREATE (business logic added)
  public async createLeaveRequest(input: any, companyId: string) {
    console.log(" Service received input:", input);
    console.log(" Service received companyId:", companyId);

    if (!companyId) throw new Error("companyId is required");
    const data = createLeaveRequestSchema.parse(input);
    console.log(" Zod parsed data:", data);
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // BUSINESS RULE 1: date validation
    if (startDate > endDate) {
      throw new Error("Start date cannot be after end date");
    }

    // BUSINESS RULE 2: max leave cap example (optional rule)
    if (data.totalDays > 30) {
      throw new Error("Cannot apply more than 30 days at once");
    }

     const isHalfDay = data.totalDays % 1 !== 0;
    return this.dao.createLeaveRequest(
      {
        ...data,
        isHalfDay,
        startDate,
        endDate,
        employeeId: new mongoose.Types.ObjectId(data.employeeId),
        leavePolicyId: new mongoose.Types.ObjectId(data.leavePolicyId),
      } as any,
      new mongoose.Types.ObjectId(companyId),
    );
  }

  // APPROVE / REJECT (business rules added)
  public async approveLeaveRequest(input: any) {
    const data = approveLeaveRequestSchema.parse(input);

    // RULE: prevent invalid action spam
    if (!["approved", "rejected"].includes(data.action)) {
      throw new Error("Invalid action");
    }

    return this.dao.approveLeaveRequest(
      new mongoose.Types.ObjectId(data.leaveRequestId),
      new mongoose.Types.ObjectId(data.approverId),
      data.action,
      data.remarks,
    );
  }

  // CANCEL (business rules added)
  public async cancelLeaveRequest(input: any) {
    const data = cancelLeaveRequestSchema.parse(input);

    return this.dao.cancelLeaveRequest(
      new mongoose.Types.ObjectId(data.leaveRequestId),
      new mongoose.Types.ObjectId(data.employeeId),
       data.cancelReason,
    );
  }

  // WITHDRAW (business rules added)
  public async withdrawLeaveRequest(input: any) {
    const data = withdrawLeaveRequestSchema.parse(input);

    return this.dao.withdrawLeaveRequest(
      new mongoose.Types.ObjectId(data.leaveRequestId),
      new mongoose.Types.ObjectId(data.employeeId),
       data.cancelReason,
    );
  }

  // TEAM
  public async getTeamLeaveRequests(managerId: string) {
    return this.dao.getTeamLeaveRequests(
      new mongoose.Types.ObjectId(managerId),
    );
  }

  // HISTORY
  public async getEmployeeLeaveHistory(employeeId: string) {
    return this.dao.getEmployeeLeaveHistory(
      new mongoose.Types.ObjectId(employeeId),
    );
  }

  // BY ID
  public async getLeaveRequestById(id: string) {
    return this.dao.getLeaveRequestById(new mongoose.Types.ObjectId(id));
  }

  // CALENDAR (validation added)
  public async getLeaveCalendar(params: any) {
    const data = getLeaveCalendarSchema.parse(params);

    return this.dao.getLeaveCalendar({
      companyId: new mongoose.Types.ObjectId(data.companyId),
      employeeId: data.employeeId
        ? new mongoose.Types.ObjectId(data.employeeId)
        : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  }
  // ALL LEAVE REQUESTS (Admin)
  public async getAllLeaveRequests(companyId: string) {
    return this.dao.getAllLeaveRequests(new mongoose.Types.ObjectId(companyId));
  }

  // ADMIN PENDING APPROVALS
  public async getAdminPendingApprovals(companyId: string, approverId: string) {
    return this.dao.getAdminPendingApprovals(
      new mongoose.Types.ObjectId(companyId),
      new mongoose.Types.ObjectId(approverId),
    );
  }
}
