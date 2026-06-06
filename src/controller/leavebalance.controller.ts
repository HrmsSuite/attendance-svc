import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { LeaveBalanceService } from "../services";
import { Apperror } from "../common/errorhandlers";

export class LeaveBalanceController {
  private leaveBalanceService: LeaveBalanceService;

  constructor() {
    this.leaveBalanceService = new LeaveBalanceService();
  }

  // ── Get All
  public async getAllLeaveBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const leaveBalances =
        await this.leaveBalanceService.getAllLeaveBalance(companyId);

      res.status(200).json({
        success: true,
        message: "Leave balances fetched successfully",
        data: leaveBalances,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get By Employee
  public async getLeaveBalanceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const { employeeId } = req.params;

      if (!employeeId || Array.isArray(employeeId)) {
        throw new Apperror("Invalid employee id", 400);
      }

      const leaveBalance = await this.leaveBalanceService.getLeaveBalanceById(
        companyId,
        new Types.ObjectId(employeeId),
      );

      res.status(200).json({
        success: true,
        message: "Leave balance fetched successfully",
        data: leaveBalance,
      });
    } catch (error) {
      next(error);
    }
  }
  public async getMyLeaveBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      const employeeId = (req as any).user?.employeeId;

      console.log("companyId:", companyId);
      console.log("employeeId:", employeeId);

      if (!companyId || !employeeId) {
        throw new Apperror("Unauthorized", 401);
      }

      const leaveBalance = await this.leaveBalanceService.getLeaveBalanceById(
        new Types.ObjectId(companyId),
        new Types.ObjectId(employeeId),
      );

      res.status(200).json({
        success: true,
        message: "Leave balance fetched successfully",
        data: leaveBalance,
      });
    } catch (error) {
      next(error);
    }
  }
}
