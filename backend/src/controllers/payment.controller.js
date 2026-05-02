import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";

import Coupon from "../models/coupon.model.js";

const PLAN_PRICES = {
  basic: 299,
  pro: 599,
  elite: 1499
};

export const getPaymentStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const latestPayment = await Payment.findOne({ user: req.user._id }).sort("-createdAt");
    
    res.status(200).json({
      success: true,
      data: {
        plan: user.plan || { type: "free", status: "active" },
        latestPayment
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initiatePayment = async (req, res) => {
  try {
    const { plan, couponCode } = req.body;
    
    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    let originalAmount = PLAN_PRICES[plan];
    let discountAmount = 0;
    let finalAmount = originalAmount;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon || coupon.expiryDate < new Date()) {
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }
      
      if (coupon.discountType === "percentage") {
        discountAmount = Math.round((originalAmount * coupon.discountAmount) / 100);
      } else {
        discountAmount = coupon.discountAmount;
      }
      
      finalAmount = Math.max(0, originalAmount - discountAmount);
    }

    res.status(200).json({
      success: true,
      data: {
        pricing: { originalAmount, discountAmount, finalAmount },
        upi: {
          id: process.env.UPI_ID || "test@upi",
          payeeName: process.env.UPI_PAYEE_NAME || "Web Monitor",
          upiString: `upi://pay?pa=${process.env.UPI_ID || "test@upi"}&pn=${process.env.UPI_PAYEE_NAME || "Web Monitor"}&am=${finalAmount}&cu=INR`
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitUtr = async (req, res) => {
  try {
    const { plan, utrNumber, paidAmount } = req.body;
    
    const existingPayment = await Payment.findOne({ utr: utrNumber });
    if (existingPayment) {
      return res.status(400).json({ message: "UTR already submitted" });
    }

    const payment = await Payment.create({
      user: req.user._id,
      plan,
      amount: paidAmount,
      utr: utrNumber,
      status: "pending"
    });

    res.status(201).json({ success: true, message: "Payment submitted. Waiting for approval.", data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
