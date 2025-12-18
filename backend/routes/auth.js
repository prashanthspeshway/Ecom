import express from "express";
import bcrypt from "bcryptjs";

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

  app.use("/api/auth", router);
}

