import express from "express";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import {
  initiatePayment,
  getPaymentStatus,
  submitUtr,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.use(protect);

router.get("/status", getPaymentStatus);
router.post("/initiate", initiatePayment);
router.post("/submit-utr", submitUtr);

export default router;
