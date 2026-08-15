import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this repository from the custom-domain root.
  base: "/",
  plugins: [react()],
});
