import { describe, expect, it } from 'vitest'
import { CollisionWorld, roundedRectSdf } from '../src/world/Collision'

describe('roundedRectSdf', () => {
  it('is negative inside, positive outside', () => {
    expect(roundedRectSdf(0, 0, 10, 10, 2)).toBeLessThan(0)
    expect(roundedRectSdf(11, 0, 10, 10, 2)).toBeCloseTo(1)
    expect(roundedRectSdf(9.9, 9.9, 10, 10, 2)).toBeGreaterThan(0) // rounded corner is cut off
  })
})

describe('CollisionWorld', () => {
  const world = new CollisionWorld({ halfW: 50, halfH: 50, radius: 5 })
  world.addBox(0, 0, 2, 2)
  world.addCircle(10, 0, 1)

  it('pushes a body out of a box and kills inward velocity', () => {
    const b = { x: 1.2, z: 0, vx: -3, vz: 0, r: 0.5 }
    expect(world.resolve(b)).toBe(true)
    expect(b.x).toBeCloseTo(1.5)
    expect(b.vx).toBe(0)
  })

  it('handles a centre that ended up inside a box', () => {
    const b = { x: 0.9, z: 0.1, vx: 0, vz: 0, r: 0.3 }
    world.resolve(b)
    expect(b.x).toBeGreaterThanOrEqual(1.3 - 1e-6)
  })

  it('bounces off circles', () => {
    const b = { x: 11.2, z: 0, vx: -2, vz: 0, r: 0.5 }
    world.resolve(b, 1)
    expect(b.x).toBeCloseTo(11.5)
    expect(b.vx).toBeCloseTo(2)
  })

  it('keeps bodies on the island', () => {
    const b = { x: 60, z: 0, vx: 5, vz: 0, r: 0.5 }
    world.resolve(b)
    expect(roundedRectSdf(b.x, b.z, 50, 50, 5)).toBeLessThanOrEqual(-0.49)
  })
})
