import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getSeoAudit } from "../controllers/seo.controller.js";

const router = express.Router();
router.post("/audit", protect, getSeoAudit);
export default router;
