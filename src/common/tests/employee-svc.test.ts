import axios from "axios";

const runTest = async () => {
  try {
    const response = await axios.get(
      "http://localhost:8080/api/v1/employees/6a1209d18144b8e5ca259b02"
    );

    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
};

runTest();