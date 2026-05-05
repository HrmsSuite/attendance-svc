import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error(`[Error] ${error.message}`);

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};
