// 2D (XZ-plane) collision world. The game is flat, so circles vs. boxes/circles
// is all we need — cheap, deterministic and easy to test.

export interface Box { minX: number; minZ: number; maxX: number; maxZ: number; q?: number }
export interface Circle { x: number; z: number; r: number; q?: number }
export interface Body { x: number; z: number; vx: number; vz: number; r: number }

/** Signed distance to a rounded rectangle centred on the origin (negative = inside). */
export function roundedRectSdf(x: number, z: number, halfW: number, halfH: number, radius: number): number {
  const qx = Math.abs(x) - halfW + radius
  const qz = Math.abs(z) - halfH + radius
  const ox = Math.max(qx, 0)
  const oz = Math.max(qz, 0)
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - radius
}

const CELL = 4

export class CollisionWorld {
  boxes: Box[] = []
  circles: Circle[] = []
  /** Circles that move (parked vehicles); checked every time, never bucketed. */
  dynamicCircles: Circle[] = []
  private grid: Map<number, { boxes: Box[]; circles: Circle[] }> | null = null
  private query = 0

  constructor(public island: { halfW: number; halfH: number; radius: number }) {}

  addBox(cx: number, cz: number, w: number, d: number) {
    this.boxes.push({ minX: cx - w / 2, minZ: cz - d / 2, maxX: cx + w / 2, maxZ: cz + d / 2 })
    this.grid = null
  }

  addCircle(x: number, z: number, r: number) {
    this.circles.push({ x, z, r })
    this.grid = null
  }

  addDynamicCircle(c: Circle): Circle {
    this.dynamicCircles.push(c)
    return c
  }

  private key(ix: number, iz: number) {
    return (ix + 2048) * 4096 + (iz + 2048)
  }

  /** Uniform grid over the static shapes: a body only tests what is near it. */
  private build() {
    const grid = new Map<number, { boxes: Box[]; circles: Circle[] }>()
    const cell = (ix: number, iz: number) => {
      const k = this.key(ix, iz)
      let c = grid.get(k)
      if (!c) grid.set(k, (c = { boxes: [], circles: [] }))
      return c
    }
    for (const b of this.boxes)
      for (let ix = Math.floor(b.minX / CELL); ix <= Math.floor(b.maxX / CELL); ix++)
        for (let iz = Math.floor(b.minZ / CELL); iz <= Math.floor(b.maxZ / CELL); iz++) cell(ix, iz).boxes.push(b)
    for (const c of this.circles)
      for (let ix = Math.floor((c.x - c.r) / CELL); ix <= Math.floor((c.x + c.r) / CELL); ix++)
        for (let iz = Math.floor((c.z - c.r) / CELL); iz <= Math.floor((c.z + c.r) / CELL); iz++) cell(ix, iz).circles.push(c)
    this.grid = grid
    return grid
  }

  /**
   * Pushes a body out of all static geometry. Returns true if it hit something.
   * When `bounce` > 0 the normal component of velocity is reflected.
   */
  resolve(b: Body, bounce = 0): boolean {
    let hit = false
    const grid = this.grid ?? this.build()
    const q = ++this.query
    const boxes: Box[] = []
    const circles: Circle[] = [...this.dynamicCircles]
    for (let ix = Math.floor((b.x - b.r) / CELL); ix <= Math.floor((b.x + b.r) / CELL); ix++)
      for (let iz = Math.floor((b.z - b.r) / CELL); iz <= Math.floor((b.z + b.r) / CELL); iz++) {
        const c = grid.get(this.key(ix, iz))
        if (!c) continue
        for (const s of c.boxes) if (s.q !== q) (s.q = q), boxes.push(s)
        for (const s of c.circles) if (s.q !== q) (s.q = q), circles.push(s)
      }
    for (const box of boxes) {
      const px = Math.max(box.minX, Math.min(b.x, box.maxX))
      const pz = Math.max(box.minZ, Math.min(b.z, box.maxZ))
      let dx = b.x - px
      let dz = b.z - pz
      let d2 = dx * dx + dz * dz
      if (d2 >= b.r * b.r) continue
      if (d2 < 1e-10) {
        // centre inside the box: push out along the shallowest axis
        const left = b.x - box.minX, right = box.maxX - b.x, top = b.z - box.minZ, bottom = box.maxZ - b.z
        const m = Math.min(left, right, top, bottom)
        dx = m === left ? -1 : m === right ? 1 : 0
        dz = m === top ? -1 : m === bottom ? 1 : 0
        this.push(b, dx, dz, m + b.r, bounce)
      } else {
        const d = Math.sqrt(d2)
        this.push(b, dx / d, dz / d, b.r - d, bounce)
      }
      hit = true
    }
    for (const c of circles) {
      if (c.r <= 0) continue
      const dx = b.x - c.x
      const dz = b.z - c.z
      const min = b.r + c.r
      const d2 = dx * dx + dz * dz
      if (d2 >= min * min || d2 < 1e-10) continue
      const d = Math.sqrt(d2)
      this.push(b, dx / d, dz / d, min - d, bounce)
      hit = true
    }
    // island edge
    const { halfW, halfH, radius } = this.island
    const sd = roundedRectSdf(b.x, b.z, halfW, halfH, radius) + b.r
    if (sd > 0) {
      const e = 0.01
      const gx = roundedRectSdf(b.x + e, b.z, halfW, halfH, radius) - roundedRectSdf(b.x - e, b.z, halfW, halfH, radius)
      const gz = roundedRectSdf(b.x, b.z + e, halfW, halfH, radius) - roundedRectSdf(b.x, b.z - e, halfW, halfH, radius)
      const gl = Math.hypot(gx, gz) || 1
      this.push(b, -gx / gl, -gz / gl, sd, bounce)
      hit = true
    }
    return hit
  }

  private push(b: Body, nx: number, nz: number, depth: number, bounce: number) {
    b.x += nx * depth
    b.z += nz * depth
    const vn = b.vx * nx + b.vz * nz
    if (vn < 0) {
      b.vx -= (1 + bounce) * vn * nx
      b.vz -= (1 + bounce) * vn * nz
    }
  }
}
