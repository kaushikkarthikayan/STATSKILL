import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The website runs on http://127.0.0.1:5173 and talks to the API on http://127.0.0.1:8000 (see .env.example).
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173 },
});
