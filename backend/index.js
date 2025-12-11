import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import registerProducts from "./routes/products.js";
import registerCategories from "./routes/categories.js";
import registerSubcategories from "./routes/subcategories.js";
import registerAuth from "./routes/auth.js";
import registerUpload from "./routes/upload.js";
import registerBanners from "./routes/banners.js";
import registerBestsellers from "./routes/bestsellers.js";
import registerFeatured from "./routes/featured.js";
import registerCart from "./routes/cart.js";
import registerOrders from "./routes/orders.js";
import registerAdminOrders from "./routes/adminOrders.js";
import registerWishlist from "./routes/wishlist.js";
import registerCategoryTiles from "./routes/categoryTiles.js";
import registerCarousel from "./routes/carousel.js";
import registerSettings from "./routes/settings.js";
import registerPages from "./routes/pages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables - Vercel provides them via process.env
// Only load .env file if it exists (for local development)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Validate required environment variables (don't exit in Vercel, just log)
if (!process.env.MONGO_URI) {
  console.error("ERROR: MONGO_URI environment variable is required");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
}

if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET environment variable is required");
  if (!process.env.VERCEL) {
    process.exit(1);
  }
}

const app = express();

// CORS configuration - allow Vercel deployment URL, Render frontend, and localhost
const allowedOrigins = [
  "https://ecom.speshwayhrms.com",
  "http://localhost:8080",
  "http://localhost:5173",
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL : null,
  // Allow all Vercel preview and production URLs
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app\/.*$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === "string") {
        return origin === allowed || origin.startsWith(allowed);
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      // Log for debugging but allow for now
      console.log(`[cors] Allowing origin: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Database connection
let dbClient = null;
let db = null;
let dbInitialized = false;
let dbInitPromise = null;

// S3 setup
let s3 = null;
const hasS3 = Boolean(
  process.env.S3_BUCKET && 
  process.env.S3_REGION && 
  process.env.S3_ACCESS_KEY_ID && 
  process.env.S3_SECRET_ACCESS_KEY
);

if (hasS3) {
  s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

// File upload setup
const uploadDir = path.join(__dirname, "uploads");
const upload = multer({
  storage: hasS3 ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
      cb(null, `${Date.now()}_${base}${ext}`);
    },
  }),
});

app.use("/uploads", express.static(uploadDir));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    database: db ? "connected" : "disconnected",
    s3: hasS3 ? "configured" : "not configured"
  });
});

// JWT token signing
function signToken(user) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    { 
      id: user._id?.toString() || user.id, 
      email: user.email, 
      role: user.role || "user" 
    }, 
    secret, 
    { expiresIn: "7d" }
  );
}

// Authentication middleware
function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const secret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Admin-only middleware
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Database initialization with proper indexes
async function initDb() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "ecom";

  if (!uri) {
    console.error("[database] MONGO_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Ensure connection string has proper parameters
    let connectionUri = uri;
    if (!connectionUri.includes('retryWrites')) {
      connectionUri += (connectionUri.includes('?') ? '&' : '?') + 'retryWrites=true&w=majority';
    }
    
    // MongoDB connection options - MongoDB Atlas handles SSL/TLS automatically
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };
    
    console.log("[database] Attempting to connect to MongoDB...");
    dbClient = new MongoClient(connectionUri, options);
    await dbClient.connect();
    db = dbClient.db(dbName);

    console.log(`[database] Connected to MongoDB: ${dbName}`);

    // Create indexes for better performance and data integrity
    try {
      // Users collection indexes
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db.collection("users").createIndex({ role: 1 });
      
      // Migrate users from JSON file if collection is empty
      const userCount = await db.collection("users").countDocuments();
      if (userCount === 0) {
        try {
          const usersPath = path.join(__dirname, "data", "users.json");
          if (fs.existsSync(usersPath)) {
            const raw = fs.readFileSync(usersPath, "utf-8");
            const fileUsers = JSON.parse(raw);
            if (Array.isArray(fileUsers) && fileUsers.length > 0) {
              // Users already have hashed passwords, insert directly
              await db.collection("users").insertMany(fileUsers);
              console.log(`[database] Migrated ${fileUsers.length} users from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] User migration skipped:", migrateError.message);
        }
      }
      
      // Products collection indexes
      await db.collection("products").createIndex({ id: 1 }, { unique: true });
      await db.collection("products").createIndex({ category: 1 });
      await db.collection("products").createIndex({ onSale: 1 });
      await db.collection("products").createIndex({ isBestSeller: 1 });
      await db.collection("products").createIndex({ createdAt: -1 });
      
      // Migrate products from JSON file if collection is empty
      const productCount = await db.collection("products").countDocuments();
      if (productCount === 0) {
        try {
          const productsPath = path.join(__dirname, "data", "products.json");
          if (fs.existsSync(productsPath)) {
            const raw = fs.readFileSync(productsPath, "utf-8");
            const fileProducts = JSON.parse(raw);
            if (Array.isArray(fileProducts) && fileProducts.length > 0) {
              await db.collection("products").insertMany(fileProducts);
              console.log(`[database] Migrated ${fileProducts.length} products from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Product migration skipped:", migrateError.message);
        }
      }
      
      // Orders collection indexes
      await db.collection("orders").createIndex({ user: 1, createdAt: -1 });
      await db.collection("orders").createIndex({ id: 1 }, { unique: true });
      await db.collection("orders").createIndex({ status: 1 });
      
      // Migrate orders from JSON file if collection is empty
      const orderCount = await db.collection("orders").countDocuments();
      if (orderCount === 0) {
        try {
          const ordersPath = path.join(__dirname, "data", "orders.json");
          if (fs.existsSync(ordersPath)) {
            const raw = fs.readFileSync(ordersPath, "utf-8");
            const fileOrders = JSON.parse(raw);
            if (typeof fileOrders === 'object' && fileOrders !== null) {
              const ordersArray = Object.entries(fileOrders).flatMap(([user, orders]) => 
                Array.isArray(orders) ? orders : []
              );
              if (ordersArray.length > 0) {
                await db.collection("orders").insertMany(ordersArray);
                console.log(`[database] Migrated ${ordersArray.length} orders from JSON file`);
              }
            }
          }
        } catch (migrateError) {
          console.warn("[database] Order migration skipped:", migrateError.message);
        }
      }
      
      // Cart collection indexes
      await db.collection("cart").createIndex({ user: 1, productId: 1 }, { unique: true });
      
      // Migrate cart from JSON file if collection is empty
      const cartCount = await db.collection("cart").countDocuments();
      if (cartCount === 0) {
        try {
          const cartsPath = path.join(__dirname, "data", "carts.json");
          if (fs.existsSync(cartsPath)) {
            const raw = fs.readFileSync(cartsPath, "utf-8");
            const fileCarts = JSON.parse(raw);
            if (typeof fileCarts === 'object' && fileCarts !== null) {
              const cartArray = Object.entries(fileCarts).flatMap(([user, items]) => 
                Array.isArray(items) ? items.map(item => ({
                  user,
                  productId: String(item.productId || item),
                  quantity: Number(item.quantity || 1)
                })) : []
              );
              if (cartArray.length > 0) {
                await db.collection("cart").insertMany(cartArray);
                console.log(`[database] Migrated ${cartArray.length} cart items from JSON file`);
              }
            }
          }
        } catch (migrateError) {
          console.warn("[database] Cart migration skipped:", migrateError.message);
        }
      }
      
      // Wishlist collection indexes
      await db.collection("wishlist").createIndex({ user: 1, productId: 1 }, { unique: true });
      
      // Migrate wishlist from JSON file if collection is empty
      const wishlistCount = await db.collection("wishlist").countDocuments();
      if (wishlistCount === 0) {
        try {
          const wishlistsPath = path.join(__dirname, "data", "wishlists.json");
          if (fs.existsSync(wishlistsPath)) {
            const raw = fs.readFileSync(wishlistsPath, "utf-8");
            const fileWishlists = JSON.parse(raw);
            if (typeof fileWishlists === 'object' && fileWishlists !== null) {
              const wishlistArray = Object.entries(fileWishlists).flatMap(([user, items]) => 
                Array.isArray(items) ? items.map(item => ({
                  user,
                  productId: String(item.productId || item)
                })) : []
              );
              if (wishlistArray.length > 0) {
                await db.collection("wishlist").insertMany(wishlistArray);
                console.log(`[database] Migrated ${wishlistArray.length} wishlist items from JSON file`);
              }
            }
          }
        } catch (migrateError) {
          console.warn("[database] Wishlist migration skipped:", migrateError.message);
        }
      }
      
      // Categories collection indexes
      await db.collection("categories").createIndex({ name: 1 }, { unique: true });
      
      // Migrate categories from JSON file if collection is empty
      const categoryCount = await db.collection("categories").countDocuments();
      if (categoryCount === 0) {
        try {
          const categoriesPath = path.join(__dirname, "data", "categories.json");
          if (fs.existsSync(categoriesPath)) {
            const raw = fs.readFileSync(categoriesPath, "utf-8");
            const fileCategories = JSON.parse(raw);
            if (Array.isArray(fileCategories) && fileCategories.length > 0) {
              const categoriesArray = fileCategories.map(name => ({ name }));
              await db.collection("categories").insertMany(categoriesArray);
              console.log(`[database] Migrated ${categoriesArray.length} categories from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Category migration skipped:", migrateError.message);
        }
      }
      
      // Subcategories collection indexes
      await db.collection("subcategories").createIndex({ category: 1, name: 1 }, { unique: true });
      
      // Migrate subcategories from JSON file if collection is empty
      const subcategoryCount = await db.collection("subcategories").countDocuments();
      if (subcategoryCount === 0) {
        try {
          const subcategoriesPath = path.join(__dirname, "data", "subcategories.json");
          if (fs.existsSync(subcategoriesPath)) {
            const raw = fs.readFileSync(subcategoriesPath, "utf-8");
            const fileSubcategories = JSON.parse(raw);
            if (typeof fileSubcategories === 'object' && fileSubcategories !== null) {
              const subcategoriesArray = Object.entries(fileSubcategories).flatMap(([category, names]) => 
                Array.isArray(names) ? names.map(name => ({ category, name })) : []
              );
              if (subcategoriesArray.length > 0) {
                await db.collection("subcategories").insertMany(subcategoriesArray);
                console.log(`[database] Migrated ${subcategoriesArray.length} subcategories from JSON file`);
              }
            }
          }
        } catch (migrateError) {
          console.warn("[database] Subcategory migration skipped:", migrateError.message);
        }
      }
      
      // Banners collection indexes
      await db.collection("banners").createIndex({ url: 1 }, { unique: true });
      
      // Migrate banners from JSON file if collection is empty
      const bannerCount = await db.collection("banners").countDocuments();
      if (bannerCount === 0) {
        try {
          const bannersPath = path.join(__dirname, "data", "banners.json");
          if (fs.existsSync(bannersPath)) {
            const raw = fs.readFileSync(bannersPath, "utf-8");
            const fileBanners = JSON.parse(raw);
            if (Array.isArray(fileBanners) && fileBanners.length > 0) {
              const bannersArray = fileBanners.map(url => ({ url }));
              await db.collection("banners").insertMany(bannersArray);
              console.log(`[database] Migrated ${bannersArray.length} banners from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Banner migration skipped:", migrateError.message);
        }
      }
      
      // Bestsellers collection indexes
      await db.collection("bestsellers").createIndex({ id: 1 }, { unique: true });
      
      // Migrate bestsellers from JSON file if collection is empty
      const bestsellerCount = await db.collection("bestsellers").countDocuments();
      if (bestsellerCount === 0) {
        try {
          const bestsellersPath = path.join(__dirname, "data", "bestsellers.json");
          if (fs.existsSync(bestsellersPath)) {
            const raw = fs.readFileSync(bestsellersPath, "utf-8");
            const fileBestsellers = JSON.parse(raw);
            if (Array.isArray(fileBestsellers) && fileBestsellers.length > 0) {
              const bestsellersArray = fileBestsellers.map(id => ({ id: String(id) }));
              await db.collection("bestsellers").insertMany(bestsellersArray);
              console.log(`[database] Migrated ${bestsellersArray.length} bestsellers from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Bestseller migration skipped:", migrateError.message);
        }
      }
      
      // Featured collection indexes
      await db.collection("featured").createIndex({ id: 1 }, { unique: true });
      
      // Carousel collection - single document with images array
      const carouselCount = await db.collection("carousel").countDocuments();
      if (carouselCount === 0) {
        try {
          const carouselPath = path.join(__dirname, "data", "carousel.json");
          if (fs.existsSync(carouselPath)) {
            const raw = fs.readFileSync(carouselPath, "utf-8");
            const fileCarousel = JSON.parse(raw);
            if (Array.isArray(fileCarousel) && fileCarousel.length > 0) {
              await db.collection("carousel").insertOne({ _id: "default", images: fileCarousel });
              console.log(`[database] Migrated carousel with ${fileCarousel.length} images from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Carousel migration skipped:", migrateError.message);
        }
      }
      
      // Category tiles collection indexes
      await db.collection("category_tiles").createIndex({ position: 1 }, { unique: true });
      
      // Migrate category tiles from JSON file if collection is empty
      const categoryTileCount = await db.collection("category_tiles").countDocuments();
      if (categoryTileCount === 0) {
        try {
          const categoryTilesPath = path.join(__dirname, "data", "category_tiles.json");
          if (fs.existsSync(categoryTilesPath)) {
            const raw = fs.readFileSync(categoryTilesPath, "utf-8");
            const fileCategoryTiles = JSON.parse(raw);
            if (typeof fileCategoryTiles === 'object' && fileCategoryTiles !== null) {
              const tilesArray = Object.entries(fileCategoryTiles).map(([pos, obj]) => ({
                ...obj,
                position: Number(pos)
              }));
              if (tilesArray.length > 0) {
                await db.collection("category_tiles").insertMany(tilesArray);
                console.log(`[database] Migrated ${tilesArray.length} category tiles from JSON file`);
              }
            }
          }
        } catch (migrateError) {
          console.warn("[database] Category tile migration skipped:", migrateError.message);
        }
      }
      
      // Settings collection - single document
      const settingsCount = await db.collection("settings").countDocuments();
      if (settingsCount === 0) {
        try {
          const settingsPath = path.join(__dirname, "data", "settings.json");
          if (fs.existsSync(settingsPath)) {
            const raw = fs.readFileSync(settingsPath, "utf-8");
            const fileSettings = JSON.parse(raw);
            if (typeof fileSettings === 'object' && fileSettings !== null) {
              await db.collection("settings").insertOne({ _id: "main", ...fileSettings });
              console.log(`[database] Migrated settings from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Settings migration skipped:", migrateError.message);
        }
      }
      
      // Pages collection indexes
      await db.collection("pages").createIndex({ slug: 1 }, { unique: true });
      
      // Migrate pages from JSON file if collection is empty
      const pageCount = await db.collection("pages").countDocuments();
      if (pageCount === 0) {
        try {
          const pagesPath = path.join(__dirname, "data", "pages.json");
          if (fs.existsSync(pagesPath)) {
            const raw = fs.readFileSync(pagesPath, "utf-8");
            const filePages = JSON.parse(raw);
            if (Array.isArray(filePages) && filePages.length > 0) {
              await db.collection("pages").insertMany(filePages);
              console.log(`[database] Migrated ${filePages.length} pages from JSON file`);
            }
          }
        } catch (migrateError) {
          console.warn("[database] Page migration skipped:", migrateError.message);
        }
      }
      
      console.log("[database] Indexes created successfully");
      
      // Summary: List all collections
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name).sort();
      console.log(`[database] Available collections: ${collectionNames.join(", ")}`);
      
      // Count documents in each collection
      console.log("\n[database] Collection summary:");
      for (const name of collectionNames) {
        const count = await db.collection(name).countDocuments();
        console.log(`  - ${name}: ${count} document(s)`);
      }
      
    } catch (indexError) {
      console.warn("[database] Some indexes may already exist:", indexError.message);
    }

  } catch (e) {
    console.error("[database] Connection failed:", e.message);
    
    // Provide helpful error messages for SSL/TLS issues
    if (e.message.includes('SSL') || e.message.includes('TLS') || e.message.includes('tlsv1')) {
      console.error("\n[tip] SSL/TLS error detected. Common fixes:");
      console.error("  1. Check MongoDB Atlas Network Access - ensure your IP is whitelisted (or use 0.0.0.0/0 for all)");
      console.error("  2. Verify your MongoDB connection string format is correct");
      console.error("  3. Ensure your MongoDB Atlas cluster is running and accessible");
      console.error("  4. Check MongoDB Atlas Database Access - ensure user has proper permissions");
      console.error("  5. Try updating your connection string to include: ?retryWrites=true&w=majority");
    }
    
    throw e;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[shutdown] Closing database connection...");
  if (dbClient) {
    await dbClient.close();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[shutdown] Closing database connection...");
  if (dbClient) {
    await dbClient.close();
  }
  process.exit(0);
});

// Error handlers
process.on("uncaughtException", (err) => {
  console.error("[error] Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[error] Unhandled rejection:", err);
});

// Register all routes immediately (synchronously)
// Routes handle DB being null by returning 503 errors
// This ensures routes are available for Vercel serverless functions
registerProducts({ app, getDb: () => db, authMiddleware, adminOnly });
registerCategories({ app, getDb: () => db, authMiddleware, adminOnly });
registerSubcategories({ app, getDb: () => db, authMiddleware, adminOnly });
registerAuth({ 
  app, 
  getDb: () => db, 
  signToken, 
  adminInviteCode: process.env.ADMIN_INVITE_CODE || "", 
  authMiddleware 
});
registerUpload({ 
  app, 
  getDb: () => db, 
  authMiddleware, 
  adminOnly, 
  upload, 
  s3, 
  hasS3, 
  uploadDir 
});
registerBanners({ app, getDb: () => db, authMiddleware, adminOnly });
registerCarousel({ app, getDb: () => db, authMiddleware, adminOnly });
registerBestsellers({ app, getDb: () => db, authMiddleware, adminOnly });
registerFeatured({ app, getDb: () => db, authMiddleware, adminOnly });
registerCart({ app, getDb: () => db, authMiddleware });
registerOrders({ app, getDb: () => db, authMiddleware });
registerAdminOrders({ app, getDb: () => db, authMiddleware, adminOnly });
registerWishlist({ app, getDb: () => db, authMiddleware });
registerCategoryTiles({ app, getDb: () => db, authMiddleware, adminOnly });
registerSettings({ app, getDb: () => db, authMiddleware, adminOnly });
registerPages({ app, getDb: () => db, authMiddleware, adminOnly });

console.log("[server] Routes registered");

// Initialize database and start server
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// Store init promise for Vercel
dbInitPromise = initDb();
dbInitPromise
  .then(() => {
    console.log("[server] Database initialized");
    
    // Only start HTTP server if not in Vercel serverless environment
    if (!process.env.VERCEL) {
      app.listen(port, () => {
        console.log(`[server] Listening on http://localhost:${port}`);
      });
    } else {
      console.log("[server] Running as Vercel serverless function - ready");
    }
  })
  .catch((error) => {
    console.error("[server] Database initialization failed:", error.message);
    // Don't exit in Vercel - routes are registered, they'll handle DB errors
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  });

// Export app for Vercel serverless functions
export default app;

// Export DB initialization promise for Vercel handler
export function getDbInitPromise() {
  if (!dbInitPromise) {
    dbInitPromise = initDb();
  }
  return dbInitPromise;
}

export function isDbInitialized() {
  return dbInitialized;
}
