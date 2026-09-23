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
  collar: string
  brow: string
  sleeve: string
  freckle: string
  mouth: string
}

/**
 * Palette taken from Kaan's own pixel portrait: wavy middle-parted brown hair,
 * warm skin with freckles, light tee with a black crew neck.
 */
export const KAAN: CharacterPalette = {
  outline: '#1a1420',
  skin: '#e6a882',
  skinShade: '#c98567',
  hair: '#6b3f2a',
  hairHi: '#9a6440',
  shirt: '#dfe4e7',
  shirtHi: '#f8f9fa',
  pants: '#34426a',
  pantsShade: '#26304f',
  shoes: '#18141c',
  sole: '#e6dfd2',
  eye: '#2a2230',
  collar: '#2a2830',
  brow: '#3b2219',
  sleeve: '#b7c0c7',
  freckle: '#d18a6a', // soft: freckles should read as texture, not spots
  // lips only a touch darker than the skin: a relaxed, barely-there smile
  mouth: '#b87560',
}

/*
 * Head pixel maps (16 wide, drawn from row 0). Letters:
 *   H hair · h hair highlight · S skin · s skin shade · E eye · B/b brow (b = dark)
 *   N nose shadow
 *   F freckle · M mouth · . empty
 */
const HEAD_FRONT = [
  '....HhH.HhH.....', // curly tufts
  '...HhHHhHHhHH...',
  '..HHHhHHHHhHHH..',
  '..HhHHhHHhHHhH..',
  '..HHHhHHSHhHHH..', // middle parting
  '..HhHHSSSSHHhH..', // locks falling either side of the forehead
  '...HSbbSSbbSH...', // thick dark brows
  '...sSSESSESSs...',
  '...sSFSSSSFSs...', // light freckles (no nose pixel: it merged with the mouth)
  '....SSSMMSSs....', // closed, neutral mouth
  '.....SSSSSs.....',
]

const HEAD_BACK = [
  '....H.HH.HH.H...',
  '...HHhHHHHhHH...',
  '..HHHHhHHhHHHH..',
  '..HHhHHHHHHhHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHhHHhHHHH..',
  '...HHHHHHHHHH...',
  '...sHHhHHhHHs...',
  '...sHHHHHHHHs...',
  '....HHHHHHHH....',
  '.....sSSSSs.....',
]

// facing right: 1-pixel nose on row 8, mouth on row 10
const HEAD_SIDE = [
  '.....H.HH.H.....',
  '....HHhHHhHH....',
  '...HHHhHHHHHH...',
  '...HHHHHHHHhHH..',
  '...HHHHHHHHHHHH.',
  '...HHhHHSSSSH...',
  '...HHHHSSSbbS...',
  '...HHHsSSSSES...',
  '....HHsSSSSSSS..',
  '....HHSSSSFSs...',
  '.....sSSSSMs....',
]

function paintMap(px: Px, p: CharacterPalette, map: string[], oy: number) {
  const colors: Record<string, string> = {
    H: p.hair,
    h: p.hairHi,
    S: p.skin,
    s: p.skinShade,
    E: p.eye,
    B: p.hair,
    b: p.brow,
    N: p.skinShade,
    F: p.freckle,
    M: p.mouth,
  }
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors[row[x]]
      if (c) px(x, oy + y, c)
    }
  })
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
  rect(px, 6, y(11), 9, y(11), p.skinShade)

  // arms swing opposite to legs
  // (in a front view a swinging arm just looks longer or shorter)
  const aL = lStep ? -1 : rStep ? 1 : 0
  const aR = -aL
  rect(px, 3, y(11), 3, y(13), p.sleeve)
  rect(px, 3, y(14), 3, y(15 + aL), p.skin)
  rect(px, 12, y(11), 12, y(13), p.sleeve)
  rect(px, 12, y(14), 12, y(15 + aR), p.skinShade)

  // head (pixel map, bobs with the body)
  paintMap(px, p, back ? HEAD_BACK : HEAD_FRONT, bob)

  // black crew neck like in the portrait
  if (!back) {
    px(5, y(11), p.collar)
    px(10, y(11), p.collar)
    rect(px, 6, y(12), 9, y(12), p.collar)
  } else rect(px, 5, y(11), 10, y(11), p.collar)
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

  // arm swings forward/back: grey sleeve, then a shaded forearm so it reads on a light tee
  const ax = 7 + stride
  rect(px, ax, y(12), ax + 1, y(13), p.sleeve)
  rect(px, ax, y(14), ax, y(16), p.skinShade)
  rect(px, ax + 1, y(14), ax + 1, y(16), p.skin)

  // head (pixel map) + collar
  paintMap(px, p, HEAD_SIDE, bob)
  rect(px, 7, y(11), 10, y(11), p.collar)
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
