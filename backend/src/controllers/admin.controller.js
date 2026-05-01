import User from "../models/user.model.js";
import Monitor from "../models/monitor.model.js";
import Payment from "../models/payment.model.js";
import Settings from "../models/settings.model.js";
import EmailTemplate from "../models/emailTemplate.model.js";

export const getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const monitorCount = await Monitor.countDocuments();
    const paymentCount = await Payment.countDocuments({ status: "approved" });
    const pendingPayments = await Payment.countDocuments({ status: "pending" });

    res.status(200).json({
      success: true,
      data: { userCount, monitorCount, paymentCount, pendingPayments }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
    res.status(200).json({ success: true, message: "Settings updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const manageEmailTemplates = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    await EmailTemplate.findOneAndUpdate({ name }, { subject, body }, { upsert: true });
    res.status(200).json({ success: true, message: "Template updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
