import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default function register({ app, getDb, signToken, getFileUsers, setFileUsers, saveUsers, adminInviteCode, authMiddleware }) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    try {
      const { email, password, inviteCode, name } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("users").findOne({ email });
        if (exists) return res.status(400).json({ error: "User already exists" });
        const hash = await bcrypt.hash(password, 10);
        const role = inviteCode === adminInviteCode ? "admin" : "user";
        const user = { email, password: hash, role, name: name || null, createdAt: Date.now() };
        await db.collection("users").insertOne(user);
        const token = signToken(user);
        return res.json({ token, user: { email, name: name || null, role } });
      }
      const fileUsers = getFileUsers();
      if (fileUsers.find((u) => u.email === email)) return res.status(400).json({ error: "User already exists" });
      const hash = await bcrypt.hash(password, 10);
      const role = inviteCode === adminInviteCode ? "admin" : "user";
      const user = { email, password: hash, role, name: name || null, createdAt: Date.now() };
      fileUsers.push(user);
      setFileUsers(fileUsers);
      saveUsers();
      const token = signToken(user);
      res.json({ token, user: { email, name: name || null, role } });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      const db = getDb();
      if (db) {
        const user = await db.collection("users").findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });
        const token = signToken(user);
        return res.json({ token, user: { email, role: user.role || "user" } });
      }
      const fileUsers = getFileUsers();
      const user = fileUsers.find((u) => u.email === email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = signToken(user);
      res.json({ token, user: { email, role: user.role || "user" } });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.get("/me", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const user = await db.collection("users").findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json({ 
          email: user.email, 
          name: user.name || null,
          role: user.role || "user" 
        });
      }
      const fileUsers = getFileUsers();
      const user = fileUsers.find((u) => u.email === req.user.email);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ 
        email: user.email, 
        name: user.name || null,
        role: user.role || "user" 
      });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Forgot Password - Send reset email
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: "Email required" });

      const db = getDb();
      let user = null;
      if (db) {
        user = await db.collection("users").findOne({ email });
      } else {
        const fileUsers = getFileUsers();
        user = fileUsers.find((u) => u.email === email);
      }

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      const resetPasswordExpires = Date.now() + 3600000; // 1 hour

      // Save token to user
      if (db) {
        await db.collection("users").updateOne(
          { email },
          { $set: { resetPasswordToken, resetPasswordExpires } }
        );
      } else {
        const fileUsers = getFileUsers();
        const userIndex = fileUsers.findIndex((u) => u.email === email);
        if (userIndex >= 0) {
          fileUsers[userIndex] = { ...fileUsers[userIndex], resetPasswordToken, resetPasswordExpires };
          setFileUsers(fileUsers);
          saveUsers();
        }
      }

      // Send email
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      res.json({ message: "If an account exists with this email, a password reset link has been sent." });
    } catch (e) {
      console.error("Forgot password error:", e);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  // Reset Password - Reset with token
  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body || {};
      if (!token || !password) return res.status(400).json({ error: "Token and password required" });

      const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

      const db = getDb();
      let user = null;
      if (db) {
        user = await db.collection("users").findOne({
          resetPasswordToken,
          resetPasswordExpires: { $gt: Date.now() },
        });
      } else {
        const fileUsers = getFileUsers();
        user = fileUsers.find(
          (u) => u.resetPasswordToken === resetPasswordToken && u.resetPasswordExpires > Date.now()
        );
      }

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Hash new password
      const hash = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      if (db) {
        await db.collection("users").updateOne(
          { email: user.email },
          {
            $set: { password: hash },
            $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
          }
        );
      } else {
        const fileUsers = getFileUsers();
        const userIndex = fileUsers.findIndex((u) => u.email === user.email);
        if (userIndex >= 0) {
          fileUsers[userIndex] = {
            ...fileUsers[userIndex],
            password: hash,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined,
          };
          setFileUsers(fileUsers);
          saveUsers();
        }
      }

      res.json({ message: "Password reset successfully" });
    } catch (e) {
      console.error("Reset password error:", e);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.use("/api/auth", router);
}

