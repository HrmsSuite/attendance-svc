import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { AttendanceServices } from "../services";
import { AttendanceError } from "../common/errorhandlers";
import { EmployeeClient } from "../client/employee.client";

export class AttendanceController {
  private attendanceServiceControl: AttendanceServices;

  constructor() {
    const employeeClient = new EmployeeClient();
    this.attendanceServiceControl = new AttendanceServices(employeeClient);
  }

  // ---------------------------------------------------------------------------
  // Common helpers
  // ---------------------------------------------------------------------------

  private getUser(req: Request): any {
    return req.user as any;
  }

  private getRole(req: Request): string {
    const user = this.getUser(req);
    return String(user?.role ?? "").toLowerCase();
  }

  private isAdmin(req: Request): boolean {
    return this.getRole(req) === "admin";
  }

  private getCompanyObjectId(req: Request): Types.ObjectId {
    const companyId = req.companyId as string;

    console.log("[Attendance] companyId:", companyId);

    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new AttendanceError(
        "Valid company ID is required",
        "INVALID_COMPANY_ID",
      );
    }

    return new Types.ObjectId(companyId);
  }

  private getEmployeeObjectId(employeeId: unknown): Types.ObjectId {
    if (
      typeof employeeId !== "string" ||
      !employeeId ||
      !Types.ObjectId.isValid(employeeId)
    ) {
      throw new AttendanceError(
        "Valid employee ID is required",
        "INVALID_INPUT",
      );
    }

    return new Types.ObjectId(employeeId);
  }

  private getAuthHeader(req: Request): string {
    const authHeader = req.headers.authorization;

    console.log("[Attendance] Authorization header:", {
      present: Boolean(authHeader),
      validBearer: Boolean(authHeader?.startsWith("Bearer ")),
    });

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AttendanceError("Unauthorized", "UNAUTHORIZED");
    }

    return authHeader;
  }

  private getDateRange(req: Request): {
    fromDate: Date;
    toDate: Date;
  } {
    const fromDateParam = req.query.fromDate;
    const toDateParam = req.query.toDate;

    console.log("[Attendance] Date query:", {
      fromDate: fromDateParam,
      toDate: toDateParam,
    });

    if (
      typeof fromDateParam !== "string" ||
      typeof toDateParam !== "string"
    ) {
      throw new AttendanceError(
        "fromDate and toDate are required",
        "INVALID_INPUT",
      );
    }

    const fromDate = new Date(`${fromDateParam}T00:00:00.000Z`);
    const toDate = new Date(`${toDateParam}T23:59:59.999Z`);

    if (Number.isNaN(fromDate.getTime())) {
      throw new AttendanceError(
        "fromDate must be a valid date",
        "INVALID_DATE_FORMAT",
      );
    }

    if (Number.isNaN(toDate.getTime())) {
      throw new AttendanceError(
        "toDate must be a valid date",
        "INVALID_DATE_FORMAT",
      );
    }

    if (fromDate > toDate) {
      throw new AttendanceError(
        "fromDate cannot be greater than toDate",
        "INVALID_DATE_RANGE",
      );
    }

    console.log("[Attendance] Parsed date range:", {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });

    return { fromDate, toDate };
  }

  private async getVisibleEmployeeIds(
    req: Request,
    authHeader: string,
  ): Promise<Types.ObjectId[]> {
    const user = this.getUser(req);
    const role = this.getRole(req);

    console.log("[Attendance] Access information:", {
      userId: user?._id,
      employeeId: user?.employeeId,
      role,
      isAdmin: role === "admin",
    });

    // Admins do not need a hierarchy request.
    if (role === "admin") {
      console.log(
        "[Attendance] Admin user detected. Skipping hierarchy request.",
      );
      return [];
    }

    const employeeClient = new EmployeeClient();

    console.log("[Attendance] Requesting employee hierarchy...");

    const hierarchy = await employeeClient.getHierarchyMe(authHeader);

    console.log("[Attendance] Hierarchy response:", {
      received: Boolean(hierarchy),
      visibleEmployeeIds: hierarchy?.visibleEmployeeIds,
    });

    const visibleEmployeeIds = Array.isArray(hierarchy?.visibleEmployeeIds)
      ? hierarchy.visibleEmployeeIds
      : [];

    const validEmployeeIds = visibleEmployeeIds.filter((id: unknown) => {
      return typeof id === "string" && Types.ObjectId.isValid(id);
    });

    console.log("[Attendance] Valid visible employee IDs:", validEmployeeIds);

    return validEmployeeIds.map(
      (id: string) => new Types.ObjectId(id),
    );
  }

  private logControllerError(
    controllerName: string,
    req: Request,
    error: unknown,
  ): void {
    console.error(`[Attendance][${controllerName}] Failed`, {
      method: req.method,
      path: req.originalUrl,
      companyId: req.companyId,
      userId: (req.user as any)?._id,
      employeeId: (req.user as any)?.employeeId,
      role: (req.user as any)?.role,
      error,
    });
  }

  // ---------------------------------------------------------------------------
  // Check in
  // ---------------------------------------------------------------------------

  public async checkInController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("[Attendance][CheckIn] Request body:", req.body);

      if (!req.body?.employeeId) {
        throw new AttendanceError(
          "Employee ID is required",
          "INVALID_INPUT",
        );
      }

      const companyId = this.getCompanyObjectId(req);
      const employeeId = this.getEmployeeObjectId(req.body.employeeId);
      const authToken = this.getAuthHeader(req);

      const result = await this.attendanceServiceControl.checkIn(
        companyId,
        employeeId,
        req.body,
        authToken,
      );

      console.log("[Attendance][CheckIn] Success:", {
        companyId: companyId.toString(),
        employeeId: employeeId.toString(),
      });

      res.status(201).json({
        success: true,
        message: "Check-in successful",
        data: {
          event: result.event,
          daily: result.daily,
        },
      });
    } catch (error) {
      this.logControllerError("CheckIn", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Check out
  // ---------------------------------------------------------------------------

  public async checkOutController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("[Attendance][CheckOut] Request body:", req.body);

      if (!req.body?.employeeId) {
        throw new AttendanceError(
          "Employee ID is required",
          "INVALID_INPUT",
        );
      }

      const companyId = this.getCompanyObjectId(req);
      const employeeId = this.getEmployeeObjectId(req.body.employeeId);
      const authToken = this.getAuthHeader(req);

      const result = await this.attendanceServiceControl.checkOut(
        companyId,
        employeeId,
        req.body,
        authToken,
      );

      console.log("[Attendance][CheckOut] Success:", {
        companyId: companyId.toString(),
        employeeId: employeeId.toString(),
      });

      res.status(200).json({
        success: true,
        message: "Check-out successful",
        data: {
          event: result.event,
          daily: result.daily,
        },
      });
    } catch (error) {
      this.logControllerError("CheckOut", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Today summary
  // ---------------------------------------------------------------------------

  public async getTodaySummaryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = this.getUser(req);

      if (!user?.employeeId) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }

      const companyId = this.getCompanyObjectId(req);
      const employeeId = this.getEmployeeObjectId(user.employeeId);

      console.log("[Attendance][TodaySummary] Request:", {
        companyId: companyId.toString(),
        employeeId: employeeId.toString(),
      });

      const result =
        await this.attendanceServiceControl.getTodaySummary(
          companyId,
          employeeId,
        );

      res.status(200).json({
        success: true,
        message: "Today's attendance summary fetched successfully",
        data: result,
      });
    } catch (error) {
      this.logControllerError("TodaySummary", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Employee today summary
  // ---------------------------------------------------------------------------

  public async getEmployeeTodaySummaryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = this.getUser(req);
      const companyId = this.getCompanyObjectId(req);

      const employeeIdParam = req.params.employeeId;
      const employeeId = this.getEmployeeObjectId(employeeIdParam);

      const authHeader = this.getAuthHeader(req);
      const isAdmin = this.isAdmin(req);
      const isSelf = String(user?.employeeId) === employeeIdParam;

      let isVisible = isAdmin || isSelf;

      if (!isVisible) {
        const visibleEmployeeIds = await this.getVisibleEmployeeIds(
          req,
          authHeader,
        );

        isVisible = visibleEmployeeIds.some(
          (id) => id.toString() === employeeIdParam,
        );
      }

      console.log("[Attendance][EmployeeTodaySummary] Access check:", {
        employeeId: employeeIdParam,
        isAdmin,
        isSelf,
        isVisible,
      });

      if (!isVisible) {
        throw new AttendanceError(
          "Forbidden: insufficient permissions",
          "FORBIDDEN",
        );
      }

      const result =
        await this.attendanceServiceControl.getTodaySummary(
          companyId,
          employeeId,
        );

      res.status(200).json({
        success: true,
        message: "Employee's today summary fetched successfully",
        data: result,
      });
    } catch (error) {
      this.logControllerError("EmployeeTodaySummary", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Employee history
  // ---------------------------------------------------------------------------

  public async getEmployeeHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = this.getUser(req);
      const companyId = this.getCompanyObjectId(req);

      const employeeIdParam = req.params.employeeId;
      const employeeId = this.getEmployeeObjectId(employeeIdParam);

      const { fromDate, toDate } = this.getDateRange(req);
      const authHeader = this.getAuthHeader(req);

      const isAdmin = this.isAdmin(req);
      const isSelf = String(user?.employeeId) === employeeIdParam;

      let isVisible = isAdmin || isSelf;

      if (!isVisible) {
        const visibleEmployeeIds = await this.getVisibleEmployeeIds(
          req,
          authHeader,
        );

        isVisible = visibleEmployeeIds.some(
          (id) => id.toString() === employeeIdParam,
        );
      }

      console.log("[Attendance][EmployeeHistory] Access check:", {
        employeeId: employeeIdParam,
        isAdmin,
        isSelf,
        isVisible,
      });

      if (!isVisible) {
        throw new AttendanceError(
          "Forbidden: insufficient permissions",
          "FORBIDDEN",
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
        message: "Employee's attendance history fetched successfully",
        data: result,
      });
    } catch (error) {
      this.logControllerError("EmployeeHistory", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Own history
  // ---------------------------------------------------------------------------

  public async getHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = this.getUser(req);

      if (!user?.employeeId) {
        throw new AttendanceError(
          "Unauthorized: user not found on request",
          "UNAUTHORIZED",
        );
      }

      const companyId = this.getCompanyObjectId(req);
      const employeeId = this.getEmployeeObjectId(user.employeeId);
      const { fromDate, toDate } = this.getDateRange(req);

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
      this.logControllerError("History", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Auto punch out
  // ---------------------------------------------------------------------------

  public async runAutoPunchOutController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.body?.attendanceDate) {
        throw new AttendanceError(
          "attendanceDate is required",
          "INVALID_INPUT",
        );
      }

      const companyId = this.getCompanyObjectId(req);
      const attendanceDate = new Date(req.body.attendanceDate);

      if (Number.isNaN(attendanceDate.getTime())) {
        throw new AttendanceError(
          "attendanceDate must be a valid date",
          "INVALID_DATE_FORMAT",
        );
      }

      const authToken = this.getAuthHeader(req);

      console.log("[Attendance][AutoPunchOut] Request:", {
        companyId: companyId.toString(),
        attendanceDate: attendanceDate.toISOString(),
      });

      const result =
        await this.attendanceServiceControl.runAutoPunchOut(
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
      this.logControllerError("AutoPunchOut", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Company history
  // ---------------------------------------------------------------------------

  public async getCompanyHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("[Attendance][CompanyHistory] Starting request");

      const companyId = this.getCompanyObjectId(req);
      const { fromDate, toDate } = this.getDateRange(req);
      const authHeader = this.getAuthHeader(req);

      const isAdmin = this.isAdmin(req);

      console.log("[Attendance][CompanyHistory] User details:", {
        role: this.getRole(req),
        isAdmin,
        companyId: companyId.toString(),
      });

      let result;

      if (isAdmin) {
        console.log(
          "[Attendance][CompanyHistory] Loading all company records",
        );

        result =
          await this.attendanceServiceControl.getCompanyHistory(
            companyId,
            fromDate,
            toDate,
          );
      } else {
        const employeeIds = await this.getVisibleEmployeeIds(
          req,
          authHeader,
        );

        console.log(
          "[Attendance][CompanyHistory] Loading visible employee records:",
          employeeIds.map((id) => id.toString()),
        );

        result =
          await this.attendanceServiceControl
            .getCompanyHistoryForEmployees(
              companyId,
              employeeIds,
              fromDate,
              toDate,
            );
      }

      console.log("[Attendance][CompanyHistory] Success");

      res.status(200).json({
        success: true,
        message: "Company attendance history fetched successfully",
        data: result,
      });
    } catch (error) {
      this.logControllerError("CompanyHistory", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Employee events
  // ---------------------------------------------------------------------------

  public async getEmployeeEventsHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = this.getUser(req);
      const companyId = this.getCompanyObjectId(req);

      const employeeIdParam = req.params.employeeId;
      const employeeId = this.getEmployeeObjectId(employeeIdParam);

      const { fromDate, toDate } = this.getDateRange(req);
      const authHeader = this.getAuthHeader(req);

      const isAdmin = this.isAdmin(req);
      const isSelf = String(user?.employeeId) === employeeIdParam;

      let isVisible = isAdmin || isSelf;

      if (!isVisible) {
        const visibleEmployeeIds = await this.getVisibleEmployeeIds(
          req,
          authHeader,
        );

        isVisible = visibleEmployeeIds.some(
          (id) => id.toString() === employeeIdParam,
        );
      }

      console.log("[Attendance][EmployeeEvents] Access check:", {
        employeeId: employeeIdParam,
        isAdmin,
        isSelf,
        isVisible,
      });

      if (!isVisible) {
        throw new AttendanceError(
          "Forbidden: insufficient permissions",
          "FORBIDDEN",
        );
      }

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
      this.logControllerError("EmployeeEvents", req, error);
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Company events
  // ---------------------------------------------------------------------------

  public async getCompanyEventsHistoryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("[Attendance][CompanyEvents] Starting request");

      const companyId = this.getCompanyObjectId(req);
      const { fromDate, toDate } = this.getDateRange(req);
      const authHeader = this.getAuthHeader(req);

      const isAdmin = this.isAdmin(req);

      console.log("[Attendance][CompanyEvents] User details:", {
        role: this.getRole(req),
        isAdmin,
        companyId: companyId.toString(),
      });

      let result;

      if (isAdmin) {
        console.log(
          "[Attendance][CompanyEvents] Loading all company events",
        );

        result =
          await this.attendanceServiceControl
            .getCompanyEventsHistory(
              companyId,
              fromDate,
              toDate,
            );
      } else {
        const employeeIds = await this.getVisibleEmployeeIds(
          req,
          authHeader,
        );

        console.log(
          "[Attendance][CompanyEvents] Loading visible employee events:",
          employeeIds.map((id) => id.toString()),
        );

        result =
          await this.attendanceServiceControl
            .getCompanyEventsHistoryForEmployees(
              companyId,
              employeeIds,
              fromDate,
              toDate,
            );
      }

      console.log("[Attendance][CompanyEvents] Success");

      res.status(200).json({
        success: true,
        message: "Company attendance event log fetched successfully",
        data: result,
      });
    } catch (error) {
      this.logControllerError("CompanyEvents", req, error);
      next(error);
    }
  }
}