// Vercel serverless function entry point
// This handler ensures the Express app is initialized before handling requests

let app = null;
let initPromise = null;

async function ensureInitialized() {
  if (!initPromise) {
    // Import backend which initializes the Express app
    initPromise = import("../backend/index.js").then(async (module) => {
      app = module.default;
      // Give a moment for routes to be registered
      await new Promise((resolve) => setTimeout(resolve, 500));
      return app;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  try {
    await ensureInitialized();
    if (!app) {
      return res.status(503).json({ error: "Server initializing, please try again" });
    }
    return app(req, res);
  } catch (error) {
    console.error("[api/index] Handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
