// World map. Units are metres-ish; the camera shows ~22 units vertically.

export const ISLAND = { halfW: 80, halfH: 56, radius: 16 }

export const ZONES = {
  spawn: { x: 0, z: 6 },
  about: { x: 0, z: -30 },
  contact: { x: -17, z: -26 },
  code: { x: 36, z: -4 },
  skyline: { x: 36, z: -36 },
  design: { x: -34, z: -4 },
  skills: { x: -32, z: 32 },
  campus: { x: 0, z: 36 },
  stadium: { x: 34, z: 35 },
  village: { x: -40, z: -34 },
  arena: { x: 67, z: 0 },
} as const

export type ZoneId = keyof typeof ZONES

/** Walkable roads as polylines; drawn into the ground texture and kept free of props. */
export const PATHS: Array<Array<[number, number]>> = [
  [[0, 6], [0, -24]],
  [[0, -26], [-14, -26]],
  [[0, 6], [18, 6], [18, -4], [24, -4]],
  [[0, 6], [-26, 6], [-26, -2]],
  [[0, 6], [0, 30]],
  [[0, 34], [-24, 34], [-28, 30]],
  [[0, 34], [22, 34]],
  [[36, -18], [36, -28]],
  [[-22, -26], [-27, -26]],
  [[51, 1], [54, 1]],
]

export const PATH_WIDTH = 3

/** Fast-travel destinations: where the player lands and what the map calls the place. */
export type TravelId = ZoneId

export const TRAVEL: Array<{ id: TravelId; x: number; z: number; color: string; name: { tr: string; en: string } }> = [
  { id: 'spawn', x: 0, z: 4, color: '#f2c14e', name: { tr: 'Başlangıç', en: 'Start' } },
  { id: 'about', x: 0, z: -25.5, color: '#c4473d', name: { tr: 'Hakkımda', en: 'About me' } },
  { id: 'code', x: 30, z: 9, color: '#37c3d6', name: { tr: 'Kod Mahallesi · Projeler', en: 'Code District · Projects' } },
  { id: 'skyline', x: 36, z: -30, color: '#39d353', name: { tr: 'GitHub Skyline', en: 'GitHub Skyline' } },
  { id: 'design', x: -34, z: 9, color: '#c86bd8', name: { tr: 'Tasarım Galerisi', en: 'Design Gallery' } },
  { id: 'skills', x: -32, z: 37, color: '#7bd66a', name: { tr: 'Yetenek Bahçesi', en: 'Skill Garden' } },
  { id: 'campus', x: 0, z: 41, color: '#3e6fb0', name: { tr: 'Kampüs · Eğitim', en: 'Campus · Education' } },
  { id: 'village', x: -40, z: -26, color: '#e0913d', name: { tr: 'Köy · Eğitim & Kariyer', en: 'Village · Education & Career' } },
  { id: 'contact', x: -17, z: -20.5, color: '#ff8a5c', name: { tr: 'İletişim', en: 'Contact' } },
  { id: 'arena', x: 52.5, z: -2.5, color: '#d8452c', name: { tr: 'ATV Parkuru', en: 'ATV Arena' } },
  { id: 'stadium', x: 30, z: 32, color: '#63ab3f', name: { tr: 'Stadyum', en: 'Stadium' } },
]
