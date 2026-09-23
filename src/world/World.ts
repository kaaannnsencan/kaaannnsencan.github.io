import * as THREE from 'three'
import { profile } from '../content/profile'
import { planCity } from '../data/city'
import type { GithubSnapshot } from '../data/github'
import { CollisionWorld } from './Collision'
import { Environment } from './Environment'
import { Interactables } from './Interactables'
import { Occluders, type GroundDecal, type NightMaterial, type PanelRequest, type WorldContext } from './kit'
import { ISLAND } from './layout'
import { Particles } from './Particles'
import { scatterProps, type Rect } from './Props'
import { Terrain } from './Terrain'
import { batchStatic } from './batch'
import { buildAbout } from './zones/About'
import { buildCampus } from './zones/Campus'
import { buildCodeDistrict } from './zones/CodeDistrict'
import { buildGallery } from './zones/Gallery'
import { buildSkills } from './zones/Skills'
import { buildSkyline } from './zones/Skyline'
import { buildSpawn, type VoxelTitle } from './zones/Spawn'
import { Stadium } from './zones/Stadium'
import { buildVillage } from './zones/Village'
import { Atv } from './Atv'
import { Arena, type ArenaHooks } from './zones/Arena'

export interface WorldHooks {
  openPanel: (req: PanelRequest) => void
  sfx: (name: string) => void
  arena: Omit<ArenaHooks, 'sfx'>
}

/** Builds and owns everything in the scene except the player and camera. */
export class World {
  readonly scene = new THREE.Scene()
  readonly collision = new CollisionWorld(ISLAND)
  readonly interact = new Interactables()
  readonly particles = new Particles()
  readonly env: Environment
  readonly terrain: Terrain
  readonly stadium: Stadium
  readonly title: VoxelTitle
  readonly atvs: Atv[] = []
  readonly arena: Arena
  private ctx: WorldContext
  private night: NightMaterial[] = []

  constructor(github: GithubSnapshot, hooks: WorldHooks, lowPower = false) {
    const reserved: Rect[] = []
    const decals: GroundDecal[] = []
    this.ctx = {
      scene: this.scene,
      collision: this.collision,
      interact: this.interact,
      occluders: new Occluders(this.night),
      animators: [],
      particles: this.particles,
      nightMaterials: this.night,
      openPanel: hooks.openPanel,
      sfx: hooks.sfx,
      reserve: (x, z, w, d) => reserved.push({ x, z, w, d }),
      decal: (d) => {
        decals.push(d)
        // nothing grows on paved areas, fields or lots
        reserved.push({ x: d.x, z: d.z, w: d.w + 3, d: d.d + 3 })
      },
    }

    this.title = buildSpawn(this.ctx)
    buildAbout(this.ctx)
    buildCodeDistrict(this.ctx, planCity(github.repos, profile.projects, { maxLots: 16 }))
    buildSkyline(this.ctx, github)
    buildGallery(this.ctx)
    buildSkills(this.ctx)
    buildCampus(this.ctx)
    this.stadium = new Stadium(this.ctx, this.collision, this.particles)
    buildVillage(this.ctx)
    this.arena = new Arena(this.ctx, this.collision, this.particles, { ...hooks.arena, sfx: hooks.sfx })
    // one ATV on the spawn plaza, one waiting at the arena gate
    for (const [ax, az] of [[10.5, 15.5], [52, 0.5]] as const) {
      this.atvs.push(new Atv(this.ctx, this.collision, this.particles, ax, az, Math.PI / 2))
      reserved.push({ x: ax, z: az, w: 3, d: 3 })
    }

    // ground is painted last so every zone could register its decals
    this.terrain = new Terrain(this.scene, decals)
    scatterProps(this.scene, this.collision, reserved)
    this.scene.add(this.particles.mesh)
    this.env = new Environment(this.scene, this.night, lowPower)
    const stats = batchStatic(this.scene)
    if (import.meta.env.DEV) console.info(`[world] static batching: ${stats.before} meshes → ${stats.after}`)
  }

  update(dt: number, elapsed: number, player: { x: number; z: number; speed: number; body: import('./Collision').Body; riding?: boolean }, firstPerson = false) {
    for (const a of this.ctx.animators) a(elapsed, dt)
    this.ctx.occluders.update(player.x, player.z, dt, firstPerson)
    this.title.update(dt, player.x, player.z, player.speed)
    this.stadium.update(dt, player.body, elapsed)
    this.arena.update(dt, elapsed, player.body, player.riding ?? false)
    this.particles.update(dt)
    this.terrain.update(elapsed, this.env.night)
  }
}
