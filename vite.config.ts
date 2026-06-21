import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [
      'mold-attacks-programmer-sur.trycloudflare.com',
      'saree-admin-chi.vercel.app'
    ]
  }
})
