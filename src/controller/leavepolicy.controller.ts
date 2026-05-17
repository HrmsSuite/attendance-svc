import { ILeavePolicy } from "@hrmssuite/persistence";
import { NextFunction, Request, Response } from "express";
import { LeavePolicyServices } from "../services";
import { Types } from "mongoose";
import { Apperror } from "../common/errorhandlers";

export class LeavePolicyController {
  private leavepolicyControl: LeavePolicyServices;

  constructor() {
    this.leavepolicyControl = new LeavePolicyServices();
  }

  // ── Create
  public async createLeavePolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);

      const created = await this.leavepolicyControl.createLeavePolicyServices(
        req.body,
        companyId,
        userId,
      );

      res.status(201).json({
        success: true,
        message: "Leave policy created successfully",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get All
  public async getLeavePolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);

      const policies =
        await this.leavepolicyControl.getLeavePolicyServices(companyId);

      res.status(200).json({
        success: true,
        message: "Leave policies fetched successfully",
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Get By Type
  public async getLeavePolicyByTypeController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const { leaveTypeName } = req.params;

      const policy =
        await this.leavepolicyControl.getLeavePolicyByTypeService(
          companyId,
          leaveTypeName as ILeavePolicy["leaveTypeName"],
        );

      res.status(200).json({
        success: true,
        message: "Leave policy fetched successfully",
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Edit
  public async editLeavePolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);
      const id  = req.params.id as string;

      if (!id) {
        throw new Apperror("Policy id is required", 400);
      }

      const updated = await this.leavepolicyControl.editLeavePolicyServices(
        companyId,
        id,
        req.body,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Leave policy updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Delete
  public async deleteLeavePolicyController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.companyId);
      const userId = new Types.ObjectId(req.user?.id);
      const id  = req.params.id as string;

      if (!id) {
        throw new Apperror("Policy id is required", 400);
      }

      const deleted = await this.leavepolicyControl.deleteLeavePolicyService(
        id,
        companyId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Leave policy deleted successfully",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
}