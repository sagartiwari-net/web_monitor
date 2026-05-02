import cron from "node-cron";
import axios from "axios";
import Monitor from "../models/monitor.model.js";
import Log from "../models/log.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendTelegramMessage } from "../utils/telegram.util.js";
import { analyzeDowntime } from "../services/ai.service.js";

export const startMonitoring = () => {
 
  cron.schedule("*/1 * * * *", async () => {
    console.log("Running monitoring job...");
    const monitors = await Monitor.find({ isActive: true });

    for (const monitor of monitors) {
      const startTime = Date.now();
      let status = "up";
      let responseTime = 0;
      let statusCode = 200;
      let errorMessage = "";

      try {
        try {
          const response = await axios.get(monitor.url, { timeout: 10000 });
          responseTime = Date.now() - startTime;
          statusCode = response.status;
        } catch (error) {
          status = "down";
          statusCode = error.response ? error.response.status : 500;
          errorMessage = error.message;
          responseTime = Date.now() - startTime;
        }

        if (monitor.status !== status && monitor.status !== "pending") {
          await handleStatusChange(monitor, status, errorMessage);
        }

        await Monitor.updateOne(
          { _id: monitor._id },
          { $set: { status, lastChecked: new Date() } },
          { runValidators: false }
        );

        await Log.create({
          monitor: monitor._id,
          status,
          responseTime,
          statusCode,
          message: errorMessage || "OK",
        });
      } catch (jobError) {
        console.error(`Error processing monitor ${monitor._id}:`, jobError.message);
      }
    }
  });

 
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily SEO audit...");
    const monitors = await Monitor.find({ isActive: true });
   
  });
};

const handleStatusChange = async (monitor, status, error) => {
  const user = await User.findById(monitor.user);
  if (!user) return;

  const subject = `Monitor ${status.toUpperCase()}: ${monitor.name}`;
  const message = `Your monitor ${monitor.name} (${monitor.url}) is now ${status.toUpperCase()}.
  ${status === "down" ? `Error: ${error}` : "It's back online!"}`;

  let aiAnalysis = "";
  if (status === "down") {
    aiAnalysis = await analyzeDowntime(monitor, error);
  }

  const html = `
    <h3>Monitor Alert</h3>
    <p><b>Name:</b> ${monitor.name}</p>
    <p><b>URL:</b> ${monitor.url}</p>
    <p><b>Status:</b> <span style="color: ${status === "up" ? "green" : "red"}">${status.toUpperCase()}</span></p>
    ${aiAnalysis ? `<div style="background: #f4f4f4; padding: 10px; border-radius: 5px;">
      <h4>AI Root Cause Analysis:</h4>
      <p>${aiAnalysis.replace(/\n/g, "<br>")}</p>
    </div>` : ""}
  `;

  if (user.notificationPreferences.email) {
    await sendEmail({
      email: user.email,
      subject,
      message,
      html,
    });
  }

  if (user.notificationPreferences.telegram && user.telegramId) {
    await sendTelegramMessage(user.telegramId, `<b>${subject}</b>\n\n${message}${aiAnalysis ? `\n\n<b>AI Analysis:</b>\n${aiAnalysis}` : ""}`);
  }
};
