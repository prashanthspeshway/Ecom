import express from "express";

export default function register({ app, getDb, authMiddleware }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const items = await db.collection("cart").find({ user: req.user.email }).toArray();
      const productIds = items.map((i) => i.productId);
      const products = await db.collection("products").find({ id: { $in: productIds } }).toArray();
      const pmap = new Map(products.map((p) => [p.id, p]));
      
      const enriched = items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 1),
        product: pmap.get(i.productId) || null,
      }));

      res.json(enriched);
    } catch (e) {
      console.error("[cart] Get error:", e);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId, quantity } = req.body || {};
      if (!productId) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const qty = Number(quantity || 1);
      const exists = await db.collection("cart").findOne({ 
        user: req.user.email, 
        productId 
      });

      if (exists) {
        await db.collection("cart").updateOne(
          { user: req.user.email, productId },
          { $set: { quantity: qty } }
        );
      } else {
        await db.collection("cart").insertOne({
          user: req.user.email,
          productId,
          quantity: qty,
        });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[cart] Add error:", e);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  router.put("/", authMiddleware, async (req, res) => {
    try {
      const { productId, quantity } = req.body || {};
      if (!productId) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      // Check product stock
      const product = await db.collection("products").findOne({ id: productId });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const qty = Math.max(1, Math.min(Number(quantity || 1), Number(product.stock || 999)));
      
      const result = await db.collection("cart").updateOne(
        { user: req.user.email, productId },
        { $set: { quantity: qty } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json({ success: true, quantity: qty });
    } catch (e) {
      console.error("[cart] Update error:", e);
      res.status(500).json({ error: "Failed to update cart" });
    }
  });

  router.delete("/:productId", authMiddleware, async (req, res) => {
    try {
      const productId = req.params.productId;
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("cart").deleteOne({ 
        user: req.user.email, 
        productId 
      });
      res.json({ success: true });
    } catch (e) {
      console.error("[cart] Delete error:", e);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  router.delete("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("cart").deleteMany({ user: req.user.email });
      res.json({ success: true });
    } catch (e) {
      console.error("[cart] Clear error:", e);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  app.use("/api/cart", router);
}
