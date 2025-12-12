import express from "express";
import crypto from "crypto";

export default function register({ app, getDb, authMiddleware }) {
  const router = express.Router();

  // Create Razorpay order
  router.post("/create-order", authMiddleware, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        return res.status(500).json({ error: "Razorpay credentials not configured" });
      }

      // Create order using Razorpay API
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
      };

      const authString = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
      
      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authString}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!razorpayResponse.ok) {
        const errorData = await razorpayResponse.json().catch(() => ({}));
        console.error("[payment] Razorpay order creation failed:", errorData);
        return res.status(500).json({ error: "Failed to create payment order" });
      }

      const order = await razorpayResponse.json();
      
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      });
    } catch (e) {
      console.error("[payment] Create order error:", e);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Verify Razorpay payment
  router.post("/verify", authMiddleware, async (req, res) => {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ error: "Payment details missing" });
      }

      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!razorpayKeySecret) {
        return res.status(500).json({ error: "Razorpay credentials not configured" });
      }

      // Verify signature
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(text)
        .digest("hex");

      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Update order status
      const db = getDb();
      if (db) {
        await db.collection("orders").updateOne(
          { razorpayOrderId },
          {
            $set: {
              status: "placed",
              razorpayPaymentId,
              paymentVerified: true,
              paymentVerifiedAt: Date.now(),
            },
          }
        );
      }

      res.json({ success: true, message: "Payment verified successfully" });
    } catch (e) {
      console.error("[payment] Verify error:", e);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  app.use("/api/payment", router);
}

