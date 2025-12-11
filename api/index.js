// Vercel serverless function entry point
// Import the Express app - routes are registered synchronously
import app from "../backend/index.js";

// Export the Express app directly
// Routes are registered immediately when backend/index.js is imported
// Database connection happens asynchronously but routes handle it gracefully
export default app;
