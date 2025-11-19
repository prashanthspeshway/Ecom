import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import crypto from "crypto";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const dataPath = path.join(process.cwd(), "data", "products.json");
let products = [];
let dbClient = null;
let db = null;
const categoriesPath = path.join(process.cwd(), "data", "categories.json");
let categories = [];
const bannersPath = path.join(process.cwd(), "data", "banners.json");
let banners = [];
const bestsellersPath = path.join(process.cwd(), "data", "bestsellers.json");
let bestsellerIds = [];
const subcategoriesPath = path.join(process.cwd(), "data", "subcategories.json");
let subcategories = {};

function loadData() {
  try {
    const raw = fs.readFileSync(dataPath, "utf-8");
    products = JSON.parse(raw);
  } catch (e) {
    products = [];
  }
  try {
    const raw = fs.readFileSync(categoriesPath, "utf-8");
    categories = JSON.parse(raw);
  } catch (e) {
    categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    try { fs.mkdirSync(path.dirname(categoriesPath), { recursive: true }); } catch {}
    try { fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2)); } catch {}
  }
  try {
    const raw = fs.readFileSync(bannersPath, "utf-8");
    banners = JSON.parse(raw);
  } catch (e) {
    banners = [];
    try { fs.mkdirSync(path.dirname(bannersPath), { recursive: true }); } catch {}
    try { fs.writeFileSync(bannersPath, JSON.stringify(banners, null, 2)); } catch {}
  }
  try {
    const raw = fs.readFileSync(bestsellersPath, "utf-8");
    bestsellerIds = JSON.parse(raw);
  } catch (e) {
    bestsellerIds = [];
    try { fs.mkdirSync(path.dirname(bestsellersPath), { recursive: true }); } catch {}
    try { fs.writeFileSync(bestsellersPath, JSON.stringify(bestsellerIds, null, 2)); } catch {}
  }
  try {
    const raw = fs.readFileSync(subcategoriesPath, "utf-8");
    subcategories = JSON.parse(raw);
  } catch (e) {
    subcategories = {
      Lenin: [
        "Lenin Kanchi Border",
        "Lenin Bathik Prints",
        "Lenin Printed",
        "Lenin Ikkat",
        "Lenin Tissue",
        "Lenin Shibori Sarees",
        "Lenin Digital Print",
        "Lenin Kalamkari",
        "Lenin Silk Sateen Border",
        "Kantha Work",
        "Summer Special Lenin Sarees",
        "Lenin Sequence Work",
        "Lenin Sarees",
      ],
    };
    try { fs.mkdirSync(path.dirname(subcategoriesPath), { recursive: true }); } catch {}
    try { fs.writeFileSync(subcategoriesPath, JSON.stringify(subcategories, null, 2)); } catch {}
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
    if (!db) {
      const adminEmail = process.env.SEED_ADMIN_EMAIL;
      const adminPassword = process.env.SEED_ADMIN_PASSWORD;
      const userEmail = process.env.SEED_USER_EMAIL;
      const userPassword = process.env.SEED_USER_PASSWORD;
      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        const token = signToken({ email: adminEmail, role: "admin" });
        return res.json({ token, role: "admin" });
      }
      if (userEmail && userPassword && email === userEmail && password === userPassword) {
        const token = signToken({ email: userEmail, role: "user" });
        return res.json({ token, role: "user" });
      }
      return res.status(503).json({ error: "Database unavailable" });
    }
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
    if (!db) {
      return res.json({ email: req.user.email, role: req.user.role || "user", name: req.user.email.split("@")[0] });
    }
    const user = await db.collection("users").findOne({ email: req.user.email }, { projection: { password: 0 } });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    if (db) {
      const items = await db.collection("products").find({}).sort({ createdAt: -1, _id: -1 }).toArray();
      res.json(items);
      return;
    }
    const sorted = [...products].sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    res.json(sorted);
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
      createdAt: Date.now(),
    };
    if (!db) {
      products.push(doc);
      if (doc.category) {
        const parent = Object.keys(subcategories).find((cat) => (subcategories[cat] || []).includes(doc.category)) || doc.category;
        if (!categories.includes(parent)) {
          categories.push(parent);
          saveCategoriesToFile();
        }
      }
      saveProductsToFile();
      return res.json({ success: true, id: doc.id });
    }
    await db.collection("products").insertOne(doc);
    res.json({ success: true, id: doc.id });
  } catch (e) {
    res.status(500).json({ error: "Create failed" });
  }
});

app.put("/api/products/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!db) {
      const id = req.params.id;
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).json({ error: "Not found" });
      products[idx] = { ...products[idx], ...req.body };
      saveProductsToFile();
      return res.json({ success: true });
    }
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
    if (!db) {
      const id = req.params.id;
      const before = products.length;
      products = products.filter(p => p.id !== id);
      saveProductsToFile();
      if (products.length === before) return res.status(404).json({ error: "Not found" });
      return res.json({ success: true });
    }
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
function saveProductsToFile() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
  } catch {}
}

function saveCategoriesToFile() {
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
  } catch {}
}
function saveBannersToFile() {
  try {
    fs.writeFileSync(bannersPath, JSON.stringify(banners, null, 2));
  } catch {}
}
function saveBestsellersToFile() {
  try {
    fs.writeFileSync(bestsellersPath, JSON.stringify(bestsellerIds, null, 2));
  } catch {}
}
function saveSubcategoriesToFile() {
  try {
    fs.writeFileSync(subcategoriesPath, JSON.stringify(subcategories, null, 2));
  } catch {}
}
// Categories API
app.get("/api/categories", async (req, res) => {
  try {
    if (db) {
      const cats = await db.collection("categories").find({}).toArray();
      const catNames = cats.map(c => c.name);
      const subcats = await db.collection("subcategories").find({}).toArray();
      const dbSubNames = new Set(subcats.map(s => s.name));
      const fileSubNames = new Set(Object.values(subcategories).flat());
      const allSubNames = new Set([...dbSubNames, ...fileSubNames]);
      const filtered = catNames.filter(name => !allSubNames.has(name));
      return res.json(filtered);
    }
    const allSubNames = new Set(Object.values(subcategories).flat());
    const filtered = categories.filter(name => !allSubNames.has(name));
    return res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/categories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name required" });
    if (db) {
      const exists = await db.collection("categories").findOne({ name });
      if (exists) return res.json({ success: true });
      await db.collection("categories").insertOne({ name });
      return res.json({ success: true });
    }
    if (!categories.includes(name)) {
      categories.push(name);
      saveCategoriesToFile();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.put("/api/categories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ error: "oldName and newName required" });
    if (db) {
      const exists = await db.collection("categories").findOne({ name: oldName });
      if (!exists) return res.status(404).json({ error: "Not found" });
      await db.collection("categories").updateOne({ name: oldName }, { $set: { name: newName } });
      // also update subcategories parent references
      await db.collection("subcategories").updateMany({ category: oldName }, { $set: { category: newName } });
      return res.json({ success: true });
    }
    const idx = categories.findIndex((c) => c === oldName);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    categories[idx] = newName;
    if (subcategories[oldName]) {
      subcategories[newName] = subcategories[oldName];
      delete subcategories[oldName];
    }
    saveCategoriesToFile();
    saveSubcategoriesToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/banners", async (req, res) => {
  try {
    if (db) {
      const list = await db.collection("banners").find({}).toArray();
      return res.json(list.map(b => b.url));
    }
    return res.json(banners);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/banners", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { urls } = req.body || {};
    const arr = Array.isArray(urls) ? urls : [];
    if (!arr.length) return res.status(400).json({ error: "urls required" });
    if (db) {
      for (const u of arr) {
        const exists = await db.collection("banners").findOne({ url: u });
        if (!exists) await db.collection("banners").insertOne({ url: u });
      }
      return res.json({ success: true });
    }
    for (const u of arr) {
      if (!banners.includes(u)) banners.push(u);
    }
    saveBannersToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/api/banners", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });
    if (db) {
      await db.collection("banners").deleteOne({ url });
      return res.json({ success: true });
    }
    banners = banners.filter(b => b !== url);
    saveBannersToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/bestsellers", async (req, res) => {
  try {
    if (db) {
      const list = await db.collection("products").find({ id: { $in: bestsellerIds } }).toArray();
      return res.json(list);
    }
    const list = products.filter(p => bestsellerIds.includes(p.id));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/bestsellers", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { ids } = req.body || {};
    const arr = Array.isArray(ids) ? ids : [];
    if (!arr.length) return res.status(400).json({ error: "ids required" });
    if (db) {
      for (const id of arr) {
        const exists = await db.collection("bestsellers").findOne({ id });
        if (!exists) await db.collection("bestsellers").insertOne({ id });
      }
      const list = await db.collection("products").find({ id: { $in: arr } }).toArray();
      return res.json({ success: true, added: list.map(p => p.id) });
    }
    for (const id of arr) {
      if (!bestsellerIds.includes(id)) bestsellerIds.push(id);
    }
    saveBestsellersToFile();
    res.json({ success: true, added: arr });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/api/bestsellers/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    if (db) {
      await db.collection("bestsellers").deleteOne({ id });
      return res.json({ success: true });
    }
    bestsellerIds = bestsellerIds.filter(x => x !== id);
    saveBestsellersToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

// Subcategories API
app.get("/api/subcategories", async (req, res) => {
  try {
    const category = (req.query.category || "").toString();
    if (!category) return res.status(400).json({ error: "category required" });
    if (db) {
      const list = await db.collection("subcategories").find({ category }).toArray();
      return res.json(list.map((s) => s.name));
    }
    const list = subcategories[category] || [];
    return res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/subcategories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { category, name } = req.body || {};
    if (!category || !name) return res.status(400).json({ error: "category and name required" });
    if (db) {
      const exists = await db.collection("subcategories").findOne({ category, name });
      if (exists) return res.json({ success: true });
      await db.collection("subcategories").insertOne({ category, name });
      return res.json({ success: true });
    }
    const list = subcategories[category] || [];
    if (!list.includes(name)) {
      subcategories[category] = [...list, name];
      saveSubcategoriesToFile();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});

app.put("/api/subcategories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { category, oldName, newName } = req.body || {};
    if (!category || !oldName || !newName) return res.status(400).json({ error: "category, oldName, newName required" });
    if (db) {
      const r = await db.collection("subcategories").updateOne({ category, name: oldName }, { $set: { name: newName } });
      if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
      return res.json({ success: true });
    }
    const list = subcategories[category] || [];
    const idx = list.findIndex((n) => n === oldName);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    list[idx] = newName;
    subcategories[category] = list;
    saveSubcategoriesToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});
app.delete("/api/categories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const body = req.body || {};
    const queryName = (req.query?.name || "").toString();
    const name = body.name || queryName;
    if (!name) return res.status(400).json({ error: "Name required" });
    if (db) {
      await db.collection("categories").deleteOne({ name });
      await db.collection("subcategories").deleteMany({ category: name });
      return res.json({ success: true });
    }
    categories = categories.filter((c) => c !== name);
    if (subcategories[name]) delete subcategories[name];
    saveCategoriesToFile();
    saveSubcategoriesToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});
app.delete("/api/subcategories", authMiddleware, adminOnly, async (req, res) => {
  try {
    const body = req.body || {};
    const qCategory = (req.query?.category || "").toString();
    const qName = (req.query?.name || "").toString();
    const category = body.category || qCategory;
    const name = body.name || qName;
    if (!category || !name) return res.status(400).json({ error: "category, name required" });
    if (db) {
      await db.collection("subcategories").deleteOne({ category, name });
      return res.json({ success: true });
    }
    const list = subcategories[category] || [];
    subcategories[category] = list.filter((n) => n !== name);
    saveSubcategoriesToFile();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
});