import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { handleAiChat } from "../controllers/ai.controller.js";

const router = express.Router();
router.post("/chat", protect, handleAiChat);
export default router;
