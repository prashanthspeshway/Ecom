import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const dataPath = path.join(process.cwd(), "data", "products.json");
let products = [];
let dbClient = null;
let db = null;

function loadData() {
  try {
    const raw = fs.readFileSync(dataPath, "utf-8");
    products = JSON.parse(raw);
  } catch (e) {
    products = [];
  }
}

loadData();

async function initDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) return;
  try {
    dbClient = new MongoClient(uri);
    await dbClient.connect();
    const dbName = process.env.DB_NAME || "ecom";
    db = dbClient.db(dbName);
    const coll = db.collection("products");
    const count = await coll.countDocuments();
    if (count === 0 && products.length > 0) {
      await coll.insertMany(products);
    }

    const users = db.collection("users");
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const exists = await users.findOne({ email: adminEmail });
      if (!exists) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await users.insertOne({ email: adminEmail, password: hash, role: "admin", name: "Admin" });
      }
    }

    const userEmail = process.env.SEED_USER_EMAIL;
    const userPassword = process.env.SEED_USER_PASSWORD;
    if (userEmail && userPassword) {
      const exists = await users.findOne({ email: userEmail });
      if (!exists) {
        const hash = await bcrypt.hash(userPassword, 10);
        await users.insertOne({ email: userEmail, password: hash, role: "user", name: "User" });
      }
    }
  } catch (e) {
    db = null;
  }
}

// file upload setup
const uploadDir = path.join(process.cwd(), "uploads");
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign({ id: user._id?.toString(), email: user.email, role: user.role || "user" }, secret, {
    expiresIn: "7d",
  });
}

function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, invite } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const role = invite && process.env.ADMIN_INVITE_CODE && invite === process.env.ADMIN_INVITE_CODE ? "admin" : "user";
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const user = { email, name: name || "", password: hash, role };
    const { insertedId } = await db.collection("users").insertOne(user);
    const token = signToken({ _id: insertedId, email, role });
    res.json({ token, role });
  } catch (e) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken(user);
    res.json({ token, role: user.role || "user" });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const user = await db.collection("users").findOne({ email: req.user.email }, { projection: { password: 0 } });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    if (db) {
      const items = await db.collection("products").find({}).toArray();
      res.json(items);
      return;
    }
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    if (db) {
      const item = await db.collection("products").findOne({ id: req.params.id });
      if (!item) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(item);
      return;
    }
    const item = products.find(p => p.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/products", authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const payload = req.body || {};
    if (!payload.name || !payload.price) return res.status(400).json({ error: "Missing fields" });
    const doc = {
      id: payload.id || crypto.randomUUID(),
      name: payload.name,
      brand: payload.brand || "",
      images: payload.images || [],
      price: Number(payload.price),
      originalPrice: payload.originalPrice ? Number(payload.originalPrice) : undefined,
      discount: payload.discount ? Number(payload.discount) : undefined,
      colors: payload.colors || [],
      fabrics: payload.fabrics || [],
      measurements: payload.measurements || { length: "", width: "" },
      care: payload.care || "",
      stock: payload.stock ? Number(payload.stock) : 0,
      rating: payload.rating ? Number(payload.rating) : 0,
      reviews: [],
      category: payload.category || "",
      occasion: payload.occasion || "",
    };
    await db.collection("products").insertOne(doc);
    res.json({ success: true, id: doc.id });
  } catch (e) {
    res.status(500).json({ error: "Create failed" });
  }
});

app.put("/api/products/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = req.params.id;
    const update = { $set: { ...req.body } };
    const r = await db.collection("products").updateOne({ id }, update);
    if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/products/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const id = req.params.id;
    const r = await db.collection("products").deleteOne({ id });
    if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/api/checkout", (req, res) => {
  res.json({ success: true });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
initDb().finally(() => {
  app.listen(port, () => {
    // no-op
  });
});

app.post("/api/upload", authMiddleware, adminOnly, upload.array("files", 10), async (req, res) => {
  try {
    const files = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);
    res.json({ urls: files });
  } catch (e) {
    res.status(500).json({ error: "Upload failed" });
  }
});