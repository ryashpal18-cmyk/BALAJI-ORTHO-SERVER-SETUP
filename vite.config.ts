import fs from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  return {
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    extensions: [".mjs", ".js", ".ts", ".tsx", ".jsx", ".json"],
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 300000, // Bundle the final letterpad as data for offline/native printing.
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  server: { port: 5173 },
};
});
