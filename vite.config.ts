import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Identificativo della build: cambia a ogni deploy e finisce anche in /version.json
const BUILD_ID = `${(process.env.CF_PAGES_COMMIT_SHA ?? 'local').slice(0, 8)}-${Date.now().toString(36)}`

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react'
        },
      },
    },
  },
})
