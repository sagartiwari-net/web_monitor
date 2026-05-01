import express from "express";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import {
  getStats,
  getUsers,
  updateSettings,
  manageEmailTemplates,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.put("/settings", updateSettings);
router.put("/email-templates", manageEmailTemplates);

export default router;
