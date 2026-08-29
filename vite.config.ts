import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Base path: '/thenahars/' while verifying on the default *.github.io/thenahars/ URL.
// Switch to '/' + add public/CNAME when the custom domain (thenahars.in) goes live.
export default defineConfig({
  base: '/thenahars/',
  plugins: [react(), tailwindcss()],
})
