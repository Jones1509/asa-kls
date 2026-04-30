import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Tillad preview-hosts (Emergent + Lovable + lokal udvikling).
    // Brug `true` for at acceptere alle hosts – preview-URL'er ændrer sig
    // mellem deploys/forks, så en hvidliste går hurtigt i stykker.
    allowedHosts: true,
  },
  preview: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
