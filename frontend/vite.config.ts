import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_URL || "/";
  const plugins = [react()];
  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      if (mod?.componentTagger) plugins.push(mod.componentTagger());
    } catch (e) { void e; }
    
    // Filter console errors for ECONNREFUSED proxy errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(" ");
      if (message.includes("http proxy error") && message.includes("ECONNREFUSED")) {
        return; // Suppress ECONNREFUSED proxy errors
      }
      originalError.apply(console, args);
    };
  }
  return {
    base,
    server: {
      host: "::",
      port: 8080,
      // Allowed hosts for development and production
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "7114a8347d47.ngrok-free.app",
        "ecom.speshwayhrms.com",
        "www.ecom.speshwayhrms.com",
        "ecomb.speshwayhrms.com",
        "www.ecomb.speshwayhrms.com",
      ],
      hmr: false,
      proxy: {
        "/api": {
          // Development: localhost, Production: https://ecomb.speshwayhrms.com
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy: any, _options: any) => {
            proxy.on("error", (err: any, _req: any, _res: any) => {
              // Suppress connection refused errors when backend is not running
              if (err.code === "ECONNREFUSED") {
                // Silently ignore - backend is not running
                return;
              }
              console.error("Proxy error:", err);
            });
          },
        },
        "/uploads": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy: any, _options: any) => {
            proxy.on("error", (err: any, _req: any, _res: any) => {
              if (err.code === "ECONNREFUSED") {
                // Silently ignore - backend is not running
                return;
              }
              console.error("Proxy error:", err);
            });
          },
        },
      },
    },
    preview: {
      host: "::",
      port: 8080,
      // Allowed hosts for preview mode (production domains)
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "7114a8347d47.ngrok-free.app",
        "ecom.speshwayhrms.com",
        "www.ecom.speshwayhrms.com",
        "ecomb.speshwayhrms.com",
        "www.ecomb.speshwayhrms.com",
      ],
      proxy: {
        "/api": {
          // Development: localhost, Production: https://ecomb.speshwayhrms.com
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy: any, _options: any) => {
            proxy.on("error", (err: any, _req: any, _res: any) => {
              if (err.code !== "ECONNREFUSED") {
                console.error("Proxy error:", err);
              }
            });
          },
        },
        "/uploads": {
          // Development: localhost, Production: https://ecomb.speshwayhrms.com
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          timeout: 10000,
          configure: (proxy: any, _options: any) => {
            proxy.on("error", (err: any, _req: any, _res: any) => {
              if (err.code !== "ECONNREFUSED") {
                console.error("Proxy error:", err);
              }
            });
          },
        },
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
