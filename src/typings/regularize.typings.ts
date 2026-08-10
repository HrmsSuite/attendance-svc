// typings/regularize.typings.ts

import { IAttendanceRegularization } from "@hrmssuite/persistence";

export interface AttendanceRegularizationListResult {
  data: IAttendanceRegularization[];
  total: number;
}