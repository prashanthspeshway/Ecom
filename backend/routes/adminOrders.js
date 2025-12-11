import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const list = await db.collection("orders")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      const formatted = list.map((o) => ({
        id: o.id || String(o._id),
        user: o.user,
        items: o.items || [],
        status: o.status || "placed",
        createdAt: o.createdAt || Date.now(),
      }));

      res.json(formatted);
    } catch (e) {
      console.error("[adminOrders] Get error:", e);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const o = await db.collection("orders").findOne({
        $or: [{ id }, { _id: id }],
      });

      if (!o) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({
        id: o.id || String(o._id),
        user: o.user,
        items: o.items || [],
        status: o.status || "placed",
        createdAt: o.createdAt || Date.now(),
      });
    } catch (e) {
      console.error("[adminOrders] Get by id error:", e);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body || {};
      if (!status) {
        return res.status(400).json({ error: "status required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const r = await db.collection("orders").updateOne(
        { $or: [{ id }, { _id: id }] },
        { $set: { status } }
      );

      if (!r.matchedCount) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[adminOrders] Update error:", e);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  router.put("/:id/item/:pid", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const pid = req.params.pid;
      const { stage } = req.body || {};
      
      const valid = new Set([
        "placed",
        "dispatched",
        "in_transit",
        "shipped",
        "out_for_delivery",
        "delivered",
      ]);

      if (!stage || !valid.has(stage)) {
        return res.status(400).json({ error: "invalid stage" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const order = await db.collection("orders").findOne({
        $or: [{ id }, { _id: id }],
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const idx = items.findIndex((it) => it.productId === pid);
      
      if (idx === -1) {
        return res.status(404).json({ error: "Item not found" });
      }

      const progress = items[idx].progress || {};
      progress[stage] = Date.now();
      items[idx].progress = progress;

      const stages = [
        "placed",
        "dispatched",
        "in_transit",
        "shipped",
        "out_for_delivery",
        "delivered",
      ];
      const nextStatus = stages.findLast((s) => progress[s]) || order.status;

      await db.collection("orders").updateOne(
        { $or: [{ id }, { _id: id }] },
        { $set: { items, status: nextStatus } }
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[adminOrders] Update item error:", e);
      res.status(500).json({ error: "Failed to update order item" });
    }
  });

  app.use("/api/admin/orders", router);
}
