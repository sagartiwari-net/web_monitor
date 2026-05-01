import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeDowntime = async (monitor, error) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      As a DevOps expert, analyze this website downtime:
      Monitor Name: ${monitor.name}
      URL: ${monitor.url}
      Error: ${error}
      
      Provide a brief root cause analysis and possible solutions in 3-4 bullet points.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Analysis error:", error.message);
    return "AI Analysis unavailable at the moment.";
  }
};

export const chatWithAI = async (message, context) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      User is asking: "${message}"
      Context about user's monitors: ${JSON.stringify(context)}
      Be a helpful assistant for a Web Monitoring SaaS.
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Chat error:", error.message);
    return "Sorry, I'm having trouble thinking right now.";
  }
};
