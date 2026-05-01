import express from "express";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import {
  initiatePayment,
  getMyPayments,
  approvePayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.use(protect);

router.post("/initiate", initiatePayment);
router.get("/my", getMyPayments);
router.post("/approve", adminOnly, approvePayment);

export default router;
