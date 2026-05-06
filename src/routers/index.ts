import { Router } from "express";
import leavepolicy from "./leavepolicy.routes";
const router = Router();

const apiPath = "/api/v1";

// leavepolicy routes
router.use(`${apiPath}/leavepolicy/`, leavepolicy);
export default router;
