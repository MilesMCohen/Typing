import { defineConfig } from "vite";

export default defineConfig({
  base: "/Typing/",
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
