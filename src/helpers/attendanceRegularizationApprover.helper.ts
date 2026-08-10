// helpers/attendanceRegularizationApprover.helper.ts

import { Types } from "mongoose";

import { BadRequestError, NotFoundError } from "../common/errors";

import { EmployeeClient } from "../client/employee.client";

export interface AttendanceRegularizationPolicyApprover {
  approverId?: unknown;
}

function toObjectId(value: unknown, fieldName: string): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  let normalizedValue: unknown = value;

  // Supports MongoDB Extended JSON:
  // { "$oid": "6a64921043abb8d597520348" }
  if (value && typeof value === "object" && "$oid" in value) {
    normalizedValue = (value as { $oid?: unknown }).$oid;
  }

  if (
    typeof normalizedValue !== "string" ||
    !/^[0-9a-fA-F]{24}$/.test(normalizedValue)
  ) {
    throw new BadRequestError(`${fieldName} must be a valid MongoDB ObjectId.`);
  }

  return new Types.ObjectId(normalizedValue);
}

export async function resolvePolicyApprover(
  companyId: Types.ObjectId,
  policy: AttendanceRegularizationPolicyApprover,
  authToken: string,
  employeeClient: EmployeeClient,
): Promise<Types.ObjectId> {
  if (!policy?.approverId) {
    throw new BadRequestError(
      "Attendance regularization approver is not configured.",
    );
  }

  if (!authToken?.trim()) {
    throw new BadRequestError(
      "Authorization token is required to validate the approver.",
    );
  }

  const approverId = toObjectId(policy.approverId, "policy.approverId");

  const approver = await employeeClient.getEmployee(
    approverId.toString(),
    companyId.toString(),
    authToken,
  );

  if (!approver) {
    throw new NotFoundError(
      "Configured attendance regularization approver was not found.",
    );
  }

  return approverId;
}
