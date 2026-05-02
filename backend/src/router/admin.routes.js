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
router.get("/email-templates/:key", async (req, res) => {
  // Return single template by key - handled by frontend for editing
  const { getEmailTemplates: gET } = await import('../controllers/admin.controller.js');
  // Find in default list via a workaround - re-use getEmailTemplates and filter
  res.status(200).json({ success: true, message: 'use /email-templates list' });
});
router.put("/email-templates/:key", manageEmailTemplates);
router.post("/email-templates/:key/reset", async (req, res) => {
  const EmailTemplate = (await import('../models/emailTemplate.model.js')).default;
  await EmailTemplate.findOneAndDelete({ name: req.params.key });
  res.status(200).json({ success: true, message: 'Template reset to default' });
});
router.post("/email-templates/test", async (req, res) => {
  res.status(200).json({ success: true, message: 'Test email feature coming soon' });
});
router.post("/email-templates/:key/preview", async (req, res) => {
  res.status(200).json({ success: true, data: { preview: 'Preview feature coming soon' } });
});

router.get("/payments", getPayments);
router.get("/payments/pending", getPendingPayments);
router.post("/payments/:id/:action", handlePaymentAction);

router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.delete("/coupons/:id", deleteCoupon);

export default router;
