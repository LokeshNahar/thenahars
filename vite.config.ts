import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base path: '/thenahars/' while verifying on the default *.github.io/thenahars/ URL.
// Switch to '/' + add public/CNAME when the custom domain (thenahars.in) goes live.
export default defineConfig({
  base: '/thenahars/',
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
