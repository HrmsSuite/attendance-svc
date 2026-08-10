// controllers/attendanceRegularization.controller.ts

import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { RegularizationStatus } from "@hrmssuite/persistence";

import { BadRequestError, ForbiddenError } from "../common/errors";
import { AttendanceRegularizationService } from "../services";
import { employeeClient } from "../client/employee.client";

function toObjectId(value: unknown, fieldName: string): Types.ObjectId {
  if (typeof value !== "string" || !Types.ObjectId.isValid(value)) {
    throw new BadRequestError(`${fieldName} must be a valid MongoDB ObjectId.`);
  }

  return new Types.ObjectId(value);
}

function toValidDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${fieldName} is required.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date.`);
  }

  return date;
}

function getPagination(req: Request): {
  page: number;
  limit: number;
} {
  const rawPage = Number(req.query.page);
  const rawLimit = Number(req.query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  return {
    page,
    limit,
  };
}

function getEmployeeId(req: Request): Types.ObjectId {
  const user = req.user as
    | {
        employeeId?: unknown;
      }
    | undefined;

  return toObjectId(user?.employeeId, "req.user.employeeId");
}

function getAuthorization(req: Request): string {
  const authorization = req.headers.authorization;

  if (typeof authorization !== "string" || !authorization.trim()) {
    throw new BadRequestError("Authorization header is required.");
  }

  return authorization;
}

export class AttendanceRegularizationController {
  private readonly attendanceRegularizationService =
    new AttendanceRegularizationService(employeeClient);

  /**
   * POST /attendance-regularizations/draft
   */
  public async createDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = getEmployeeId(req);
      const authorization = getAuthorization(req);

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

      const validatedAttendanceDailyId = toObjectId(
        attendanceDailyId,
        "attendanceDailyId",
      );

      if (
        typeof regularizationType !== "string" ||
        !regularizationType.trim()
      ) {
        throw new BadRequestError("regularizationType is required.");
      }

      const parsedAttendanceDate = toValidDate(
        attendanceDate,
        "attendanceDate",
      );

      const parsedRequestedCheckIn = requestedCheckIn
        ? toValidDate(requestedCheckIn, "requestedCheckIn")
        : undefined;

      const parsedRequestedCheckOut = requestedCheckOut
        ? toValidDate(requestedCheckOut, "requestedCheckOut")
        : undefined;

      const created = await this.attendanceRegularizationService.createDraft(
        companyId,
        employeeId,
        {
          attendanceDate: parsedAttendanceDate,
          firstCheckIn: null,
          lastCheckOut: null,
        },
        {
          attendanceDailyId: validatedAttendanceDailyId.toString(),
          regularizationType: regularizationType as any,
          requestSource: requestSource ?? "WEB",
          requestedCheckIn: parsedRequestedCheckIn,
          requestedCheckOut: parsedRequestedCheckOut,
          reason,
          attachments,
        },
        authorization,
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
   * PATCH /attendance-regularizations/:id/draft
   */
  public async updateDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = getEmployeeId(req);

      const requestId = toObjectId(req.params.id, "request id");

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
   * POST /attendance-regularizations/:id/submit
   */
  public async submitDraft(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = getEmployeeId(req);
      const authorization = getAuthorization(req);

      const requestId = toObjectId(req.params.id, "request id");

      const attendanceDate = toValidDate(
        req.body.attendanceDate,
        "attendanceDate",
      );

      const context =
        await this.attendanceRegularizationService.buildSubmitContext(
          companyId,
          employeeId,
          attendanceDate,
        );

      const submitted = await this.attendanceRegularizationService.submitDraft(
        companyId,
        employeeId,
        requestId,
        context,
        authorization,
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
   * POST /attendance-regularizations/:id/withdraw
   */
  public async withdraw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = getEmployeeId(req);

      const requestId = toObjectId(req.params.id, "request id");

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
   * POST /attendance-regularizations/:id/approve
   */
  public async approve(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const approverId = getEmployeeId(req);

      const requestId = toObjectId(req.params.id, "request id");

      const authorization = req.headers.authorization; // add

      if (typeof authorization !== "string" || !authorization.trim()) {
        throw new BadRequestError("Authorization header is required.");
      }

      const approved = await this.attendanceRegularizationService.approve(
        companyId,
        requestId,
        approverId,
        authorization,
        req.body.remarks,
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
   * POST /attendance-regularizations/:id/reject
   */
  public async reject(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const approverId = getEmployeeId(req);

      const requestId = toObjectId(req.params.id, "request id");

      const remarks = req.body.remarks;

      if (typeof remarks !== "string" || !remarks.trim()) {
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
   * GET /attendance-regularizations/:id
   */
  public async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const requestId = toObjectId(req.params.id, "request id");

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
   * GET /attendance-regularizations/employee/:employeeId
   */
  public async listForEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = toObjectId(req.params.employeeId, "employeeId");

      const { page, limit } = getPagination(req);

      const result = await this.attendanceRegularizationService.listForEmployee(
        companyId,
        employeeId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "Employee regularization requests fetched successfully",
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/my-regularization
   */
  public async listMyRequests(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");
      const employeeId = getEmployeeId(req);

      const { page, limit } = getPagination(req);

      const result = await this.attendanceRegularizationService.listMyRequests(
        companyId,
        employeeId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "My regularization requests fetched successfully",
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * GET /regularizerequest/all
   */
  public async listAllForCompany(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const { page, limit } = getPagination(req);

      const result =
        await this.attendanceRegularizationService.listAllForCompany(
          companyId,
          page,
          limit,
        );

      console.log("[Regularization][All] Result:", {
        count: result.data.length,
        total: result.total,
      });

      res.status(200).json({
        success: true,
        message: "All regularization requests fetched successfully",
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      console.error("[Regularization][All] Failed:", error);
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/pending
   */
  public async listPendingForApprover(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");
      const approverId = getEmployeeId(req);

      const { page, limit } = getPagination(req);

      const result =
        await this.attendanceRegularizationService.listPendingForApprover(
          companyId,
          approverId,
          page,
          limit,
        );

      res.status(200).json({
        success: true,
        message: "Pending regularization requests fetched successfully",
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/status/:status
   */
  public async getByStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/date
   */
  public async getByDate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const date = toValidDate(req.query.date, "date");

      const data = await this.attendanceRegularizationService.getByDate(
        companyId,
        date,
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/month
   */
  public async getByMonth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const year = Number(req.query.year);
      const month = Number(req.query.month);

      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        throw new BadRequestError("Valid year and month are required.");
      }

      const data = await this.attendanceRegularizationService.getByMonth(
        companyId,
        year,
        month,
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/employee/:employeeId/status/:status
   */
  public async getByEmployeeAndStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const employeeId = toObjectId(req.params.employeeId, "employeeId");

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/payroll-period
   */
  public async getForPayrollPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const from = toValidDate(req.query.from, "from");

      const to = toValidDate(req.query.to, "to");

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/pending/count
   */
  public async countPending(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const count =
        await this.attendanceRegularizationService.countPending(companyId);

      res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /attendance-regularizations/dashboard
   */
  public async dashboardStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = toObjectId(req.companyId, "req.companyId");

      const stats =
        await this.attendanceRegularizationService.dashboardStats(companyId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
