import { Request, Response, NextFunction } from "express";
import { LeaveRequestServices } from "../services";
import { Apperror } from "../common/errorhandlers";

export class LeaveRequestController {
  private service = new LeaveRequestServices();

  // -----------------------------
  // CREATE LEAVE REQUEST
  // -----------------------------
  public createLeaveRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const companyId = (req as any).user?.companyId;
      const employeeId = (req as any).user?.employeeId;
      if (!companyId)
        throw new Apperror("Unauthorized: companyId missing", 401);

      const result = await this.service.createLeaveRequest(
        { ...req.body, employeeId },
        companyId,
      );

      res.status(201).json({
        success: true,
        message: "Leave request created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // APPROVE / REJECT
  // -----------------------------
  public approveLeaveRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.approveLeaveRequest(req.body);

      res.status(200).json({
        success: true,
        message: `Leave request ${req.body.action} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // CANCEL
  // -----------------------------
  public cancelLeaveRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.cancelLeaveRequest(req.body);

      res.status(200).json({
        success: true,
        message: "Leave request cancelled successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // WITHDRAW
  // -----------------------------
  public withdrawLeaveRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.withdrawLeaveRequest(req.body);

      res.status(200).json({
        success: true,
        message: "Leave request withdrawn successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // GET TEAM REQUESTS
  // -----------------------------
  public getTeamLeaveRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const managerId = req.params.managerId as string;
      if (!managerId) {
        throw new Apperror("manager ID is required", 400);
      }
      const result = await this.service.getTeamLeaveRequests(managerId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // GET EMPLOYEE HISTORY
  // -----------------------------
  public getEmployeeLeaveHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const employeeId = req.params.employeeId as string;
      if (!employeeId) {
        throw new Apperror("employee id is required", 400);
      }

      const result = await this.service.getEmployeeLeaveHistory(employeeId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // GET BY ID
  // -----------------------------
  public getLeaveRequestById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = req.params.id as string;

      if (!id) {
        throw new Apperror("id is required", 400);
      }

      const result = await this.service.getLeaveRequestById(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // -----------------------------
  // CALENDAR
  // -----------------------------
  public getLeaveCalendar = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.getLeaveCalendar(req.query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllLeaveRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) throw new Apperror("Unauthorized", 401);

      const result = await this.service.getAllLeaveRequests(companyId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public getAdminPendingApprovals = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const companyId = (req as any).user?.companyId;
      const approverId = (req as any).user?.employeeId;
      if (!companyId || !approverId) throw new Apperror("Unauthorized", 401);

      const result = await this.service.getAdminPendingApprovals(
        companyId,
        approverId,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public getMyPendingApprovals = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = (req as any).user;
      const approverId = user?.employeeId; // or user.id, depending on your design

      if (!approverId) {
        throw new Apperror("Unauthorized", 401);
      }

      const result = await this.service.getPendingApprovals(approverId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
