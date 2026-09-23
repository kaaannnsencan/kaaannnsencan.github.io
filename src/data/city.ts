// Pure, DOM-free planning of the "Code District": turns repos + curated projects
// into lots on a grid. Kept free of three.js so it can be unit-tested.

import type { Project } from '../content/profile'
import type { Repo } from './github'

export const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3572A5',
  Dart: '#00B4AB',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  'Jupyter Notebook': '#DA5B0B',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#663399',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Shell: '#89e051',
  SQL: '#e38c00',
  Vue: '#41b883',
}

export type Lot =
  | { kind: 'repo'; repo: Repo; project?: Project; floors: number; color: string; active: boolean }
  | { kind: 'project'; project: Project; floors: number; color: string; active: boolean }
  | { kind: 'empty' }

export interface CityPlan {
  lots: Lot[]
  columns: number
  rows: number
}

const DAY = 86_400_000

export function floorsFor(repo: Pick<Repo, 'size' | 'stars'>): number {
  const bySize = Math.round(Math.log2(repo.size + 1) * 0.7)
  const byStars = Math.min(repo.stars, 12) * 0.5
  return Math.max(3, Math.min(16, 3 + bySize + Math.round(byStars)))
}

export function colorFor(language: string | null, fallback = '#8b93a7'): string {
  return (language && LANGUAGE_COLORS[language]) || fallback
}

/**
 * Builds the district:
 *  - every non-fork, non-empty repo becomes a building (projects linked by `repo` enrich it)
 *  - curated projects without a repo get their own buildings
 *  - remaining lots up to `minLots` are empty plots waiting for future work
 */
export function planCity(repos: Repo[], projects: Project[], opts: { now?: number; columns?: number; minLots?: number; maxLots?: number } = {}): CityPlan {
  const now = opts.now ?? Date.now()
  const columns = opts.columns ?? 4
  const minLots = opts.minLots ?? 8
  const maxLots = opts.maxLots ?? 40

  const byRepo = new Map(projects.filter((p) => p.repo).map((p) => [p.repo!.toLowerCase(), p]))
  const lots: Lot[] = []
  const projectLot = (project: Project): Lot => ({ kind: 'project', project, floors: 6, color: project.accent, active: false })

  // 1. featured landmarks take the first lots (front row, left)
  for (const project of projects) if (project.featured) lots.push(projectLot(project))

  const visible = repos
    .filter((r) => !r.fork || byRepo.has(r.name.toLowerCase()))
    .filter((r) => r.size > 0 || r.description || byRepo.has(r.name.toLowerCase()))
    .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))

  // 2. curated CV projects that have no visible repo of their own
  const shown = new Set(visible.map((r) => r.name.toLowerCase()))
  for (const project of projects) {
    if (project.featured || (project.repo && shown.has(project.repo.toLowerCase()))) continue
    lots.push(projectLot(project))
  }

  // 3. every repo, most recently pushed first
  for (const repo of visible) {
    const project = byRepo.get(repo.name.toLowerCase())
    lots.push({
      kind: 'repo',
      repo,
      project,
      floors: floorsFor(repo) + (project ? 2 : 0),
      color: colorFor(repo.language, project?.accent),
      active: now - Date.parse(repo.pushedAt) < 30 * DAY,
    })
  }

  const target = Math.min(maxLots, Math.max(minLots, Math.ceil((lots.length + 2) / columns) * columns))
  lots.length = Math.min(lots.length, maxLots)
  while (lots.length < target) lots.push({ kind: 'empty' })

  return { lots, columns, rows: Math.ceil(lots.length / columns) }
}
