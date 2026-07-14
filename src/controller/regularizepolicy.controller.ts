import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { Apperror } from "../common/errorhandlers";
import { AttendanceRegularizationPolicyService } from "../services";

export class AttendanceRegularizationPolicyController {
  private attendanceRegularizationPolicyService: AttendanceRegularizationPolicyService;

  constructor() {
    this.attendanceRegularizationPolicyService =
      new AttendanceRegularizationPolicyService();
  }

  // ── Create
  public async createAttendanceRegularizationPolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("CREATE POLICY CONTROLLER HIT");
      const companyId = new Types.ObjectId(req.companyId);

      const created =
        await this.attendanceRegularizationPolicyService.createAttendanceRegularizationPolicy(
          companyId,
          req.body,
        );

      res.status(201).json({
        success: true,
        message:
          "Attendance regularization policy created successfully",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get
  public async getAttendanceRegularizationPolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const policy =
        await this.attendanceRegularizationPolicyService.getAttendanceRegularizationPolicy(
          companyId,
        );

      res.status(200).json({
        success: true,
        message:
          "Attendance regularization policy fetched successfully",
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Update
  public async updateAttendanceRegularizationPolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const updated =
        await this.attendanceRegularizationPolicyService.updateAttendanceRegularizationPolicy(
          companyId,
          req.body,
        );

      res.status(200).json({
        success: true,
        message:
          "Attendance regularization policy updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Delete (Optional)
  public async deleteAttendanceRegularizationPolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const deleted =
        await this.attendanceRegularizationPolicyService.deleteAttendanceRegularizationPolicy(
          companyId,
        );

      if (!deleted) {
        throw new Apperror(
          "Attendance regularization policy not found",
          404,
        );
      }

      res.status(200).json({
        success: true,
        message:
          "Attendance regularization policy deleted successfully",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
}