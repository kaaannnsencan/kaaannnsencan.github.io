import * as THREE from 'three'

// Shared toon materials. One material per colour, created lazily and reused,
// so hundreds of props cost a handful of draw-state changes.

let gradient: THREE.DataTexture | null = null
export function toonGradient() {
  if (gradient) return gradient
  const steps = new Uint8Array([90, 170, 255])
  gradient = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat)
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter
  gradient.generateMipmaps = false
  gradient.needsUpdate = true
  return gradient
}

const cache = new Map<string, THREE.MeshToonMaterial>()

export function toon(color: string, opts: { emissive?: string; emissiveIntensity?: number } = {}): THREE.MeshToonMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}`
  let m = cache.get(key)
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() })
    if (opts.emissive) {
      m.emissive.set(opts.emissive)
      m.emissiveIntensity = opts.emissiveIntensity ?? 1
    }
    cache.set(key, m)
  }
  return m
}

export function toonWithMap(map: THREE.Texture, color = '#ffffff'): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, map, gradientMap: toonGradient() })
}

export function pixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return { canvas: c, ctx }
}

/** Deterministic PRNG so the world looks identical on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
