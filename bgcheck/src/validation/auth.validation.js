import { z } from "zod";

export const registerSchema = z.object({
  fullname: z
    .string({ required_error: "Full name is required" })
    .min(3, "Name must be at least 3 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});


export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});


export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});


export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});


export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});


export const googleSchema = z.object({
  idToken: z.string({ required_error: "Google ID Token is required" }),
});
