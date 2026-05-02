import User from "../models/user.model.js";
import { sendTokenResponse } from "../utils/token.util.js";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "../utils/sendEmail.js";
import bcrypt from "bcrypt";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const user = await User.create({
      fullname,
      email,
      password,
      otp,
      otpExpiry,
    });

    try {
      await sendEmail({
        email: user.email,
        subject: "Email Verification OTP",
        message: `Your verification code is: ${otp}`,
        html: `<h3>Welcome to our platform!</h3><p>Your verification code is: <b>${otp}</b></p><p>Valid for 15 minutes.</p>`,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    console.log(`Email Verification OTP for ${email}: ${otp}`);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await User.updateOne({ _id: user._id }, { $set: { isVerified: true, otp: null, otpExpiry: null } }, { runValidators: false });
    user.isVerified = true;

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
    }

    sendTokenResponse(user, 200, res, "User logged in");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    
    await User.updateOne({ _id: user._id }, { $set: { otp, otpExpiry } }, { runValidators: false });
    
    try {
      await sendEmail({
        email: user.email,
        subject: "Login OTP",
        message: `Your login code is: ${otp}`,
        html: `<h3>Secure Login</h3><p>Your OTP to login is: <b>${otp}</b></p><p>Valid for 15 minutes.</p>`,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
    }
    
    console.log(`Login OTP for ${email}: ${otp}`);
    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    
    await User.updateOne({ _id: user._id }, { $set: { otp: null, otpExpiry: null, isVerified: true } }, { runValidators: false });
    user.isVerified = true;
    
    sendTokenResponse(user, 200, res, "Logged in via OTP");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await User.updateOne({ _id: user._id }, { $set: { otp, otpExpiry } }, { runValidators: false });
    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP",
        message: `Your password reset code is: ${otp}`,
        html: `<h3>Password Reset</h3><p>Your password reset code is: <b>${otp}</b></p><p>Valid for 15 minutes.</p>`,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    console.log(`Password Reset OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, otp: null, otpExpiry: null } },
      { runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateProfile = async (req, res) => {
  try {
    const { notificationPreferences, telegramId } = req.body;
    const user = await User.findById(req.user.id);
    
    if (notificationPreferences) user.notificationPreferences = notificationPreferences;
    if (telegramId !== undefined) user.telegramId = telegramId;
    
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
