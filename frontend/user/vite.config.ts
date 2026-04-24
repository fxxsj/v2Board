import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

function emitThemeColorAssets() {
  const themeSourceDir = resolve(__dirname, 'src/theme/colors')
  const themeTemplateDir = resolve(__dirname, 'theme/default')
  const themeOutputDir = resolve(__dirname, '../../public/theme/default')

  return {
    name: 'emit-theme-color-assets',
    apply: 'build' as const,
    buildStart() {
      for (const file of readdirSync(themeSourceDir)) {
        if (!file.endsWith('.css')) continue
        this.addWatchFile(resolve(themeSourceDir, file))
      }
      this.addWatchFile(resolve(themeTemplateDir, 'dashboard.blade.php'))
      this.addWatchFile(resolve(themeTemplateDir, 'config.json'))
    },
    generateBundle() {
      for (const file of readdirSync(themeSourceDir)) {
        if (!file.endsWith('.css')) continue
        this.emitFile({
          type: 'asset',
          fileName: `theme/${file}`,
          source: readFileSync(resolve(themeSourceDir, file), 'utf8'),
        })
      }
    },
    writeBundle() {
      mkdirSync(themeOutputDir, { recursive: true })
      writeFileSync(
        resolve(themeOutputDir, 'dashboard.blade.php'),
        readFileSync(resolve(themeTemplateDir, 'dashboard.blade.php'), 'utf8')
      )
      writeFileSync(resolve(themeOutputDir, 'config.json'), readFileSync(resolve(themeTemplateDir, 'config.json'), 'utf8'))
    },
  }
}

export default defineConfig({
  plugins: [react(), emitThemeColorAssets()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../../public/theme/default/assets'),
    assetsDir: 'assets',
    manifest: false,
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.tsx'),
      output: {
        entryFileNames: 'umi.js',
        chunkFileNames: (chunkInfo) => {
          // Keep filenames stable (no hash) while avoiding collisions like "index.js".
          const name = chunkInfo.name || 'chunk'
          if (name === 'index') {
            return 'chunk.js'
          }
          if (name === 'vendor') return 'vendors.async.js'
          if (name === 'shared') return 'components.async.js'
          return `${name}.async.js`
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (name.endsWith('.css')) {
            // cssCodeSplit=false -> single stylesheet
            return 'app.css'
          }
          return '[name][extname]'
        },
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }

          if (id.includes('/src/')) {
            if (
              id.includes('/src/components/') ||
              id.includes('/src/api/') ||
              id.includes('/src/stores/') ||
              id.includes('/src/hooks/') ||
              id.includes('/src/theme/') ||
              id.includes('/src/utils/') ||
              id.includes('/src/config/')
            ) {
              return 'shared'
            }
          }

          return undefined
        },
      },
    },
  },
})
