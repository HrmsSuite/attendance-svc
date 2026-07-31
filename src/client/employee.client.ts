import axios from "axios";

export interface IEmployee {
  _id: string;
  companyId: string;
  data: {
    basic: {
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    job: {
      employeeStatus: string;
      shiftId: string;
      attendanceMode: string;
      department: string;
    };
  };
}

export interface HierarchyMeResponse {
  success: boolean;
  data: {
    me: string;
    reports: string[];
    visibleEmployeeIds: string[];
  };
}

export class EmployeeClient {
  private employeeSvcUrl =
    process.env.EMPLOYEE_SVC_URL ||
    "https://employee-service-production-b41c.up.railway.app";

  async getEmployee(
    employeeId: string,
    companyId: string,
    authToken: string,
  ): Promise<IEmployee | null> {
    try {
      const response = await axios.get(
        `${this.employeeSvcUrl}/api/v1/employees/${employeeId}`,
        {
          headers: {
            Authorization: authToken,
            "x-company-id": companyId,
          },
        },
      );
      return response.data.data as IEmployee;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getShift(
    shiftId: string,
    companyId: string,
    authToken: string,
  ): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.employeeSvcUrl}/api/v1/shift/${shiftId}`,
        {
          headers: {
            Authorization: authToken,
            "x-company-id": companyId,
          },
        },
      );
      return response.data.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  // NEW: get hierarchy for the current user (self + report)
  async getHierarchyMe(
    authToken: string,
  ): Promise<HierarchyMeResponse["data"]> {
    const response = await axios.get<HierarchyMeResponse>(
      `${this.employeeSvcUrl}/api/v1/internal/hierarchy/`,
      {
        headers: {
          Authorization: authToken,
        },
      },
    );
    return response.data.data;
  }
}

export const employeeClient = new EmployeeClient();
