// helpers/employeeLookupStages.ts

import { PipelineStage } from "mongoose";

/**
 * Only employee fields that should be returned.
 *
 * Employee document structure:
 * data.basic.employeeId
 * data.basic.firstName
 * data.basic.lastName
 * data.basic.email
 * data.basic.phone
 */
const employeeProject = {
  _id: 1,
  employeeId: "$data.basic.employeeId",
  firstName: "$data.basic.firstName",
  lastName: "$data.basic.lastName",
  email: "$data.basic.email",
  phone: "$data.basic.phone",
};

/**
 * Creates a lookup for an employee reference field.
 *
 * Example:
 *
 * employeeId -> employee
 * approverId -> approver
 * createdBy -> createdByEmployee
 */
const createEmployeeLookup = (
  localField: string,
  outputField: string,
): PipelineStage.Lookup => ({
  $lookup: {
    from: "employees",

    // IMPORTANT:
    // Do NOT pass "$employeeId" here.
    // localField must be "employeeId".
    localField,

    foreignField: "_id",

    pipeline: [
      {
        $project: employeeProject,
      },
    ],

    as: outputField,
  },
});

export const employeeLookupStages: PipelineStage[] = [
  // =====================================================
  // REQUEST EMPLOYEE
  // employeeId -> employee
  // =====================================================
  createEmployeeLookup("employeeId", "employee"),

  // =====================================================
  // APPROVER
  // approverId -> approver
  // =====================================================
  createEmployeeLookup("approverId", "approver"),

  // =====================================================
  // CREATED BY
  // createdBy -> createdByEmployee
  // =====================================================
  createEmployeeLookup("createdBy", "createdByEmployee"),

  // =====================================================
  // UPDATED BY
  // updatedBy -> updatedByEmployee
  // =====================================================
  createEmployeeLookup("updatedBy", "updatedByEmployee"),

  // =====================================================
  // REVIEWED BY
  // reviewedBy -> reviewedByEmployee
  // =====================================================
  createEmployeeLookup("reviewedBy", "reviewedByEmployee"),

  // =====================================================
  // APPROVAL HISTORY PERFORMED BY
  // =====================================================
  {
    $lookup: {
      from: "employees",

      let: {
        performedByIds: {
          $map: {
            input: {
              $ifNull: ["$approvalHistory", []],
            },
            as: "history",
            in: "$$history.performedBy",
          },
        },
      },

      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$_id", "$$performedByIds"],
            },
          },
        },

        {
          $project: employeeProject,
        },
      ],

      as: "approvalHistoryEmployees",
    },
  },

  // =====================================================
  // CONVERT LOOKUP ARRAYS TO OBJECTS
  // =====================================================
  {
    $set: {
      employee: {
        $arrayElemAt: ["$employee", 0],
      },

      approver: {
        $arrayElemAt: ["$approver", 0],
      },

      createdByEmployee: {
        $arrayElemAt: ["$createdByEmployee", 0],
      },

      updatedByEmployee: {
        $arrayElemAt: ["$updatedByEmployee", 0],
      },

      reviewedByEmployee: {
        $arrayElemAt: ["$reviewedByEmployee", 0],
      },
    },
  },

  // =====================================================
  // ADD EMPLOYEE DETAILS TO APPROVAL HISTORY
  // =====================================================
  {
    $set: {
      approvalHistory: {
        $map: {
          input: {
            $ifNull: ["$approvalHistory", []],
          },

          as: "history",

          in: {
            $mergeObjects: [
              "$$history",

              {
                performedByEmployee: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$approvalHistoryEmployees",

                        as: "historyEmployee",

                        cond: {
                          $eq: [
                            "$$historyEmployee._id",
                            "$$history.performedBy",
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            ],
          },
        },
      },
    },
  },

  // =====================================================
  // REMOVE TEMPORARY ARRAY
  // =====================================================
  {
    $unset: "approvalHistoryEmployees",
  },

  // =====================================================
  // FINAL RESPONSE
  // =====================================================
  {
    $project: {
      _id: 1,
      companyId: 1,

      employeeId: 1,
      employee: 1,

      approverId: 1,
      approver: 1,

      createdBy: 1,
      createdByEmployee: 1,

      updatedBy: 1,
      updatedByEmployee: 1,

      reviewedBy: 1,
      reviewedByEmployee: 1,

      attendanceDailyId: 1,
      attendanceDate: 1,

      currentCheckIn: 1,
      currentCheckOut: 1,

      requestedCheckIn: 1,
      requestedCheckOut: 1,

      regularizationType: 1,
      requestSource: 1,

      reason: 1,
      attachments: 1,

      status: 1,
      approvalHistory: 1,

      isAttendanceUpdated: 1,
      attendanceUpdatedAt: 1,

      payrollAffected: 1,

      reviewRemarks: 1,
      reviewedAt: 1,

      monthlyRequestCount: 1,

      isDeleted: 1,
      deletedAt: 1,

      createdAt: 1,
      updatedAt: 1,
    },
  },
];
