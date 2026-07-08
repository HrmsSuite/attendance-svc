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
    };
  };
}

export class EmployeeClient {
  private employeeSvcUrl = "https://employee-service-production-b41c.up.railway.app";
  private serviceToken = process.env.EMPLOYEE_SVC_SERVICE_TOKEN;  


  async getEmployee(employeeId: string, companyId: string): Promise<IEmployee | null> {
    try {
      const response = await axios.get(
        `${this.employeeSvcUrl}/api/v1/employees/${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceToken}`,  
            "x-company-id": companyId,  
          },
        }
      );
      return response.data as IEmployee;
    } catch (error:any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getShift(shiftId: string, companyId: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.employeeSvcUrl}/api/v1/shift/${shiftId}`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceToken}`, 
            "x-company-id": companyId,
          },
        }
      );
      return response.data;
    } catch (error:any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

// Export an instantiated instance
export const employeeClient = new EmployeeClient();