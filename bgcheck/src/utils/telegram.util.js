import { Telegraf } from "telegraf";

let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
}

export const sendTelegramMessage = async (chatId, message) => {
  if (!bot || !chatId) return;
  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Telegram error:", error.message);
  }
};
