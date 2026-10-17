import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { preactAlias } from "./tools/build.mjs";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: preactAlias(import.meta.dirname) },
});
