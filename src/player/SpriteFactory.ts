// Procedural pixel-art character, painted pixel by pixel in code.
// Sheet layout: 4 columns (walk frames) × 4 rows (down, up, left, right),
// each frame FRAME_W × FRAME_H. Replace with a hand-drawn sheet by dropping
// /public/sprites/player.png (+ player.json) — see README.

export const FRAME_W = 16
export const FRAME_H = 26
export const DIRS = ['down', 'up', 'left', 'right'] as const
export type Dir = (typeof DIRS)[number]

export interface CharacterPalette {
  outline: string
  skin: string
  skinShade: string
  hair: string
  hairHi: string
  shirt: string
  shirtHi: string
  pants: string
  pantsShade: string
  shoes: string
  sole: string
  eye: string
}

/** Palette taken from Kaan's photo: dark-brown short hair, black tee, dark jeans. */
export const KAAN: CharacterPalette = {
  outline: '#1a1420',
  skin: '#f2c6a5',
  skinShade: '#d69d7c',
  hair: '#3a2820',
  hairHi: '#5e4331',
  shirt: '#24232c',
  shirtHi: '#3d3c4c',
  pants: '#34426a',
  pantsShade: '#26304f',
  shoes: '#18141c',
  sole: '#e6dfd2',
  eye: '#1a1420',
}

type Px = (x: number, y: number, c: string) => void

function rect(px: Px, x0: number, y0: number, x1: number, y1: number, c: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c)
}

/** frame: 0 stand, 1 left step, 2 stand, 3 right step */
function paintFront(px: Px, p: CharacterPalette, frame: number, back: boolean) {
  const bob = frame % 2 === 1 ? 1 : 0
  const lStep = frame === 1
  const rStep = frame === 3
  const y = (v: number) => v + bob

  // legs + shoes (not bobbing — feet stay planted)
  const legL = lStep ? 19 : 18
  const legR = rStep ? 19 : 18
  rect(px, 5, legL, 7, 21, p.pants)
  rect(px, 8, legR, 10, 21, p.pants)
  px(7, 21, p.pantsShade)
  px(8, 21, p.pantsShade)
  rect(px, 5, lStep ? 21 : 22, 7, lStep ? 22 : 23, p.shoes)
  rect(px, 8, rStep ? 21 : 22, 10, rStep ? 22 : 23, p.shoes)
  if (!lStep) rect(px, 5, 23, 7, 23, p.sole)
  if (!rStep) rect(px, 8, 23, 10, 23, p.sole)

  // torso
  rect(px, 4, y(11), 11, y(17), p.shirt)
  rect(px, 5, y(13), 6, y(16), p.shirtHi)
  if (!back) {
    rect(px, 6, y(11), 9, y(11), p.skinShade)
    rect(px, 7, y(12), 8, y(12), p.skinShade)
  } else rect(px, 6, y(11), 9, y(11), p.skinShade)

  // arms swing opposite to legs
  // (in a front view a swinging arm just looks longer or shorter)
  const aL = lStep ? -1 : rStep ? 1 : 0
  const aR = -aL
  rect(px, 3, y(11), 3, y(13), p.shirt)
  rect(px, 3, y(14), 3, y(15 + aL), p.skin)
  rect(px, 12, y(11), 12, y(13), p.shirt)
  rect(px, 12, y(14), 12, y(15 + aR), p.skin)

  // head
  rect(px, 4, y(3), 11, y(10), p.skin)
  rect(px, 11, y(5), 11, y(10), p.skinShade)
  px(3, y(7), p.skin)
  px(3, y(8), p.skinShade)
  px(12, y(7), p.skinShade)
  px(12, y(8), p.skinShade)

  // hair
  rect(px, 5, y(0), 10, y(0), p.hair)
  rect(px, 4, y(1), 11, y(3), p.hair)
  rect(px, 6, y(1), 8, y(1), p.hairHi)
  rect(px, 5, y(2), 6, y(2), p.hairHi)
  if (back) {
    rect(px, 4, y(4), 11, y(9), p.hair)
    rect(px, 5, y(10), 10, y(10), p.hair)
    rect(px, 6, y(4), 7, y(5), p.hairHi)
  } else {
    // fringe swept to one side + sideburns
    rect(px, 4, y(4), 7, y(4), p.hair)
    px(10, y(4), p.hair)
    px(11, y(4), p.hair)
    rect(px, 4, y(5), 4, y(6), p.hair)
    px(11, y(5), p.hair)
    // brows, eyes, mouth
    rect(px, 5, y(6), 6, y(6), p.hairHi)
    rect(px, 9, y(6), 10, y(6), p.hairHi)
    px(6, y(7), p.eye)
    px(9, y(7), p.eye)
    px(6, y(8), p.skin)
    rect(px, 7, y(9), 8, y(9), p.skinShade)
  }
}

function paintSide(px: Px, p: CharacterPalette, frame: number) {
  // facing right
  const bob = frame % 2 === 1 ? 1 : 0
  const y = (v: number) => v + bob
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0

  // legs
  if (stride === 0) {
    rect(px, 6, 18, 9, 21, p.pants)
    rect(px, 6, 18, 6, 21, p.pantsShade)
    rect(px, 6, 22, 10, 23, p.shoes)
    rect(px, 6, 23, 10, 23, p.sole)
  } else {
    const front = stride > 0 ? p.pants : p.pantsShade
    const backC = stride > 0 ? p.pantsShade : p.pants
    rect(px, 4, 18, 6, 21, backC)
    rect(px, 9, 18, 11, 21, front)
    rect(px, 7, 18, 8, 19, p.pants)
    rect(px, 3, 22, 6, 23, p.shoes)
    rect(px, 9, 22, 12, 23, p.shoes)
    rect(px, 3, 23, 6, 23, p.sole)
    rect(px, 9, 23, 12, 23, p.sole)
  }

  // torso
  rect(px, 5, y(11), 10, y(17), p.shirt)
  rect(px, 9, y(12), 10, y(16), p.shirtHi)
  rect(px, 8, y(11), 9, y(11), p.skinShade)

  // arm swings forward/back
  const ax = 7 + stride
  rect(px, ax, y(12), ax + 1, y(14), p.shirtHi)
  rect(px, ax, y(15), ax + 1, y(16), p.skin)

  // head
  rect(px, 5, y(3), 11, y(10), p.skin)
  px(12, y(7), p.skin)
  px(12, y(8), p.skinShade)
  rect(px, 5, y(9), 6, y(10), p.skinShade)
  // hair: back of head and top
  rect(px, 5, y(0), 10, y(0), p.hair)
  rect(px, 4, y(1), 11, y(3), p.hair)
  rect(px, 4, y(4), 7, y(8), p.hair)
  px(11, y(4), p.hair)
  px(10, y(4), p.hair)
  rect(px, 6, y(1), 9, y(1), p.hairHi)
  rect(px, 5, y(2), 6, y(4), p.hairHi)
  // ear, eye, brow
  px(7, y(7), p.skinShade)
  px(7, y(8), p.skinShade)
  px(10, y(6), p.hairHi)
  px(10, y(7), p.eye)
  px(11, y(9), p.skinShade)
}

function outline(img: ImageData, color: string) {
  const { width: w, height: h, data } = img
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const solid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 0 ? 1 : 0
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx
      if (solid[i]) continue
      // only outline within the same frame cell
      const fx = xx % FRAME_W
      const fy = yy % FRAME_H
      const n =
        (fx > 0 && solid[i - 1]) ||
        (fx < FRAME_W - 1 && solid[i + 1]) ||
        (fy > 0 && solid[i - w]) ||
        (fy < FRAME_H - 1 && solid[i + w])
      if (n) {
        data[i * 4] = r
        data[i * 4 + 1] = g
        data[i * 4 + 2] = b
        data[i * 4 + 3] = 255
      }
    }
}

let cached: HTMLCanvasElement | null = null

/** Paints the full 4×4 sheet into a canvas (the default palette is painted once and reused). */
export function paintCharacterSheet(p: CharacterPalette = KAAN): HTMLCanvasElement {
  if (p === KAAN && cached) return cached
  const sheet = paintSheet(p)
  if (p === KAAN) cached = sheet
  return sheet
}

function paintSheet(p: CharacterPalette): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * 4
  canvas.height = FRAME_H * 4
  const ctx = canvas.getContext('2d')!

  DIRS.forEach((dir, row) => {
    for (let f = 0; f < 4; f++) {
      const ox = f * FRAME_W
      const oy = row * FRAME_H
      const mirror = dir === 'left'
      // art is drawn on a 24-row grid; offset by one row so the outline fits in the 26-row cell
      const px: Px = (x, y, c) => {
        const xx = mirror ? FRAME_W - 1 - x : x
        const yy = y + 1
        if (xx < 0 || xx >= FRAME_W || yy < 0 || yy >= FRAME_H) return
        ctx.fillStyle = c
        ctx.fillRect(ox + xx, oy + yy, 1, 1)
      }
      if (dir === 'down') paintFront(px, p, f, false)
      else if (dir === 'up') paintFront(px, p, f, true)
      else paintSide(px, p, f)
    }
  })

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  outline(img, p.outline)
  ctx.putImageData(img, 0, 0)
  return canvas
}
