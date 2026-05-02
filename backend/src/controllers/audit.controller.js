import Monitor from "../models/monitor.model.js";
import Audit from "../models/audit.model.js";

const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// Helper to extract numeric score (0-100) from Lighthouse category
const score = (cat) => Math.round((cat?.score || 0) * 100);

// Helper to extract metric value in ms
const ms = (audit) => Math.round((audit?.numericValue || 0));

export const getAudit = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.monitorId, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });

    const audit = await Audit.findOne({ monitor: monitor._id }).sort("-createdAt");
    res.status(200).json({ success: true, data: { audit } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const runAudit = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.monitorId, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });

    const targetUrl = monitor.url;
    const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || "";

    // Call Google PageSpeed Insights v5 API
    const psUrl = new URL(PAGESPEED_API);
    psUrl.searchParams.set("url", targetUrl);
    psUrl.searchParams.set("strategy", "mobile");
    psUrl.searchParams.set("category", "performance");
    psUrl.searchParams.set("category", "accessibility");
    psUrl.searchParams.set("category", "best-practices");
    psUrl.searchParams.set("category", "seo");
    if (apiKey) psUrl.searchParams.set("key", apiKey);

    // Build URL with multiple category params (searchParams.set overwrites, so build manually)
    const categories = ["performance", "accessibility", "best-practices", "seo"];
    const catParams = categories.map(c => `category=${encodeURIComponent(c)}`).join("&");
    const finalUrl = `${PAGESPEED_API}?url=${encodeURIComponent(targetUrl)}&strategy=mobile&${catParams}${apiKey ? `&key=${apiKey}` : ""}`;

    const psRes = await fetch(finalUrl, { signal: AbortSignal.timeout(60000) });

    if (!psRes.ok) {
      const errText = await psRes.text();
      return res.status(502).json({
        success: false,
        message: `PageSpeed API error: ${psRes.status} — ${errText.slice(0, 200)}`
      });
    }

    const psData = await psRes.json();
    const cats = psData.lighthouseResult?.categories || {};
    const audits = psData.lighthouseResult?.audits || {};

    const perfScore       = score(cats.performance);
    const accessScore     = score(cats.accessibility);
    const bestPracticesScore = score(cats["best-practices"]);
    const seoScore        = score(cats.seo);
    const lcp  = ms(audits["largest-contentful-paint"]);
    const fcp  = ms(audits["first-contentful-paint"]);
    const cls  = Math.round(((audits["cumulative-layout-shift"]?.numericValue) || 0) * 1000) / 1000;
    const ttfb = ms(audits["server-response-time"]);
    const si   = ms(audits["speed-index"]);

    // Build a concise AI-style analysis from Lighthouse data
    const opportunities = Object.values(audits)
      .filter(a => a.details?.type === "opportunity" && a.score !== null && a.score < 0.9)
      .slice(0, 5)
      .map(a => `• **${a.title}**: ${a.displayValue || ""}`)
      .join("\n");

    const diagnostics = Object.values(audits)
      .filter(a => a.details?.type === "table" && a.score !== null && a.score < 0.9)
      .slice(0, 3)
      .map(a => `• ${a.title}`)
      .join("\n");

    let aiAnalysis = `## Performance Summary\n\n`;
    aiAnalysis += `**Overall Score:** ${perfScore}/100 | **SEO:** ${seoScore}/100 | **Accessibility:** ${accessScore}/100\n\n`;
    aiAnalysis += `### Core Web Vitals\n`;
    aiAnalysis += `- LCP (Largest Contentful Paint): **${(lcp/1000).toFixed(2)}s** ${lcp < 2500 ? "✅ Good" : lcp < 4000 ? "⚠️ Needs Improvement" : "❌ Poor"}\n`;
    aiAnalysis += `- FCP (First Contentful Paint): **${(fcp/1000).toFixed(2)}s** ${fcp < 1800 ? "✅ Good" : fcp < 3000 ? "⚠️ Needs Improvement" : "❌ Poor"}\n`;
    aiAnalysis += `- CLS (Cumulative Layout Shift): **${cls}** ${cls < 0.1 ? "✅ Good" : cls < 0.25 ? "⚠️ Needs Improvement" : "❌ Poor"}\n`;
    aiAnalysis += `- TTFB (Server Response Time): **${ttfb}ms** ${ttfb < 600 ? "✅ Good" : "⚠️ Slow"}\n`;
    aiAnalysis += `- Speed Index: **${(si/1000).toFixed(2)}s**\n\n`;

    if (opportunities) {
      aiAnalysis += `### 🔧 Top Improvements\n${opportunities}\n\n`;
    }

    if (diagnostics) {
      aiAnalysis += `### ⚠️ Diagnostics\n${diagnostics}\n`;
    }

    // Save to DB (upsert latest audit for this monitor)
    const audit = await Audit.findOneAndUpdate(
      { monitor: monitor._id },
      {
        monitor: monitor._id,
        url: targetUrl,
        perfScore, accessScore, bestPracticesScore, seoScore,
        lcp, fcp, cls, ttfb, si,
        aiAnalysis,
        rawData: { categories: cats }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: { audit } });
  } catch (error) {
    if (error.name === "TimeoutError" || error.code === "ABORT_ERR") {
      return res.status(504).json({ success: false, message: "PageSpeed API timed out (60s). Try again." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
