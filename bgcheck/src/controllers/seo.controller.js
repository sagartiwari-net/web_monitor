import { runSeoAudit } from "../services/seo.service.js";

export const getSeoAudit = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "URL is required" });

    const report = await runSeoAudit(url);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
