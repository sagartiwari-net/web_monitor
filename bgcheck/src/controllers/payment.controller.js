import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";

export const initiatePayment = async (req, res) => {
  try {
    const { plan, amount, utr } = req.body;
    
    const payment = await Payment.create({
      user: req.user._id,
      plan,
      amount,
      utr,
    });

    res.status(201).json({ success: true, message: "Payment submitted. Waiting for approval.", data: payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort("-createdAt");
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const approvePayment = async (req, res) => {
  try {
    const { paymentId, status, message } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.status = status;
    payment.adminMessage = message;
    await payment.save();

    if (status === "approved") {
      const user = await User.findById(payment.user);
      user.plan = payment.plan;
      await user.save();
    }

    res.status(200).json({ success: true, message: `Payment ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
