import User from "../models/user.model.js";
import Monitor from "../models/monitor.model.js";
import Payment from "../models/payment.model.js";
import Settings from "../models/settings.model.js";
import EmailTemplate from "../models/emailTemplate.model.js";
import Coupon from "../models/coupon.model.js";

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

export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.find();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmailTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("user", "name fullname email").sort("-createdAt");
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" }).populate("user", "name fullname email").sort("-createdAt");
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const handlePaymentAction = async (req, res) => {
  try {
    const { id, action } = req.params;
    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (action === "approve") {
      payment.status = "approved";
      
      const user = await User.findById(payment.user);
      if (user) {
        user.plan = {
          type: payment.plan,
          status: "active",
          siteLimit: payment.plan === "basic" ? 3 : payment.plan === "pro" ? 10 : 15,
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
        await user.save();
      }
    } else if (action === "reject") {
      payment.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await payment.save();
    res.status(200).json({ success: true, message: `Payment ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort("-createdAt");
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, type, value, maxUses, validUntil } = req.body;
    
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType: type === "Percentage (%)" ? "percentage" : "fixed",
      discountAmount: Number(value),
      expiryDate: validUntil ? new Date(validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    });
    
    res.status(201).json({ success: true, message: "Coupon created", data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
