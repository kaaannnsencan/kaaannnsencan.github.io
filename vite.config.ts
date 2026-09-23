/// <reference types="vitest/config" />
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { metaDescription, renderStaticSummary } from './src/fallback/staticHtml'

// Dev-only: lets automated checks POST a canvas snapshot (data URL) to disk.
const snapshots = (): Plugin => ({
  name: 'dev-snapshots',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__snapshot', (req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const dir = resolve(process.env.SNAPSHOT_DIR ?? '.snapshots')
        mkdirSync(dir, { recursive: true })
        const name = (new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'shot').replace(/[^\w-]/g, '')
        writeFileSync(resolve(dir, `${name}.png`), Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'))
        res.end('ok')
      })
    })
  },
})

// Puts the CV summary into index.html so crawlers and link previews get real
// text without running JavaScript. Source of truth stays src/content/profile.ts.
const seoSummary = (): Plugin => ({
  name: 'seo-summary',
  transformIndexHtml(html) {
    return html
      .replaceAll('<!--SEO_SUMMARY-->', renderStaticSummary('tr'))
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${metaDescription('tr').replace(/"/g, '&quot;')}$2`)
  },
})

// BASE_PATH lets the same build run on a custom domain ("/") or GitHub Pages ("/repo-name/").
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [snapshots(), seoSummary()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
