import express from "express";
import path from "path";
import fs from "fs";

export default function register({ app, getDb, authMiddleware, adminOnly, upload, s3, hasS3, uploadDir }) {
  const router = express.Router();


  router.post("/upload-public", authMiddleware, upload.array("files", 3), async (req, res) => {
    try {
      if (s3) {
        const uploaded = [];
        for (const file of (req.files || [])) {
          const ext = path.extname(file.originalname);
          const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
          const Key = `uploads/${Date.now()}_${base}${ext}`;
          try {
            await s3.send(new (await import("@aws-sdk/client-s3")).PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key, Body: file.buffer, ContentType: file.mimetype }));
            const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${Key}`;
            uploaded.push(url);
          } catch (err) {
            const localName = `${Date.now()}_${base}${ext}`;
            const localPath = path.join(uploadDir, localName);
            try { fs.writeFileSync(localPath, file.buffer); uploaded.push(`/uploads/${localName}`); } catch {}
          }
        }
        return res.json({ urls: uploaded });
      }
      const files = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);
      res.json({ urls: files });
    } catch (e) {
      res.status(500).json({ error: "Upload failed", detail: String(e?.message || e) });
    }
  });

  router.get("/admin/s3-check", authMiddleware, adminOnly, async (req, res) => {
    try {
      const info = { configured: Boolean(hasS3 && s3), bucket: process.env.S3_BUCKET, region: process.env.S3_REGION };
      if (!hasS3 || !s3) return res.status(400).json(info);
      try {
        const testKey = `uploads/ping_${Date.now()}.txt`;
        await s3.send(new (await import("@aws-sdk/client-s3")).PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: testKey, Body: Buffer.from("ping") }));
        info.putTest = { ok: true, key: testKey, url: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${testKey}` };
      } catch (e) {
        info.putTest = { ok: false, error: String(e?.message || e) };
      }
      res.json(info);
    } catch (e) {
      res.status(500).json({ error: "Check failed" });
    }
  });

  router.post("/upload", authMiddleware, adminOnly, upload.array("files", 10), async (req, res) => {
    try {
      if (s3) {
        const uploaded = [];
        for (const file of (req.files || [])) {
          const ext = path.extname(file.originalname);
          const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
          const Key = `uploads/${Date.now()}_${base}${ext}`;
          try {
            await s3.send(new (await import("@aws-sdk/client-s3")).PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key, Body: file.buffer, ContentType: file.mimetype }));
            const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${Key}`;
            uploaded.push(url);
          } catch (err) {
            const localName = `${Date.now()}_${base}${ext}`;
            const localPath = path.join(uploadDir, localName);
            try { fs.writeFileSync(localPath, file.buffer); uploaded.push(`/uploads/${localName}`); } catch {}
          }
        }
        return res.json({ urls: uploaded });
      }
      const files = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);
      res.json({ urls: files });
    } catch (e) {
      res.status(500).json({ error: "Upload failed", detail: String(e?.message || e) });
    }
  });

  app.use("/api", router);
}