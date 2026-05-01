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

const app = express();

app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/seo", seoRoutes);

app.get("/", (req, res) => {
  res.send("Web Monitor SaaS API is running...");
});

export default app;
