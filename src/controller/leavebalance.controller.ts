import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { LeaveBalanceService } from "../services";
import { Apperror } from "../common/errorhandlers";
import { employeeClient } from "../client/employee.client";

export class LeaveBalanceController {
  private leaveBalanceService: LeaveBalanceService;

  constructor() {
    this.leaveBalanceService = new LeaveBalanceService();
  }

  // ── Get All (with hierarchy-based visibility)
  public async getAllLeaveBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const authHeader = req.headers.authorization as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Apperror("Unauthorized", 401);
      }

      // Get hierarchy from employee-svc
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      let leaveBalances;

      if (user.role === "admin") {
        leaveBalances = await this.leaveBalanceService.getAllLeaveBalance(
          companyId,
        );
      } else {
        const employeeIds = visibleEmployeeIds.map(
          (id) => new Types.ObjectId(id),
        );

        leaveBalances =
          await this.leaveBalanceService.getLeaveBalancesForEmployees(
            companyId,
            employeeIds,
          );
      }

      res.status(200).json({
        success: true,
        message: "Leave balances fetched successfully",
        data: leaveBalances,
      });
    } catch (error: any) {
      // Log more details for debugging
      console.error("getAllLeaveBalance error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        configUrl: error?.config?.url,
      });
      next(error);
    }
  }

  // ── Get By Employee (with visibility check)
  public async getLeaveBalanceById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;
      const { employeeId } = req.params;

      if (!employeeId || Array.isArray(employeeId)) {
        throw new Apperror("Invalid employee id", 400);
      }

      const authHeader = req.headers.authorization as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Apperror("Unauthorized", 401);
      }

      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      const isAdmin = user.role === "admin";
      const isSelf = user.employeeId === employeeId;
      const isVisible =
        isAdmin || isSelf || visibleEmployeeIds.includes(employeeId);

      if (!isVisible) {
        throw new Apperror("Forbidden", 403);
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
    } catch (error: any) {
      console.error("getLeaveBalanceById error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        configUrl: error?.config?.url,
      });
      next(error);
    }
  }

  // ── Get My Leave Balance
  public async getMyLeaveBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user as any;
      const companyId = user.companyId as string;
      const employeeId = user.employeeId as string;

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