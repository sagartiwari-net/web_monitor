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

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, planType } = req.body;
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.default.hash(password, 10);
    const user = await User.create({
      fullname: name,
      email,
      password: hashedPassword,
      role: role?.toLowerCase() || 'user',
      plan: planType?.toLowerCase() || 'free',
      isVerified: true
    });
    res.status(201).json({ success: true, data: { user, generatedPassword: password } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, password, role, planType } = req.body;
    const updates = {};
    if (name) updates.fullname = name;
    if (email) updates.email = email;
    if (role) updates.role = role.toLowerCase();
    if (planType) updates.plan = planType.toLowerCase();
    if (password) {
      const bcrypt = await import('bcrypt');
      updates.password = await bcrypt.default.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Also delete their monitors
    const Monitor = (await import('../models/monitor.model.js')).default;
    const Log = (await import('../models/log.model.js')).default;
    const monitors = await Monitor.find({ user: req.params.id });
    for (const m of monitors) await Log.deleteMany({ monitor: m._id });
    await Monitor.deleteMany({ user: req.params.id });
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    // The UI sends a flat object with the fields to update
    // Settings model stores everything in one document
    const updates = req.body;
    delete updates._id;
    delete updates.__v;
    
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, message: "Settings updated", data: settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const manageEmailTemplates = async (req, res) => {
  try {
    const { key, subject, html, body } = req.body;
    const templateKey = key || req.params?.key;
    await EmailTemplate.findOneAndUpdate(
      { name: templateKey },
      { subject, body: html || body },
      { upsert: true, new: true }
    );
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

// Default templates when DB is empty
const DEFAULT_TEMPLATES = [
  { key: 'email_verified', name: 'email_verified', category: 'auth', subject: 'Email Verified ✅', body: '<p>Your email has been verified. Welcome!</p>', description: 'Sent after user clicks the email verification link' },
  { key: 'forgot_password', name: 'forgot_password', category: 'auth', subject: 'Your password reset OTP - {{appName}}', body: '<p>Your OTP is: <strong>{{otp}}</strong>. Valid for 15 minutes.</p>', description: 'Sent when user requests password reset' },
  { key: 'password_changed', name: 'password_changed', category: 'auth', subject: 'Password Changed Confirmation', body: '<p>Your password has been changed for {{appName}}.</p>', description: 'Sent after a successful password reset' },
  { key: 'plan_activated', name: 'plan_activated', category: 'billing', subject: 'Your {{plan}} Plan is Active! 🎉', body: '<p>Your {{plan}} plan has been activated. Enjoy your enhanced features!</p>', description: 'Sent when payment is approved and plan is activated' },
  { key: 'payment_rejected', name: 'payment_rejected', category: 'billing', subject: 'Payment Update', body: '<p>We could not verify your payment. Please contact support.</p>', description: 'Sent when admin rejects a payment' },
  { key: 'monitor_down', name: 'monitor_down', category: 'monitoring', subject: '🔴 {{monitorName}} is DOWN', body: '<p>Your monitor <strong>{{monitorName}}</strong> at {{url}} is DOWN.</p>', description: 'Sent when a monitor goes down' },
  { key: 'monitor_up', name: 'monitor_up', category: 'monitoring', subject: '✅ {{monitorName}} is back UP', body: '<p>Your monitor <strong>{{monitorName}}</strong> at {{url}} is back online.</p>', description: 'Sent when a monitor recovers' },
];

export const getEmailTemplates = async (req, res) => {
  try {
    const dbTemplates = await EmailTemplate.find();
    // Merge DB overrides with defaults
    const merged = DEFAULT_TEMPLATES.map(def => {
      const override = dbTemplates.find(t => t.name === def.key);
      return {
        ...def,
        subject: override?.subject || def.subject,
        html: override?.body || def.body,
        isCustom: !!override,
      };
    });
    res.status(200).json({ success: true, data: merged });
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
    const { code, discountType, discountValue, type, value, maxUses, validUntil } = req.body;
    
    // Support both naming conventions from frontend
    const finalDiscountType = discountType || (type === 'percentage' ? 'percentage' : 'fixed');
    const finalDiscountValue = discountValue !== undefined ? Number(discountValue) : Number(value);

    if (isNaN(finalDiscountValue) || finalDiscountValue <= 0) {
      return res.status(400).json({ message: "Invalid discount value" });
    }
    
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType: finalDiscountType,
      discountAmount: finalDiscountValue,
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
