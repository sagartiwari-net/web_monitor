import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import authRoutes from "./router/auth.routes.js";
import monitorRoutes from "./router/monitor.routes.js";
import paymentRoutes from "./router/payment.routes.js";
import adminRoutes from "./router/admin.routes.js";
import aiRoutes from "./router/ai.routes.js";
import seoRoutes from "./router/seo.routes.js";
import { protect } from "./middlewares/auth.middleware.js";
import Log from "./models/log.model.js";
import Monitor from "./models/monitor.model.js";
import { getAudit, runAudit } from "./controllers/audit.controller.js";

const app = express();

app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/seo", seoRoutes);

// Inline logs route for monitor detail page
app.get("/api/logs/:monitorId", protect, async (req, res) => {
  try {
    const { monitorId } = req.params;
    const limit = parseInt(req.query.limit) || 90;
    const monitor = await Monitor.findOne({ _id: monitorId, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    const logs = await Log.find({ monitor: monitorId }).sort("-createdAt").limit(limit);
    res.status(200).json({ success: true, data: { logs } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Real audit routes using Google PageSpeed Insights
app.get("/api/audit/:monitorId", protect, getAudit);
app.post("/api/audit/:monitorId", protect, runAudit);

app.get("/", (req, res) => {
  res.send("Web Monitor SaaS API is running...");
});

export default app;
