import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes rarely, app code changes every deploy. Splitting
        // them means a release doesn't invalidate the cached framework bundle.
        //
        // Rolldown (Vite 8) requires the function form. Only the framework is
        // pulled out: sending all of node_modules to vendor would drag the
        // lucide icons out of the lazy page chunks and back into initial load.
        // Kept as ONE chunk rather than several — splitting react and
        // react-router apart risks module-init ordering problems.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const path = id.replace(/\\/g, '/')
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
              path,
            )
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
})
