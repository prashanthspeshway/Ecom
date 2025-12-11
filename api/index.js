// Vercel serverless function entry point
// Import the Express app and DB initialization utilities
import app, { getDbInitPromise } from "../backend/index.js";

// Ensure database is initialized before handling requests
let initPromise = null;

async function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = getDbInitPromise().catch((error) => {
      console.error("[api/index] DB initialization error:", error);
      // Don't throw - routes will handle DB unavailable gracefully
      return null;
    });
  }
  return initPromise;
}

// Export handler that waits for DB initialization
export default async function handler(req, res) {
  // Wait for DB initialization (routes are already registered synchronously)
  await ensureDbInitialized();
  // Forward to Express app
  return app(req, res);
}
