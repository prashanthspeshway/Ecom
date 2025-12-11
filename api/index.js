// Vercel serverless function entry point
// Import the backend which initializes the Express app
import "../backend/index.js";

// Re-import to get the initialized app
// The app is exported from backend/index.js after initialization
let appInstance = null;
let initPromise = null;

async function getApp() {
  if (!initPromise) {
    initPromise = import("../backend/index.js").then((module) => {
      appInstance = module.default;
      return appInstance;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}

