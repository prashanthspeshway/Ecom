import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

export default function register({ app, authMiddleware }) {
  const router = express.Router();

  // Create Razorpay instance
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
  });

  // Create Razorpay order
  router.post("/create-order", authMiddleware, async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body || {};
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount is required" });
      }

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: "Razorpay credentials not configured" });
      }

      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: receipt || `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      
      res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      });
    } catch (e) {
      console.error("Razorpay order creation error:", e);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Get Razorpay public key (for frontend)
  router.get("/get-key", authMiddleware, (req, res) => {
    try {
      if (!process.env.RAZORPAY_KEY_ID) {
        return res.status(500).json({ error: "Razorpay not configured" });
      }
      res.json({ key_id: process.env.RAZORPAY_KEY_ID });
    } catch (e) {
      res.status(500).json({ error: "Failed to get Razorpay key" });
    }
  });

  // Verify Razorpay payment
  router.post("/verify-payment", authMiddleware, async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Payment verification data required" });
      }

      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(text)
        .digest("hex");

      if (generated_signature === razorpay_signature) {
        res.json({ 
          success: true, 
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id 
        });
      } else {
        res.status(400).json({ error: "Payment verification failed" });
      }
    } catch (e) {
      console.error("Payment verification error:", e);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  app.use("/api/payments", router);
}
