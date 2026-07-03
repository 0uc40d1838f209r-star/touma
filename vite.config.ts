import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages はサブパス (https://<user>.github.io/touma/) で配信される
  base: process.env.GITHUB_ACTIONS ? "/touma/" : "/",
  plugins: [react(), tailwindcss()],
});
