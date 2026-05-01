import axios from "axios";

export const runSeoAudit = async (url) => {
  try {
    const API_KEY = process.env.PAGESPEED_API_KEY;
    if (!API_KEY) throw new Error("PageSpeed API Key not found");

    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${API_KEY}&category=SEO&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES`;
    
    const response = await axios.get(endpoint);
    const data = response.data.lighthouseResult;

    return {
      performance: data.categories.performance.score * 100,
      seo: data.categories.seo.score * 100,
      accessibility: data.categories.accessibility.score * 100,
      bestPractices: data.categories["best-practices"].score * 100,
      details: data.audits,
    };
  } catch (error) {
    console.error("SEO Audit error:", error.message);
    throw error;
  }
};
