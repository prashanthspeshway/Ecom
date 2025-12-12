import express from "express";
import crypto from "crypto";

export default function register({ app, getDb, authMiddleware }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const list = await db.collection("orders")
        .find({ user: req.user.email })
        .sort({ createdAt: -1 })
        .toArray();
      
      res.json(list);
    } catch (e) {
      console.error("[orders] Get error:", e);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  router.get("/:id", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const item = await db.collection("orders").findOne({
        id: req.params.id,
        user: req.user.email,
      });

      if (!item) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(item);
    } catch (e) {
      console.error("[orders] Get by id error:", e);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  router.put("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      // Update order with payment details
      if (req.body.razorpayOrderId && req.body.razorpayPaymentId) {
        await db.collection("orders").updateOne(
          { razorpayOrderId: req.body.razorpayOrderId, user: req.user.email },
          {
            $set: {
              razorpayPaymentId: req.body.razorpayPaymentId,
              status: "placed",
            },
          }
        );
        res.json({ success: true });
        return;
      }

      res.status(400).json({ error: "Invalid update request" });
    } catch (e) {
      console.error("[orders] Update error:", e);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      let items = Array.isArray(req.body?.items) ? req.body.items : [];
      
      // If no items provided, get from cart
      if (!items.length) {
        const cartItems = await db.collection("cart")
          .find({ user: req.user.email })
          .toArray();
        items = cartItems.map((c) => ({
          productId: c.productId,
          quantity: Number(c.quantity || 1),
        }));
      }

      if (!items.length) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Get product details
      const productIds = items.map((it) => it.productId);
      const products = await db.collection("products")
        .find({ id: { $in: productIds } })
        .toArray();
      const pmap = new Map(products.map((p) => [p.id, p]));

      // Enrich items with product data
      const enriched = items.map((it) => {
        const p = pmap.get(it.productId) || {};
        return {
          productId: it.productId,
          quantity: Number(it.quantity || 1),
          price: Number(p.price || 0),
          name: p.name || "",
          image: (p.images || [])[0] || "",
          progress: { placed: Date.now() },
        };
      });

      // Calculate total
      const total = enriched.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const order = {
        id: crypto.randomUUID(),
        user: req.user.email,
        items: enriched,
        status: req.body.payment === "razorpay" ? "pending" : "placed",
        createdAt: Date.now(),
        shipping: req.body.address || null,
        payment: req.body.payment || "cod",
        total: total,
        razorpayOrderId: req.body.razorpayOrderId || null,
        razorpayPaymentId: req.body.razorpayPaymentId || null,
      };

      await db.collection("orders").insertOne(order);
      
      // Clear cart after order creation (only if payment is COD or Razorpay payment is confirmed)
      if (req.body.payment === "cod" || req.body.razorpayPaymentId) {
        await db.collection("cart").deleteMany({ user: req.user.email });
      }

      res.json(order);
    } catch (e) {
      console.error("[orders] Create error:", e);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.use("/api/orders", router);
}
