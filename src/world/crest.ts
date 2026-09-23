import { FENERBAHCE_PIXELS } from '../content/fenerbahceLogo'

// Colours for Kaan's pixel pattern, slightly tuned to sit on the grass.
const COLORS: Record<string, string> = {
  k: '#11131c',
  r: '#d71920',
  b: '#1b2f7a',
  y: '#f5d000',
  g: '#2fbf4a',
}

/**
 * Paints the Fenerbahçe crest into the ground texture, centred in a w×h texel
 * area. Cells are taller than wide (≈ 1 / sin(camera pitch)) so the crest looks
 * round on screen, exactly like the pattern, instead of squashed by perspective.
 */
export function paintFenerbahceCrest(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
  const rows = FENERBAHCE_PIXELS
  const rh = rows.length
  const rw = rows[0].length
  const cw = Math.max(1, Math.floor(w / rw))
  const ch = Math.max(1, Math.floor(h / rh))
  const ox = x0 + Math.floor((w - rw * cw) / 2)
  const oy = y0 + Math.floor((h - rh * ch) / 2)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = COLORS[row[x]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(ox + x * cw, oy + y * ch, cw, ch)
    }
  })
}
