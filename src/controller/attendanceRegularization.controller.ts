// controllers/attendanceRegularization.controller.ts

import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { BadRequestError } from "../common/errors";
import { AttendanceRegularizationService } from "../services";
import { RegularizationStatus } from "@hrmssuite/persistence";

export class AttendanceRegularizationController {
  private attendanceRegularizationService = new AttendanceRegularizationService(
    undefined as any, // TODO: inject real EmployeeClient
  );

  /**
   * Create Draft Regularization Request
   * POST /attendance-regularizations/draft
   */
  public async createDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const employeeId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );

      const {
        attendanceDailyId,
        attendanceDate,
        regularizationType,
        requestedCheckIn,
        requestedCheckOut,
        requestSource,
        reason,
        attachments,
      } = req.body;

      if (!attendanceDailyId || !attendanceDate || !regularizationType) {
        throw new BadRequestError(
          "attendanceDailyId, attendanceDate, and regularizationType are required.",
        );
      }

      const attendance = {
        attendanceDate: new Date(attendanceDate),
        firstCheckIn: null as Date | null,
        lastCheckOut: null as Date | null,
      };

      const approverId =
        await this.attendanceRegularizationService.getApproverIdForEmployee(
          companyId,
          employeeId,
          req.headers.authorization ?? "",
        );

      const created = await this.attendanceRegularizationService.createDraft(
        companyId,
        employeeId,
        approverId,
        attendance,
        {
          attendanceDailyId,
          regularizationType,
          requestSource: requestSource ?? "WEB",
          requestedCheckIn: requestedCheckIn
            ? new Date(requestedCheckIn)
            : undefined,
          requestedCheckOut: requestedCheckOut
            ? new Date(requestedCheckOut)
            : undefined,
          reason,
          attachments,
        },
      );

      res.status(201).json({
        success: true,
        message: "Draft regularization request created successfully",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Draft
   * PATCH /attendance-regularizations/:id/draft
   */
  public async updateDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const employeeId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const requestId = new Types.ObjectId(req.params.id as string);

      const updated = await this.attendanceRegularizationService.updateDraft(
        companyId,
        employeeId,
        requestId,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Draft regularization request updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit Draft
   * POST /attendance-regularizations/:id/submit
   */
  public async submitDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const employeeId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const requestId = new Types.ObjectId(req.params.id as string);

      const context =
        await this.attendanceRegularizationService.buildSubmitContext(
          companyId,
          employeeId,
          new Date(req.body.attendanceDate),
        );

      const submitted = await this.attendanceRegularizationService.submitDraft(
        companyId,
        employeeId,
        requestId,
        context,
      );

      res.status(200).json({
        success: true,
        message: "Regularization request submitted successfully",
        data: submitted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw Request
   * POST /attendance-regularizations/:id/withdraw
   */
  public async withdraw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const employeeId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const requestId = new Types.ObjectId(req.params.id as string);

      const withdrawn = await this.attendanceRegularizationService.withdraw(
        companyId,
        requestId,
        employeeId,
      );

      res.status(200).json({
        success: true,
        message: "Regularization request withdrawn successfully",
        data: withdrawn,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve Request
   * POST /attendance-regularizations/:id/approve
   */
  public async approve(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const approverId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const requestId = new Types.ObjectId(req.params.id as string);

      const { remarks } = req.body;

      const approved = await this.attendanceRegularizationService.approve(
        companyId,
        requestId,
        approverId,
        remarks,
      );

      res.status(200).json({
        success: true,
        message: "Regularization request approved successfully",
        data: approved,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject Request
   * POST /attendance-regularizations/:id/reject
   */
  public async reject(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const approverId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const requestId = new Types.ObjectId(req.params.id as string);

      const { remarks } = req.body;

      if (!remarks || !remarks.trim()) {
        throw new BadRequestError("Remarks are required to reject a request.");
      }

      const rejected = await this.attendanceRegularizationService.reject(
        companyId,
        requestId,
        approverId,
        remarks,
      );

      res.status(200).json({
        success: true,
        message: "Regularization request rejected successfully",
        data: rejected,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Request By Id
   * GET /attendance-regularizations/:id
   */
  public async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const requestId = new Types.ObjectId(req.params.id as string);

      const request = await this.attendanceRegularizationService.getById(
        companyId,
        requestId,
      );

      res.status(200).json({
        success: true,
        message: "Regularization request fetched successfully",
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Requests For Employee
   * GET /attendance-regularizations/employee/:employeeId
   */
  public async listForEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const employeeId = new Types.ObjectId(req.params.employeeId as string);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const requests =
        await this.attendanceRegularizationService.listForEmployee(
          companyId,
          employeeId,
          page,
          limit,
        );

      res.status(200).json({
        success: true,
        message: "Employee regularization requests fetched successfully",
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Pending Requests For Approver
   * GET /attendance-regularizations/pending
   */
  public async listPendingForApprover(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);
      const approverId = new Types.ObjectId(
        (req.user as any).employeeId as string,
      );
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const requests =
        await this.attendanceRegularizationService.listPendingForApprover(
          companyId,
          approverId,
          page,
          limit,
        );

      res.status(200).json({
        success: true,
        message: "Pending regularization requests fetched successfully",
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
  public async getByStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const status = req.params.status as RegularizationStatus;

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const data = await this.attendanceRegularizationService.getByStatus(
        companyId,
        status,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
  public async getByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const date = new Date(req.query.date as string);

      const data = await this.attendanceRegularizationService.getByDate(
        companyId,
        date,
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
  public async getByMonth(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const year = Number(req.query.year);
      const month = Number(req.query.month);

      const data = await this.attendanceRegularizationService.getByMonth(
        companyId,
        year,
        month,
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
  public async getByEmployeeAndStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const employeeId = new Types.ObjectId(req.params.employeeId as string);

      const status = req.params.status as RegularizationStatus;

      const data =
        await this.attendanceRegularizationService.getByEmployeeAndStatus(
          companyId,
          employeeId,
          status,
        );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
  public async getForPayrollPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);

      const data =
        await this.attendanceRegularizationService.getForPayrollPeriod(
          companyId,
          from,
          to,
        );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
  public async countPending(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const count =
        await this.attendanceRegularizationService.countPending(companyId);

      res.status(200).json({
        success: true,
        count,
      });
    } catch (err) {
      next(err);
    }
  }
  public async dashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = new Types.ObjectId(req.companyId as string);

      const stats =
        await this.attendanceRegularizationService.dashboardStats(companyId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
