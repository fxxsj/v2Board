import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function emitLegacyAdminPlaceholders() {
  return {
    name: 'emit-legacy-admin-placeholders',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'vendors.async.js',
        source: '/* legacy placeholder: bundled into umi.js */\n',
      })
      this.emitFile({
        type: 'asset',
        fileName: 'components.async.js',
        source: '/* legacy placeholder: bundled into umi.js */\n',
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), emitLegacyAdminPlaceholders()],
  base: './',
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../../public/assets/admin'),
    emptyOutDir: true,
    manifest: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.tsx'),
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'umi.js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (name.endsWith('.css')) {
            return 'custom.css'
          }
          return '[name][extname]'
        },
      },
    },
  },
})
