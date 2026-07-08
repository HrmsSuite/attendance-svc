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

  /**
   * POST /api/v1/attendance/check-in
   * Check-in endpoint for employees
   */
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

      const result = await this.attendanceServiceControl.checkIn(
        companyId,
        employeeId,
        req.body,
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

  /**
   * POST /api/v1/attendance/check-out
   * Check-out endpoint for employees
   */
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

      const result = await this.attendanceServiceControl.checkOut(
        companyId,
        employeeId,
        req.body,
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

  /**
   * GET /api/v1/attendance/today-summary
   * Get today's attendance summary for an employee
   */
  public async getTodaySummaryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }
      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.user.id);

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

  // ── Get History ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/attendance/history
   * Get attendance history for an employee within a date range
   */
  public async getHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }
      const companyId = new Types.ObjectId(req.companyId);
      const employeeId = new Types.ObjectId(req.user.id);
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

  /**
   * POST /api/v1/attendance/auto-punch-out
   * Trigger auto punch-out for all incomplete records on a given date
   * (Typically called by a scheduled job)
   */
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

      const result = await this.attendanceServiceControl.runAutoPunchOut(
        companyId,
        attendanceDate,
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
}
