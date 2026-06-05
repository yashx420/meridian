import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [react()],
  resolve: {
    // The '@' alias used to be provided by the base44 vite plugin.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Forward API + uploaded-file requests to the local backend during dev.
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
});
