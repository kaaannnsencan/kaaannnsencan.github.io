import * as THREE from 'three'
import { roundedRectSdf } from './Collision'
import type { GroundDecal } from './kit'
import { ISLAND, PATHS, PATH_WIDTH } from './layout'
import { canvas2d, pixelTexture, rng, toon, toonWithMap } from './materials'
import { P } from './palette'

const TEX = 8 // ground texels per world unit

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

/** Paints the whole island surface (grass, sand, roads, plazas) into one texture. */
export function paintGround(decals: GroundDecal[]): HTMLCanvasElement {
  const { halfW, halfH, radius } = ISLAND
  const W = halfW * 2 * TEX
  const H = halfH * 2 * TEX
  const { canvas, ctx } = canvas2d(W, H)
  const img = ctx.createImageData(W, H)
  const d = img.data
  const rand = rng(7)

  const grass = [hex(P.grassDark), hex(P.grass), hex(P.grassLight)]
  const sand = hex(P.sand)
  const sandDark = hex(P.pathDark)

  // cheap value noise on a coarse grid for large grass patches
  const GN = 16
  const gw = Math.ceil(W / GN) + 2
  const grid = Array.from({ length: gw * (Math.ceil(H / GN) + 2) }, () => rand())
  const noise = (x: number, y: number) => {
    const gx = x / GN
    const gy = y / GN
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    const fx = gx - ix
    const fy = gy - iy
    const a = grid[iy * gw + ix]
    const b = grid[iy * gw + ix + 1]
    const c = grid[(iy + 1) * gw + ix]
    const e = grid[(iy + 1) * gw + ix + 1]
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy
  }
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wx = x / TEX - halfW
      const wz = y / TEX - halfH
      const sd = roundedRectSdf(wx, wz, halfW, halfH, radius)
      let c: [number, number, number]
      if (sd > -1.2) c = sd > -0.5 ? sandDark : sand
      else if (sd > -2.4) {
        // dithered sand → grass transition
        const t = (sd + 2.4) / 1.2
        c = t * 16 > bayer[(y % 4) * 4 + (x % 4)] ? sand : grass[1]
      } else {
        const n = noise(x, y) + (rand() - 0.5) * 0.12
        const threshold = bayer[(y % 4) * 4 + (x % 4)] / 16
        c = n < 0.32 + threshold * 0.1 ? grass[0] : n > 0.66 + threshold * 0.1 ? grass[2] : grass[1]
      }
      const i = (y * W + x) * 4
      d[i] = c[0]
      d[i + 1] = c[1]
      d[i + 2] = c[2]
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const toPx = (wx: number, wz: number) => [Math.round((wx + halfW) * TEX), Math.round((wz + halfH) * TEX)] as const

  // roads: stamp squares along each segment for crisp pixel edges
  const stampRoad = (width: number, color: string) => {
    ctx.fillStyle = color
    const half = (width * TEX) / 2
    for (const path of PATHS)
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = toPx(path[i][0], path[i][1])
        const [bx, by] = toPx(path[i + 1][0], path[i + 1][1])
        const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay))
        for (let s = 0; s <= steps; s += 2) {
          const x = Math.round(ax + ((bx - ax) * s) / steps)
          const y = Math.round(ay + ((by - ay) * s) / steps)
          ctx.fillRect(x - half, y - half, half * 2, half * 2)
        }
      }
  }
  stampRoad(PATH_WIDTH + 0.5, P.pathDark)
  stampRoad(PATH_WIDTH, P.path)

  // decals (plazas, lots, fields) — written straight into pixel memory
  let pix = ctx.getImageData(0, 0, W, H)
  const put = (x: number, y: number, col: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 4
    pix.data[i] = col[0]
    pix.data[i + 1] = col[1]
    pix.data[i + 2] = col[2]
  }
  const rgb = new Map<string, [number, number, number]>()
  const col = (c: string) => {
    let v = rgb.get(c)
    if (!v) rgb.set(c, (v = hex(c)))
    return v
  }
  for (const dc of decals) {
    const [x0, y0] = toPx(dc.x - dc.w / 2, dc.z - dc.d / 2)
    const w = Math.round(dc.w * TEX)
    const h = Math.round(dc.d * TEX)
    if (dc.paint) {
      // custom painters draw with the 2D API: flush, paint, re-read
      ctx.putImageData(pix, 0, 0)
      dc.paint(ctx, x0, y0, w, h)
      pix = ctx.getImageData(0, 0, W, H)
      continue
    }
    const inside = (px: number, py: number) => {
      if (!dc.round) return true
      const nx = (px + 0.5 - w / 2) / (w / 2)
      const ny = (py + 0.5 - h / 2) / (h / 2)
      return nx * nx + ny * ny <= 1
    }
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        if (!inside(px, py)) continue
        const border = !inside(px - 2, py) || !inside(px + 2, py) || !inside(px, py - 2) || !inside(px, py + 2) || (!dc.round && (px < 2 || py < 2 || px >= w - 2 || py >= h - 2))
        let c = dc.color
        if (border && dc.edge) c = dc.edge
        else if (dc.pattern === 'tiles' && dc.edge && (px % TEX === 0 || py % TEX === 0)) c = dc.edge
        else if (dc.pattern === 'stripes' && Math.floor(px / (TEX * 2)) % 2 === 0) c = shade(dc.color, 0.92)
        put(x0 + px, y0 + py, col(c))
      }
  }
  ctx.putImageData(pix, 0, 0)

  // flowers & pebbles, only on untouched grass
  const flowerColors = [P.white, P.gold, P.blossom, P.coral]
  const sample = pix.data
  const grassSet = new Set(grass.map((g) => g.join(',')))
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(rand() * W)
    const y = Math.floor(rand() * H)
    const k = (y * W + x) * 4
    if (!grassSet.has(`${sample[k]},${sample[k + 1]},${sample[k + 2]}`)) continue
    if (rand() < 0.55) {
      // grass tuft
      ctx.fillStyle = P.grassDark
      ctx.fillRect(x, y, 1, 2)
      ctx.fillRect(x + 2, y, 1, 2)
      ctx.fillRect(x + 1, y - 1, 1, 3)
    } else {
      ctx.fillStyle = flowerColors[Math.floor(rand() * flowerColors.length)]
      ctx.fillRect(x, y, 2, 2)
      ctx.fillStyle = P.leafDark
      ctx.fillRect(x, y + 2, 1, 1)
    }
  }
  return canvas
}

export function shade(color: string, k: number): string {
  const [r, g, b] = hex(color)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

export class Terrain {
  readonly ground: THREE.Mesh
  readonly water: THREE.Mesh
  private waterMat: THREE.ShaderMaterial

  constructor(scene: THREE.Scene, decals: GroundDecal[]) {
    const { halfW, halfH, radius } = ISLAND
    const shape = new THREE.Shape()
    const seg = 5
    shape.moveTo(-halfW + radius, -halfH)
    shape.lineTo(halfW - radius, -halfH)
    shape.absarc(halfW - radius, -halfH + radius, radius, -Math.PI / 2, 0, false)
    shape.lineTo(halfW, halfH - radius)
    shape.absarc(halfW - radius, halfH - radius, radius, 0, Math.PI / 2, false)
    shape.lineTo(-halfW + radius, halfH)
    shape.absarc(-halfW + radius, halfH - radius, radius, Math.PI / 2, Math.PI, false)
    shape.lineTo(-halfW, -halfH + radius)
    shape.absarc(-halfW + radius, -halfH + radius, radius, Math.PI, Math.PI * 1.5, false)

    const depth = 3
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, -depth, 0)

    const tex = pixelTexture(paintGround(decals))
    tex.repeat.set(1 / (halfW * 2), 1 / (halfH * 2))
    tex.offset.set(0.5, 0.5)
    const top = toonWithMap(tex)
    this.ground = new THREE.Mesh(geo, [top, toon(P.cliff)])
    this.ground.receiveShadow = true
    scene.add(this.ground)

    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        night: { value: 0 },
        shallow: { value: new THREE.Color(P.water) },
        deep: { value: new THREE.Color(P.waterDeep) },
        foam: { value: new THREE.Color(P.foam) },
        island: { value: new THREE.Vector3(halfW, halfH, radius) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform float night;
        uniform vec3 shallow;
        uniform vec3 deep;
        uniform vec3 foam;
        uniform vec3 island;
        varying vec3 vWorld;

        float sdRoundRect(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        void main() {
          // quantize to a 1/8-unit grid so the water matches the ground texel size
          vec2 p = floor(vWorld.xz * 8.0) / 8.0;
          float d = sdRoundRect(p, island.xy, island.z);
          vec3 col = mix(shallow, deep, smoothstep(2.0, 14.0, d));
          float wave = sin(d * 2.2 - time * 1.6);
          if (d < 1.4 && wave > 0.55) col = foam;
          else if (d < 0.35) col = foam;
          // drifting glints
          vec2 cell = floor(p * 0.5 + vec2(time * 0.15, 0.0));
          float g = hash(cell);
          float blink = step(0.985, g) * step(0.5, fract(time * 0.6 + g * 10.0));
          col = mix(col, foam, blink * 0.8);
          col *= mix(1.0, 0.35, night);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), this.waterMat)
    this.water.rotation.x = -Math.PI / 2
    this.water.position.y = -1.1
    scene.add(this.water)
  }

  update(time: number, night: number) {
    this.waterMat.uniforms.time.value = time
    this.waterMat.uniforms.night.value = night
  }
}
