import express from "express";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import {
  getStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateSettings,
  getSettings,
  manageEmailTemplates,
  getEmailTemplates,
  getPayments,
  getPendingPayments,
  handlePaymentAction,
  getCoupons,
  createCoupon,
  deleteCoupon
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);

router.get("/email-templates", getEmailTemplates);
router.put("/email-templates", manageEmailTemplates);

router.get("/payments", getPayments);
router.get("/payments/pending", getPendingPayments);
router.post("/payments/:id/:action", handlePaymentAction);

router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.delete("/coupons/:id", deleteCoupon);

export default router;
