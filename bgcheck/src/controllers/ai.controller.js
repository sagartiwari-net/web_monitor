import { chatWithAI } from "../services/ai.service.js";
import Monitor from "../models/monitor.model.js";

export const handleAiChat = async (req, res) => {
  try {
    const { message } = req.body;
    const monitors = await Monitor.find({ user: req.user._id });
    
    const context = monitors.map(m => ({
      name: m.name,
      url: m.url,
      status: m.status,
      lastChecked: m.lastChecked
    }));

    const response = await chatWithAI(message, context);
    res.status(200).json({ success: true, response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
