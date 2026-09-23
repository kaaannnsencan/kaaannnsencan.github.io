import { i18n } from '../content/i18n'
import { profile } from '../content/profile'
import { colorFor } from '../data/city'
import type { GithubSnapshot } from '../data/github'
import { esc } from '../ui/panels'

/**
 * The same content as the world, as a fast, accessible, printable page.
 * Used when WebGL is unavailable, when the visitor asks for it, or for `?classic`.
 */
export function renderClassic(root: HTMLElement, github: GithubSnapshot, opts: { canReturn: boolean; onReturn: () => void; notice?: string }) {
  const draw = () => {
    const L = i18n.lang
    const tr = L === 'tr'
    // same rule as the Code District: skip forks and empty, undescribed repos
    const repos = [...github.repos]
      .filter((r) => !r.fork && (r.size > 0 || r.description))
      .sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
    root.innerHTML = `
      <div class="classic-bar">
        <strong>Kaan Şencan</strong>
        <div class="group">
          <button class="btn" data-print type="button">${esc(i18n.t('print'))}</button>
          <button class="btn" data-lang type="button">${tr ? 'EN' : 'TR'}</button>
          ${opts.canReturn ? `<button class="btn primary" data-return type="button">${esc(i18n.t('world'))}</button>` : ''}
        </div>
      </div>
      <header class="classic-hero">
        <div class="wrap">
          ${opts.notice ? `<p class="chip" style="display:inline-block;color:#1a1420">${esc(opts.notice)}</p>` : ''}
          <img class="classic-portrait" src="${esc(import.meta.env.BASE_URL + profile.portrait)}" alt="${esc(profile.name)}" />
          <h1>${esc(profile.name)}</h1>
          <p>${esc(profile.role[L])}</p>
          <p style="opacity:.85">${esc(profile.tagline[L])}</p>
          <div class="actions">
            <a class="btn primary" href="mailto:${esc(profile.contact.email)}">${esc(profile.contact.email)}</a>
            <a class="btn cyan" href="${esc(profile.contact.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a class="btn" href="${esc(profile.contact.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </header>

      <section style="--accent:#ff8a5c">
        <h2>${tr ? 'Hakkımda' : 'About'}</h2>
        <p>${esc(profile.bio[L])}</p>
      </section>

      <section style="--accent:#37c3d6">
        <h2>${tr ? 'Projeler' : 'Projects'}</h2>
        <div class="cards">
          ${profile.projects
            .map(
              (p) => `<article class="card"${p.featured ? ` style="grid-column:1/-1;--accent:${esc(p.accent)}"` : ''}>
                ${p.logo ? `<div class="brand-logo"><img src="${esc(import.meta.env.BASE_URL + p.logo)}" alt="${esc(p.short[L])} logo" /></div>` : ''}
                <h3>${esc(p.title[L])}</h3>
                ${p.role ? `<p><b>${esc(p.role[L])}</b></p>` : ''}
                <p>${esc(p.summary[L])}</p>
                <div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
                <ul>${p.bullets.map((b) => `<li>${esc(b[L])}</li>`).join('')}</ul>
                ${p.url ? `<div class="actions"><a class="btn primary" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">GitHub</a></div>` : ''}
              </article>`,
            )
            .join('')}
        </div>
      </section>

      ${
        repos.length
          ? `<section class="no-print" style="--accent:#39d353">
        <h2>GitHub</h2>
        <div class="cards">
          ${repos
            .map(
              (r) => `<article class="card">
                <h3><a href="${esc(r.htmlUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a></h3>
                <p>${esc(r.description || i18n.t('noDescription'))}</p>
                ${r.language ? `<span class="chip"><span class="dot" style="background:${esc(colorFor(r.language))}"></span>${esc(r.language)}</span>` : ''}
              </article>`,
            )
            .join('')}
        </div>
      </section>`
          : ''
      }

      <section style="--accent:#7bd66a">
        <h2>${tr ? 'Yetenekler' : 'Skills'}</h2>
        ${profile.skills
          .map((s) => `<h3 style="font-family:var(--font-head);margin:14px 0 6px">${esc(s.title[L])}</h3><div class="chips">${s.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>`)
          .join('')}
      </section>

      <section style="--accent:#3e6fb0">
        <h2>${tr ? 'Eğitim' : 'Education'}</h2>
        <div class="timeline">${profile.education
          .map((e) => `<div class="item"><span class="when">${esc(e.period)}</span><strong>${esc(e.program[L])}</strong>${esc(e.school)} · ${esc(e.detail[L])}</div>`)
          .join('')}</div>
      </section>

      <section style="--accent:#f2c14e">
        <h2>${tr ? 'Deneyim' : 'Experience'}</h2>
        <div class="timeline">${profile.experience
          .map(
            (x) =>
              `<div class="item"><span class="when">${esc(x.period[L])}</span><strong>${esc(x.title[L])}</strong>${esc(x.org)}<ul>${x.bullets.map((b) => `<li>${esc(b[L])}</li>`).join('')}</ul></div>`,
          )
          .join('')}</div>
      </section>

      <section style="--accent:#c86bd8">
        <h2>${tr ? 'Diller' : 'Languages'}</h2>
        <p>${profile.languages.map((l) => `<b>${esc(l.name[L])}</b> — ${esc(l.level[L])}`).join('<br>')}</p>
      </section>`
    root.querySelector('[data-lang]')?.addEventListener('click', () => i18n.set(i18n.lang === 'tr' ? 'en' : 'tr'))
    root.querySelector('[data-print]')?.addEventListener('click', () => window.print())
    root.querySelector('[data-return]')?.addEventListener('click', opts.onReturn)
  }
  draw()
  const dispose = i18n.onChange(() => {
    if (!root.hidden) draw()
  })
  return { redraw: draw, dispose }
}
