import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";

export default function register({ app, getDb, signToken, getFileUsers, setFileUsers, saveUsers, adminInviteCode, authMiddleware }) {
  const router = express.Router();
  const loginLimiter = (() => {
    const m = new Map();
    return (req, res, next) => {
      const now = Date.now();
      const key = (req.headers["x-forwarded-for"] || req.ip || "").toString();
      const v = m.get(key) || { c: 0, r: now + 60000 };
      if (now > v.r) { v.c = 0; v.r = now + 60000; }
      v.c += 1;
      m.set(key, v);
      if (v.c > 10) return res.status(429).json({ error: "Too many requests" });
      next();
    };
  })();
  const registerLimiter = (() => {
    const m = new Map();
    return (req, res, next) => {
      const now = Date.now();
      const key = (req.headers["x-forwarded-for"] || req.ip || "").toString();
      const v = m.get(key) || { c: 0, r: now + 60000 };
      if (now > v.r) { v.c = 0; v.r = now + 60000; }
      v.c += 1;
      m.set(key, v);
      if (v.c > 6) return res.status(429).json({ error: "Too many requests" });
      next();
    };
  })();
  function normEmail(s) { return (s || "").toString().trim().toLowerCase(); }
  function validEmail(s) { const e = normEmail(s); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function validPassword(p) { const s = (p || "").toString(); return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s); }
  function safeName(n, fallback) { const v = (n || fallback || "").toString().trim(); return v.slice(0, 64); }

  // SMTP Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  router.post("/forgot-password", async (req, res) => {
    try {
      const { email: eraw } = req.body || {};
      if (!validEmail(eraw)) return res.status(400).json({ error: "Invalid email" });
      const email = normEmail(eraw);
      const db = getDb();
      
      const token = crypto.randomBytes(20).toString("hex");
      const expires = Date.now() + 3600000; // 1 hour

      let user;
      if (db) {
        user = await db.collection("users").findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });
        await db.collection("users").updateOne({ email }, { $set: { resetPasswordToken: token, resetPasswordExpires: expires } });
      } else {
        const fileUsers = getFileUsers();
        const idx = fileUsers.findIndex((u) => (u.email || "").toLowerCase() === email);
        if (idx === -1) return res.status(404).json({ error: "User not found" });
        fileUsers[idx].resetPasswordToken = token;
        fileUsers[idx].resetPasswordExpires = expires;
        setFileUsers(fileUsers);
        saveUsers();
      }

      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/reset-password?token=${token}`;
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Password Reset Request",
        html: `<p>You requested a password reset</p><p>Click this <a href="${resetUrl}">link</a> to reset your password</p>`,
      });

      res.json({ message: "Password reset email sent" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password: praw } = req.body || {};
      if (!token || !validPassword(praw)) return res.status(400).json({ error: "Invalid input" });
      const password = (praw || "").toString();
      const db = getDb();
      const hash = await bcrypt.hash(password, 10);

      if (db) {
        const user = await db.collection("users").findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) return res.status(400).json({ error: "Invalid or expired token" });
        
        await db.collection("users").updateOne(
          { _id: user._id },
          { 
            $set: { password: hash },
            $unset: { resetPasswordToken: "", resetPasswordExpires: "" }
          }
        );
      } else {
        const fileUsers = getFileUsers();
        const idx = fileUsers.findIndex((u) => u.resetPasswordToken === token && u.resetPasswordExpires > Date.now());
        if (idx === -1) return res.status(400).json({ error: "Invalid or expired token" });
        
        fileUsers[idx].password = hash;
        delete fileUsers[idx].resetPasswordToken;
        delete fileUsers[idx].resetPasswordExpires;
        setFileUsers(fileUsers);
        saveUsers();
      }

      res.json({ message: "Password updated successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  router.post("/register", registerLimiter, async (req, res) => {
    try {
      const { email: eraw, password: praw, name, invite } = req.body || {};
      if (!validEmail(eraw) || !validPassword(praw)) return res.status(400).json({ error: "Invalid input" });
      const email = normEmail(eraw);
      const password = (praw || "").toString();
      const role = invite && adminInviteCode && invite === adminInviteCode ? "admin" : "user";
      const db = getDb();
      if (db) {
        const exists = await db.collection("users").findOne({ email });
        if (exists) return res.status(409).json({ error: "Email exists" });
        const hash = await bcrypt.hash(password, 10);
        const user = { email, name: safeName(name, email.split("@")[0]), password: hash, role };
        await db.collection("users").insertOne(user);
        const token = signToken(user);
        return res.json({ token, role });
      }
      const fileUsers = getFileUsers();
      if (fileUsers.find((u) => (u.email || "").toLowerCase() === email)) return res.status(409).json({ error: "Email exists" });
      const hash = await bcrypt.hash(password, 10);
      const user = { email, name: safeName(name, email.split("@")[0]), password: hash, role };
      setFileUsers([...fileUsers, user]);
      saveUsers();
      const token = signToken(user);
      res.json({ token, role });
    } catch (e) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      const { email: eraw, password } = req.body || {};
      if (!validEmail(eraw) || typeof password !== "string" || password.length === 0) return res.status(400).json({ error: "Invalid input" });
      const email = normEmail(eraw);
      const db = getDb();
      if (db) {
        const user = await db.collection("users").findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        const ok = await bcrypt.compare(password, user.password || "");
        if (!ok) return res.status(401).json({ error: "Invalid credentials" });
        const token = signToken(user);
        return res.json({ token, role: user.role || "user" });
      }
      const user = getFileUsers().find((u) => (u.email || "").toLowerCase() === email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.password || "");
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = signToken(user);
      res.json({ token, role: user.role || "user" });
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  router.get("/me", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.json({ email: req.user.email, role: req.user.role || "user", name: req.user.email.split("@")[0] });
      }
      const user = await db.collection("users").findOne({ email: req.user.email }, { projection: { password: 0 } });
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/auth", router);
}