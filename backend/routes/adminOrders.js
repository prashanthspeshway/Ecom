import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getOrders, setOrders, saveOrders }) {
  const router = express.Router();

  router.get("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
        return res.json(list.map((o) => ({ id: o.id || String(o._id), user: o.user, items: o.items || [], status: o.status || "placed", createdAt: o.createdAt || Date.now() })));
      }
      const arr = Object.entries(getOrders()).flatMap(([email, list]) => (Array.isArray(list) ? list.map((o) => ({ ...o, user: email })) : []));
      arr.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      res.json(arr);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const db = getDb();
      if (db) {
        const o = await db.collection("orders").findOne({ $or: [{ id }, { _id: id }] });
        if (!o) return res.status(404).json({ error: "Not found" });
        return res.json({ id: o.id || String(o._id), user: o.user, items: o.items || [], status: o.status || "placed", createdAt: o.createdAt || Date.now() });
      }
      const orders = getOrders();
      for (const email of Object.keys(orders)) {
        const list = Array.isArray(orders[email]) ? orders[email] : [];
        const o = list.find((x) => x.id === id);
        if (o) return res.json({ ...o, user: email });
      }
      res.status(404).json({ error: "Not found" });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body || {};
      if (!status) return res.status(400).json({ error: "status required" });
      const db = getDb();
      if (db) {
        const r = await db.collection("orders").updateOne({ $or: [{ id }, { _id: id }] }, { $set: { status } });
        if (!r.matchedCount) return res.status(404).json({ error: "Not found" });
        return res.json({ success: true });
      }
      const orders = getOrders();
      let updated = false;
      for (const email of Object.keys(orders)) {
        const list = Array.isArray(orders[email]) ? orders[email] : [];
        const idx = list.findIndex((o) => o.id === id);
        if (idx >= 0) { list[idx].status = status; orders[email] = list; updated = true; break; }
      }
      if (!updated) return res.status(404).json({ error: "Not found" });
      setOrders(orders);
      saveOrders();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.put("/:id/item/:pid", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const pid = req.params.pid;
      const { stage } = req.body || {};
      const valid = new Set(["placed", "dispatched", "in_transit", "shipped", "out_for_delivery", "delivered"]);
      if (!stage || !valid.has(stage)) return res.status(400).json({ error: "invalid stage" });
      const db = getDb();
      if (db) {
        const order = await db.collection("orders").findOne({ $or: [{ id }, { _id: id }] });
        if (!order) return res.status(404).json({ error: "Not found" });
        const items = Array.isArray(order.items) ? order.items : [];
        const idx = items.findIndex((it) => it.productId === pid);
        if (idx === -1) return res.status(404).json({ error: "Item not found" });
        const progress = items[idx].progress || {};
        progress[stage] = Date.now();
        items[idx].progress = progress;
        const nextStatus = ["placed", "dispatched", "in_transit", "shipped", "out_for_delivery", "delivered"].findLast((s) => progress[s]);
        await db.collection("orders").updateOne({ $or: [{ id }, { _id: id }] }, { $set: { items, status: nextStatus || order.status } });
        return res.json({ success: true });
      }
      const orders = getOrders();
      let found = false;
      for (const email of Object.keys(orders)) {
        const list = Array.isArray(orders[email]) ? orders[email] : [];
        const oIdx = list.findIndex((o) => o.id === id);
        if (oIdx >= 0) {
          const items = Array.isArray(list[oIdx].items) ? list[oIdx].items : [];
          const iIdx = items.findIndex((it) => it.productId === pid);
          if (iIdx === -1) break;
          const progress = items[iIdx].progress || {};
          progress[stage] = Date.now();
          items[iIdx].progress = progress;
          const nextStatus = ["placed", "dispatched", "in_transit", "shipped", "out_for_delivery", "delivered"].findLast((s) => progress[s]);
          list[oIdx].items = items;
          list[oIdx].status = nextStatus || list[oIdx].status;
          orders[email] = list;
          setOrders(orders);
          saveOrders();
          found = true;
          break;
        }
      }
      if (!found) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/admin/orders", router);
}