import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base path: '/' since the custom domain (thenahars.in) is live via public/CNAME.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Isolated so only the Home route (which lazy-loads LionHeroSection)
        // ever pays for Three.js — other routes never pull this chunk in.
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three'
          }
        },
      },
    },
  },
})
