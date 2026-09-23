import type { DesignWork } from '../content/profile'
import { paintCharacterSheet, FRAME_H, FRAME_W } from '../player/SpriteFactory'
import { canvas2d, rng } from './materials'
import { drawText, measure } from './PixelFont'

export const POSTER_W = 48
export const POSTER_H = 64

/**
 * Generative pixel posters used as placeholders for design work until real
 * images are added. Each style is a small composition exercise in itself.
 */
export function paintPoster(work: DesignWork): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(POSTER_W, POSTER_H)
  const [bg, fg, accent] = work.colors
  const r = rng(work.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, POSTER_W, POSTER_H)

  switch (work.id) {
    case 'identity': {
      // monogram inside a circle + brand bars
      ctx.fillStyle = accent
      for (let y = 0; y < 30; y++)
        for (let x = 0; x < 30; x++) if ((x - 14.5) ** 2 + (y - 14.5) ** 2 < 15 ** 2) ctx.fillRect(9 + x, 8 + y, 1, 1)
      ctx.fillStyle = bg
      drawText(ctx, 'KŞ', 24 - measure('KŞ'), 16, 2)
      ;[fg, accent, '#ffffff'].forEach((c, i) => {
        ctx.fillStyle = c
        ctx.fillRect(8 + i * 11, 46, 9, 9)
      })
      break
    }
    case 'poster': {
      // big stacked type with an offset shadow
      const words = ['FORM', 'VE', 'KOD']
      words.forEach((w, i) => {
        ctx.fillStyle = accent
        drawText(ctx, w, 3, 7 + i * 18, 2)
        ctx.fillStyle = fg
        drawText(ctx, w, 2, 6 + i * 18, 2)
      })
      ctx.fillStyle = accent
      ctx.fillRect(4, 58, 40, 2)
      break
    }
    case 'ui': {
      // phone mockup with cards
      ctx.fillStyle = '#000000'
      ctx.fillRect(12, 5, 24, 54)
      ctx.fillStyle = '#18263d'
      ctx.fillRect(14, 9, 20, 46)
      ctx.fillStyle = fg
      ctx.fillRect(16, 12, 16, 10)
      ctx.fillStyle = accent
      ctx.fillRect(16, 25, 7, 7)
      ctx.fillRect(25, 25, 7, 7)
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 4; i++) ctx.fillRect(16, 36 + i * 4, 10 + ((i * 5) % 7), 2)
      ctx.fillStyle = fg
      ctx.fillRect(20, 52, 8, 2)
      break
    }
    case 'lupin': {
      // film strip + title
      ctx.fillStyle = fg
      ctx.fillRect(0, 10, POSTER_W, 26)
      ctx.fillStyle = bg
      for (let x = 2; x < POSTER_W; x += 6) {
        ctx.fillRect(x, 12, 3, 3)
        ctx.fillRect(x, 31, 3, 3)
      }
      ctx.fillStyle = accent
      for (let i = 0; i < 4; i++) ctx.fillRect(3 + i * 11, 17, 9, 12)
      ctx.fillStyle = fg
      drawText(ctx, 'LUPIN', 24 - Math.ceil(measure('LUPIN') / 2), 42)
      ctx.fillStyle = accent
      ctx.fillRect(10, 53, 28, 1)
      drawText(ctx, 'TITLES', 24 - Math.ceil(measure('TITLES') / 2), 56)
      break
    }
    case 'pixel': {
      // the portfolio's own character, blown up
      const sheet = paintCharacterSheet()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(sheet, 0, 0, FRAME_W, FRAME_H, 8, 4, FRAME_W * 2, FRAME_H * 2)
      ctx.fillStyle = accent
      for (let i = 0; i < 18; i++) ctx.fillRect(Math.floor(r() * POSTER_W), Math.floor(r() * 10) + 54, 1, 1)
      break
    }
    default: {
      // editorial grid
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, POSTER_W, 3)
      ctx.fillStyle = fg
      drawText(ctx, 'EDIT', 3, 6, 2)
      for (let c = 0; c < 3; c++)
        for (let l = 0; l < 10; l++) ctx.fillRect(4 + c * 14, 26 + l * 3, 12 - Math.floor(r() * 4), 1)
      ctx.fillStyle = accent
      ctx.fillRect(4, 22, 40, 2)
    }
  }
  // frame shadow line
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, POSTER_H - 1, POSTER_W, 1)
  return canvas
}
