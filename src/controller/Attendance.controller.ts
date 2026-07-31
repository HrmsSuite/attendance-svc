import { NextFunction, Request, Response } from "express";
import { AttendanceServices } from "../services";
import { Types } from "mongoose";
import { AttendanceError } from "../common/errorhandlers";
import { EmployeeClient } from "../client/employee.client";

export class AttendanceController {
  private attendanceServiceControl: AttendanceServices;

  constructor() {
    const employeeClient = new EmployeeClient();
    this.attendanceServiceControl = new AttendanceServices(employeeClient);
  }

  // ── Check In ───────────────────────────────────────────────────────────────

  public async checkInController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.body.employeeId) {
        throw new AttendanceError("Employee ID is required", "INVALID_INPUT");
      }
      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.body.employeeId);
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new AttendanceError(
          "Missing authorization header",
          "UNAUTHORIZED",
        );
      }

      const result = await this.attendanceServiceControl.checkIn(
        companyId,
        employeeId,
        req.body,
        authToken,
      );

      res.status(201).json({
        success: true,
        message: "Check-in successful",
        data: {
          event: result.event,
          daily: result.daily,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Check Out ──────────────────────────────────────────────────────────────

  public async checkOutController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.body.employeeId);

      if (!req.body.employeeId) {
        throw new AttendanceError("Employee ID is required", "INVALID_INPUT");
      }
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new AttendanceError(
          "Missing authorization header",
          "UNAUTHORIZED",
        );
      }

      const result = await this.attendanceServiceControl.checkOut(
        companyId,
        employeeId,
        req.body,
        authToken,
      );

      res.status(200).json({
        success: true,
        message: "Check-out successful",
        data: {
          event: result.event,
          daily: result.daily,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get Today Summary ──────────────────────────────────────────────────────

  public async getTodaySummaryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }

      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.user.employeeId);

      const result = await this.attendanceServiceControl.getTodaySummary(
        companyId,
        employeeId,
      );

      res.status(200).json({
        success: true,
        message: "Today's attendance summary fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Employee Today Summary (admin or hierarchy-based) ─────────────────────

  public async getEmployeeTodaySummaryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const employeeIdParam = req.params.employeeId as string;
      if (!employeeIdParam || !Types.ObjectId.isValid(employeeIdParam)) {
        throw new AttendanceError(
          "Valid employeeId is required",
          "INVALID_INPUT",
        );
      }

      const authHeader = req.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
      }

      const employeeClient = new EmployeeClient();
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      const isAdmin = user.role === "admin";
      const isSelf = user.employeeId === employeeIdParam;
      const isVisible =
        isAdmin || isSelf || visibleEmployeeIds.includes(employeeIdParam);

      if (!isVisible) {
        throw new AttendanceError("Forbidden: insufficient permissions", 403);
      }

      const employeeId = new Types.ObjectId(employeeIdParam);

      const result = await this.attendanceServiceControl.getTodaySummary(
        companyId,
        employeeId,
      );

      res.status(200).json({
        success: true,
        message: "Employee's today summary fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Employee History (admin or hierarchy-based) ───────────────────────────

  public async getEmployeeHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const employeeIdParam = req.params.employeeId as string;
      if (!employeeIdParam || !Types.ObjectId.isValid(employeeIdParam)) {
        throw new AttendanceError(
          "Valid employeeId is required",
          "INVALID_INPUT",
        );
      }

      const fromDate = new Date(req.query.fromDate as string);
      const toDate = new Date(req.query.toDate as string);

      if (!req.query.fromDate || !req.query.toDate) {
        throw new AttendanceError(
          "fromDate and toDate are required",
          "INVALID_INPUT",
        );
      }
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AttendanceError(
          "fromDate and toDate must be valid dates",
          "INVALID_DATE_FORMAT",
        );
      }

      const authHeader = req.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
      }

      const employeeClient = new EmployeeClient();
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      const isAdmin = user.role === "admin";
      const isSelf = user.employeeId === employeeIdParam;
      const isVisible =
        isAdmin || isSelf || visibleEmployeeIds.includes(employeeIdParam);

      if (!isVisible) {
        throw new AttendanceError("Forbidden: insufficient permissions", 403);
      }

      const employeeId = new Types.ObjectId(employeeIdParam);

      const result = await this.attendanceServiceControl.getHistory(
        companyId,
        employeeId,
        fromDate,
        toDate,
      );

      res.status(200).json({
        success: true,
        message: "Employee's attendance history fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get History (self) ─────────────────────────────────────────────────────

  public async getHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.employeeId) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }
      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.user.employeeId);
      const fromDate = new Date(req.query.fromDate as string);
      const toDate = new Date(req.query.toDate as string);

      if (!req.query.fromDate || !req.query.toDate) {
        throw new AttendanceError(
          "fromDate and toDate are required",
          "INVALID_INPUT",
        );
      }

      const result = await this.attendanceServiceControl.getHistory(
        companyId,
        employeeId,
        fromDate,
        toDate,
      );

      res.status(200).json({
        success: true,
        message: "Attendance history fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Run Auto Punch Out ─────────────────────────────────────────────────────

  public async runAutoPunchOutController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const attendanceDate = new Date(req.body.attendanceDate);

      if (!req.body.attendanceDate) {
        throw new AttendanceError(
          "attendanceDate is required",
          "INVALID_INPUT",
        );
      }
      const authToken = req.headers.authorization;

      if (!authToken) {
        throw new AttendanceError(
          "Missing authorization header",
          "UNAUTHORIZED",
        );
      }

      const result = await this.attendanceServiceControl.runAutoPunchOut(
        companyId,
        attendanceDate,
        authToken,
      );

      res.status(200).json({
        success: true,
        message: "Auto punch-out completed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Company History (admin = all, others = visible employees) ─────────────

  public async getCompanyHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const fromDate = new Date(req.query.fromDate as string);
      const toDate = new Date(req.query.toDate as string);

      if (!req.query.fromDate || !req.query.toDate) {
        throw new AttendanceError(
          "fromDate and toDate are required",
          "INVALID_INPUT",
        );
      }
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AttendanceError(
          "fromDate and toDate must be valid dates",
          "INVALID_DATE_FORMAT",
        );
      }

      const authHeader = req.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
      }

      const employeeClient = new EmployeeClient();
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      let result;

      if (user.role === "admin") {
        result = await this.attendanceServiceControl.getCompanyHistory(
          companyId,
          fromDate,
          toDate,
        );
      } else {
        const employeeIds = visibleEmployeeIds.map(
          (id) => new Types.ObjectId(id),
        );

        result =
          await this.attendanceServiceControl.getCompanyHistoryForEmployees(
            companyId,
            employeeIds,
            fromDate,
            toDate,
          );
      }

      res.status(200).json({
        success: true,
        message: "Company attendance history fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Employee Events (admin or hierarchy-based) ────────────────────────────

  public async getEmployeeEventsHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const employeeIdParam = req.params.employeeId;
      if (
        !employeeIdParam ||
        typeof employeeIdParam !== "string" ||
        !Types.ObjectId.isValid(employeeIdParam)
      ) {
        throw new AttendanceError(
          "Valid employeeId is required",
          "INVALID_INPUT",
        );
      }

      const fromDate = new Date(req.query.fromDate as string);
      const toDate = new Date(req.query.toDate as string);

      if (!req.query.fromDate || !req.query.toDate) {
        throw new AttendanceError(
          "fromDate and toDate are required",
          "INVALID_INPUT",
        );
      }
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AttendanceError(
          "fromDate and toDate must be valid dates",
          "INVALID_DATE_FORMAT",
        );
      }

      const authHeader = req.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
      }

      const employeeClient = new EmployeeClient();
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      const isAdmin = user.role === "admin";
      const isSelf = user.employeeId === employeeIdParam;
      const isVisible =
        isAdmin || isSelf || visibleEmployeeIds.includes(employeeIdParam);

      if (!isVisible) {
        throw new AttendanceError("Forbidden: insufficient permissions", 403);
      }

      const employeeId = new Types.ObjectId(employeeIdParam);

      const result =
        await this.attendanceServiceControl.getEmployeeEventsHistory(
          companyId,
          employeeId,
          fromDate,
          toDate,
        );

      res.status(200).json({
        success: true,
        message: "Employee attendance event log fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Company Events (admin = all, others = visible employees) ──────────────

  public async getCompanyEventsHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyIdStr = req.companyId as string;
      const companyId = new Types.ObjectId(companyIdStr);
      const user = req.user as any;

      const fromDate = new Date(req.query.fromDate as string);
      const toDate = new Date(req.query.toDate as string);

      if (!req.query.fromDate || !req.query.toDate) {
        throw new AttendanceError(
          "fromDate and toDate are required",
          "INVALID_INPUT",
        );
      }
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new AttendanceError(
          "fromDate and toDate must be valid dates",
          "INVALID_DATE_FORMAT",
        );
      }

      const authHeader = req.headers.authorization as string;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
      }

      const employeeClient = new EmployeeClient();
      const hierarchy = await employeeClient.getHierarchyMe(authHeader);

      const visibleEmployeeIds =
        user.role === "admin" ? [] : hierarchy.visibleEmployeeIds;

      let result;

      if (user.role === "admin") {
        result = await this.attendanceServiceControl.getCompanyEventsHistory(
          companyId,
          fromDate,
          toDate,
        );
      } else {
        const employeeIds = visibleEmployeeIds.map(
          (id) => new Types.ObjectId(id),
        );

        result =
          await this.attendanceServiceControl.getCompanyEventsHistoryForEmployees(
            companyId,
            employeeIds,
            fromDate,
            toDate,
          );
      }

      res.status(200).json({
        success: true,
        message: "Company attendance event log fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
