import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/email.js";

export default function register({ app, getDb, signToken, adminInviteCode, authMiddleware }) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    try {
      const { email, password, inviteCode } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("users").findOne({ email });
      if (exists) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hash = await bcrypt.hash(password, 10);
      const role = inviteCode === adminInviteCode ? "admin" : "user";
      const user = {
        email,
        password: hash,
        role,
        createdAt: Date.now(),
      };

      await db.collection("users").insertOne(user);
      const token = signToken(user);
      res.json({ token, user: { email, role } });
    } catch (e) {
      console.error("[auth] Register error:", e);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const user = await db.collection("users").findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userRole = user.role || "user";
      const token = signToken({ ...user, role: userRole });
      res.json({ token, user: { email, role: userRole } });
    } catch (e) {
      console.error("[auth] Login error:", e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.json({ 
          message: "If an account exists with this email, a password reset link has been sent." 
        });
      }

      const db = getDb();
      if (!db) {
        return res.json({ 
          message: "If an account exists with this email, a password reset link has been sent." 
        });
      }

      const user = await db.collection("users").findOne({ email });
      
      // Always return success to prevent email enumeration
      if (user) {
        try {
          const resetToken = crypto.randomBytes(32).toString("hex");
          const resetExpires = Date.now() + 3600000; // 1 hour

          await db.collection("users").updateOne(
            { email },
            { 
              $set: { 
                resetPasswordToken: resetToken, 
                resetPasswordExpires: resetExpires 
              } 
            }
          );

          await sendPasswordResetEmail(email, resetToken);
        } catch (emailError) {
          console.error("[auth] Failed to send reset email:", emailError);
        }
      }

      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    } catch (e) {
      console.error("[auth] Forgot password error:", e);
      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body || {};
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const user = await db.collection("users").findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hash = await bcrypt.hash(password, 10);
      await db.collection("users").updateOne(
        { email: user.email },
        {
          $set: { password: hash },
          $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
        }
      );

      res.json({ message: "Password reset successful" });
    } catch (e) {
      console.error("[auth] Reset password error:", e);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  router.get("/me", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const user = await db.collection("users").findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        email: user.email, 
        name: user.name || user.email.split("@")[0],
        role: user.role || "user" 
      });
    } catch (e) {
      console.error("[auth] Get me error:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/auth", router);
}
