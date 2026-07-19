import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Circuit Puzzle — logic-design puzzle game (LabBench, portfolio demo)
export default defineConfig({
  server: { host: "::", port: 5188 },
  plugins: [react()],
});
