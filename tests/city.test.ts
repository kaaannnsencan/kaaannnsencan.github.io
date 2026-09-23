import { describe, expect, it } from 'vitest'
import type { Project } from '../src/content/profile'
import { floorsFor, planCity } from '../src/data/city'
import type { Repo } from '../src/data/github'

const repo = (over: Partial<Repo>): Repo => ({
  name: 'r',
  description: null,
  htmlUrl: 'https://github.com/x/r',
  homepage: null,
  language: 'Python',
  stars: 0,
  forks: 0,
  size: 100,
  fork: false,
  archived: false,
  topics: [],
  createdAt: '2025-01-01T00:00:00Z',
  pushedAt: '2025-01-01T00:00:00Z',
  ...over,
})

const project = (over: Partial<Project>): Project => ({
  id: 'p',
  title: { tr: 'P', en: 'P' },
  short: { tr: 'P', en: 'P' },
  stack: [],
  summary: { tr: '', en: '' },
  bullets: [],
  accent: '#fff',
  ...over,
})

describe('planCity', () => {
  const now = Date.parse('2026-09-23T00:00:00Z')

  it('turns repos into buildings, newest first, and pads with empty lots', () => {
    const plan = planCity([repo({ name: 'old' }), repo({ name: 'new', pushedAt: '2026-09-01T00:00:00Z' })], [], { now })
    expect(plan.lots.slice(0, 2).map((l) => (l.kind === 'repo' ? l.repo.name : l.kind))).toEqual(['new', 'old'])
    expect(plan.lots.length).toBe(8)
    expect(plan.lots.filter((l) => l.kind === 'empty').length).toBe(6)
  })

  it('marks recently pushed repos as under construction', () => {
    const plan = planCity([repo({ name: 'hot', pushedAt: '2026-09-20T00:00:00Z' })], [], { now })
    expect(plan.lots[0].kind === 'repo' && plan.lots[0].active).toBe(true)
  })

  it('skips forks and empty repos but keeps ones linked to a project', () => {
    const plan = planCity(
      [repo({ name: 'fork', fork: true }), repo({ name: 'empty', size: 0 }), repo({ name: 'Linked', size: 0 })],
      [project({ id: 'l', repo: 'linked' })],
      { now },
    )
    const names = plan.lots.flatMap((l) => (l.kind === 'repo' ? [l.repo.name] : []))
    expect(names).toEqual(['Linked'])
    // a project whose repo is shown must not get a second building
    expect(plan.lots.some((l) => l.kind === 'project')).toBe(false)
  })

  it('gives projects without a repo their own building', () => {
    const plan = planCity([], [project({ id: 'cv-only' })], { now })
    expect(plan.lots[0].kind).toBe('project')
  })

  it('puts featured landmarks first, then curated projects, then repos', () => {
    const plan = planCity(
      [repo({ name: 'linked' })],
      [project({ id: 'cv' }), project({ id: 'star', featured: true }), project({ id: 'l', repo: 'linked' })],
      { now },
    )
    const ids = plan.lots.slice(0, 3).map((l) => (l.kind === 'empty' ? 'empty' : l.kind === 'repo' ? l.repo.name : l.project.id))
    expect(ids).toEqual(['star', 'cv', 'linked'])
  })

  it('never exceeds maxLots even with many repos', () => {
    const repos = Array.from({ length: 50 }, (_, i) => repo({ name: `r${i}` }))
    expect(planCity(repos, [], { now, maxLots: 16 }).lots.length).toBe(16)
  })

  it('keeps building heights within bounds', () => {
    expect(floorsFor({ size: 0, stars: 0 })).toBe(3)
    expect(floorsFor({ size: 10_000_000, stars: 10_000 })).toBe(16)
  })
})
