import config from '../content/config.json'

export interface Repo {
  name: string
  description: string | null
  htmlUrl: string
  homepage: string | null
  language: string | null
  stars: number
  forks: number
  size: number
  fork: boolean
  archived: boolean
  topics: string[]
  createdAt: string
  pushedAt: string
}

export interface GithubSnapshot {
  generatedAt: string | null
  user: { login: string; name: string | null; htmlUrl: string; publicRepos: number; followers: number } | null
  repos: Repo[]
  /** Team repos outside the account, e.g. Vitrin AI. */
  featured?: Array<Repo & { fullName: string }>
  contributions: { total: number; weeks: number[][] } | null
}

const EMPTY: GithubSnapshot = { generatedAt: null, user: null, repos: [], contributions: null }
const CACHE_KEY = 'gh-live-v1'

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Maps a raw GitHub REST repo object to our compact shape. */
export function mapApiRepo(r: Record<string, any>): Repo {
  return {
    name: String(r.name),
    description: r.description ?? null,
    htmlUrl: String(r.html_url),
    homepage: r.homepage || null,
    language: r.language ?? null,
    stars: Number(r.stargazers_count) || 0,
    forks: Number(r.forks_count) || 0,
    size: Number(r.size) || 0,
    fork: Boolean(r.fork),
    archived: Boolean(r.archived),
    topics: Array.isArray(r.topics) ? r.topics : [],
    createdAt: String(r.created_at),
    pushedAt: String(r.pushed_at),
  }
}

/**
 * Loads the build-time snapshot, then (if it is stale) tries the live API so that
 * repos pushed after the last deploy still show up. Every step fails soft:
 * the world always gets *some* data, never an exception.
 */
export async function loadGithub(): Promise<GithubSnapshot> {
  let snapshot = EMPTY
  try {
    snapshot = { ...EMPTY, ...(await fetchJson<GithubSnapshot>(`${import.meta.env.BASE_URL}data/github.json`, 5000)) }
  } catch (e) {
    console.warn('[github] snapshot unavailable', e)
  }

  const maxAge = config.liveRefreshHours * 3600_000
  const age = snapshot.generatedAt ? Date.now() - Date.parse(snapshot.generatedAt) : Infinity
  if (age < maxAge) return snapshot

  const cached = readCache(maxAge)
  if (cached) return { ...snapshot, repos: cached }

  try {
    const raw = await fetchJson<Record<string, any>[]>(
      `https://api.github.com/users/${config.githubUser}/repos?per_page=100&sort=pushed`,
      3500,
    )
    const repos = raw.map(mapApiRepo)
    writeCache(repos)
    return { ...snapshot, repos }
  } catch {
    return snapshot
  }
}

function readCache(maxAge: number): Repo[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, repos } = JSON.parse(raw) as { at: number; repos: Repo[] }
    return Date.now() - at < maxAge && Array.isArray(repos) ? repos : null
  } catch {
    return null
  }
}

function writeCache(repos: Repo[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }))
  } catch {
    /* quota / privacy mode */
  }
}
