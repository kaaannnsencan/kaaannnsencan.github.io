import * as THREE from 'three'

export interface Interactable {
  id: string
  position: THREE.Vector3
  radius: number
  /** Label shown in the prompt bubble; function so it follows the language. */
  label: () => string
  /** Height above ground where the prompt bubble floats. */
  height?: number
  action: () => void
}

export class Interactables {
  items: Interactable[] = []

  add(item: Interactable) {
    this.items.push(item)
    return item
  }

  nearest(x: number, z: number): Interactable | null {
    let best: Interactable | null = null
    let bestD = Infinity
    for (const it of this.items) {
      const d = Math.hypot(it.position.x - x, it.position.z - z)
      if (d < it.radius && d < bestD) {
        best = it
        bestD = d
      }
    }
    return best
  }

  get(id: string) {
    return this.items.find((i) => i.id === id)
  }
}
