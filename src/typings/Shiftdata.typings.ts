import { Types } from "mongoose";

/**
 * Matches the shift document stored in the external shifts repo.
 * `startTime` / `endTime` are "HH:mm" strings — we resolve them
 * to absolute Date objects using the attendance date at runtime.
 */
export interface IShiftData {
  name: string;
  startTime: string;           // "HH:mm" UTC
  endTime: string;             // "HH:mm" UTC
  workingHours: number;        // minutes — e.g. 480
  halfDayThreshold: number;    // minutes — e.g. 240
  weeklyOff: string[];         // ["Saturday","Sunday"]
  overtimeEligible: boolean;
  gracePeriodMinutes: number;  // e.g. 15
  isNightShift: boolean;
  breakDurationMinutes: number;// e.g. 60
  isActive: boolean;
  overtimeAfterMinutes: number;// e.g. 30 — buffer before OT starts
}

export interface IShift {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  data: IShiftData;
}