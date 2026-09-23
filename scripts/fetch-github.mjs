// Build-time GitHub snapshot.
// Writes public/data/github.json so the live site never depends on the GitHub API
// being reachable (or on its 60 req/h anonymous rate limit). If the fetch fails,
// the previous snapshot is kept and the build continues.
//
//   GITHUB_USER   override the username (default: from src/content/config.json)
//   GITHUB_TOKEN  optional; enables the contribution calendar (GraphQL) + higher limits

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = resolve(root, 'public/data/github.json')
const config = JSON.parse(await readFile(resolve(root, 'src/content/config.json'), 'utf8'))
const user = process.env.GITHUB_USER || config.githubUser
const token = process.env.GITHUB_TOKEN

const headers = {
  'User-Agent': `${user}-portfolio-build`,
  Accept: 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
}

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

/** Public contribution calendar (no token needed): parsed from github.com/users/<user>/contributions. */
async function scrapeContributions() {
  const res = await fetch(`https://github.com/users/${user}/contributions`, { headers: { 'User-Agent': headers['User-Agent'] }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`${res.status} for contributions page`)
  const html = await res.text()
  const counts = new Map()
  for (const m of html.matchAll(/for="contribution-day-component-(\d+)-(\d+)"[^>]*>([^<]*)/g)) {
    const n = /^(\d[\d,]*) contribution/.exec(m[3].trim())
    counts.set(`${m[1]}-${m[2]}`, n ? Number(n[1].replace(/,/g, '')) : 0)
  }
  const weeks = []
  for (const m of html.matchAll(/id="contribution-day-component-(\d+)-(\d+)"/g)) {
    const day = Number(m[1])
    const week = Number(m[2])
    ;(weeks[week] ??= [])[day] = counts.get(`${day}-${week}`) ?? 0
  }
  const clean = weeks.filter(Boolean).map((w) => Array.from(w, (v) => v ?? 0))
  if (!clean.length) return null
  return { total: clean.flat().reduce((a, b) => a + b, 0), weeks: clean }
}

async function fetchContributions() {
  if (!token) return scrapeContributions()
  try {
    return (await graphqlContributions()) ?? (await scrapeContributions())
  } catch {
    return scrapeContributions()
  }
}

async function graphqlContributions() {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date}}}}}}`
  const body = await getJson('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables: { login: user } }),
  })
  const cal = body?.data?.user?.contributionsCollection?.contributionCalendar
  if (!cal) return null
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => d.contributionCount)),
  }
}

function mapRepo(r) {
  return {
    name: r.name,
    description: r.description,
    htmlUrl: r.html_url,
    homepage: r.homepage || null,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    size: r.size,
    fork: r.fork,
    archived: r.archived,
    topics: r.topics ?? [],
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
  }
}

try {
  const [profile, repos] = await Promise.all([
    getJson(`https://api.github.com/users/${user}`),
    getJson(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`),
  ])
  // repos outside the account (team projects) shown as featured landmarks
  const featured = []
  for (const full of config.featuredRepos ?? []) {
    try {
      featured.push({ fullName: full, ...mapRepo(await getJson(`https://api.github.com/repos/${full}`)) })
    } catch (e) {
      console.warn(`[github] featured ${full} skipped:`, e.message)
    }
  }
  let contributions = null
  try {
    contributions = await fetchContributions()
  } catch (e) {
    console.warn('[github] contributions skipped:', e.message)
  }
  const snapshot = {
    generatedAt: new Date().toISOString(),
    user: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      htmlUrl: profile.html_url,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      createdAt: profile.created_at,
    },
    repos: repos.map(mapRepo),
    featured,
    contributions,
  }
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, JSON.stringify(snapshot, null, 2))
  console.log(`[github] snapshot written: ${snapshot.repos.length} repos${contributions ? ', contributions included' : ''}`)
} catch (e) {
  if (existsSync(outFile)) {
    console.warn(`[github] fetch failed (${e.message}); keeping previous snapshot`)
  } else {
    await mkdir(dirname(outFile), { recursive: true })
    await writeFile(outFile, JSON.stringify({ generatedAt: null, user: null, repos: [], featured: [], contributions: null }, null, 2))
    console.warn(`[github] fetch failed (${e.message}); wrote empty snapshot`)
  }
}
