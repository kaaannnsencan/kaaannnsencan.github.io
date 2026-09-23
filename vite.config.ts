/// <reference types="vitest/config" />
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

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

// BASE_PATH lets the same build run on a custom domain ("/") or GitHub Pages ("/repo-name/").
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [snapshots()],
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
