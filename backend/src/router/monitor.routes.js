import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createMonitor,
  getMonitors,
  getMonitorDetails,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
} from "../controllers/monitor.controller.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getMonitors).post(createMonitor);
router.route("/:id").get(getMonitorDetails).put(updateMonitor).delete(deleteMonitor);
router.put("/:id/toggle", toggleMonitor);

export default router;
