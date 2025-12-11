import express from "express";

export default function register({ app, getDb, authMiddleware }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const items = await db.collection("wishlist")
        .find({ user: req.user.email })
        .toArray();
      const productIds = items.map((i) => i.productId);
      const products = await db.collection("products")
        .find({ id: { $in: productIds } })
        .toArray();
      
      res.json(products);
    } catch (e) {
      console.error("[wishlist] Get error:", e);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId } = req.body || {};
      if (!productId) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("wishlist").findOne({
        user: req.user.email,
        productId,
      });

      if (exists) {
        return res.json({ success: true });
      }

      await db.collection("wishlist").insertOne({
        user: req.user.email,
        productId,
      });

      res.json({ success: true });
    } catch (e) {
      console.error("[wishlist] Add error:", e);
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });

  router.delete("/:productId", authMiddleware, async (req, res) => {
    try {
      const productId = req.params.productId;
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("wishlist").deleteOne({
        user: req.user.email,
        productId,
      });

      res.json({ success: true });
    } catch (e) {
      console.error("[wishlist] Delete error:", e);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  app.use("/api/wishlist", router);
}
