// Build-time HTML summary of the CV (no DOM, no browser APIs).
// Injected into index.html by the Vite plugin so search engines, link
// previews and "view source" see real content before any JavaScript runs.
// Everything comes from profile.ts, so shipping a new project updates it too.

import { profile, type Lang } from '../content/profile'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function renderStaticSummary(L: Lang = 'tr'): string {
  const tr = L === 'tr'
  const p = profile
  return `
  <article class="seo-summary" lang="${L}">
    <h1>${esc(p.name)}</h1>
    <p>${esc(p.role[L])} — ${esc(p.tagline[L])}</p>
    <p>${esc(p.bio[L])}</p>
    <h2>${tr ? 'Projeler' : 'Projects'}</h2>
    <ul>${p.projects
      .map((x) => `<li><strong>${esc(x.title[L])}</strong> — ${esc(x.summary[L])} (${esc(x.stack.join(', '))})${x.url ? ` <a href="${esc(x.url)}">GitHub</a>` : ''}</li>`)
      .join('')}</ul>
    <h2>${tr ? 'Eğitim' : 'Education'}</h2>
    <ul>${p.education.map((e) => `<li>${esc(e.program[L])} — ${esc(e.school)}, ${esc(e.period)} (${esc(e.detail[L])})</li>`).join('')}</ul>
    <h2>${tr ? 'Deneyim' : 'Experience'}</h2>
    <ul>${p.experience.map((x) => `<li>${esc(x.title[L])} — ${esc(x.org)}, ${esc(x.period[L])}</li>`).join('')}</ul>
    <h2>${tr ? 'Yetenekler' : 'Skills'}</h2>
    <p>${esc(p.skills.flatMap((s) => s.items).join(', '))}</p>
    <h2>${tr ? 'İletişim' : 'Contact'}</h2>
    <p><a href="mailto:${esc(p.contact.email)}">${esc(p.contact.email)}</a> · <a href="${esc(p.contact.github)}">GitHub</a> · <a href="${esc(p.contact.linkedin)}">LinkedIn</a></p>
  </article>`
}

/** Short description for meta tags (≤ 160 chars). */
export function metaDescription(L: Lang = 'tr'): string {
  const featured = profile.projects.find((x) => x.featured)
  const text = `${profile.name} — ${profile.role[L]}. ${featured ? `${featured.short[L]}: ${featured.summary[L]}` : profile.tagline[L]}`
  return text.length > 158 ? `${text.slice(0, 157)}…` : text
}
