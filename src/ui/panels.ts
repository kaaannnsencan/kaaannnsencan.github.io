import { i18n } from '../content/i18n'
import { profile, type Lang } from '../content/profile'
import { colorFor, type Lot } from '../data/city'
import type { GithubSnapshot, Repo } from '../data/github'
import type { PanelRequest } from '../world/kit'
import { TRAVEL } from '../world/layout'
import { paintPoster } from '../world/posters'

export interface PanelView {
  title: string
  accent: string
  html: string
}

/** Everything that can end up in innerHTML goes through here (GitHub data is untrusted). */
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null
  try {
    const url = new URL(u, location.href)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:' || url.protocol === 'tel:' ? url.href : null
  } catch {
    return null
  }
}

const link = (href: string | null, text: string, cls = 'btn') =>
  href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : ''

const chips = (items: string[], color?: (s: string) => string) =>
  `<div class="chips">${items.map((i) => `<span class="chip">${color ? `<span class="dot" style="background:${esc(color(i))}"></span>` : ''}${esc(i)}</span>`).join('')}</div>`

function date(iso: string, lang: Lang) {
  const d = new Date(iso)
  return isNaN(+d) ? '' : d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function travelButtons() {
  return `<div class="actions">${TRAVEL.filter((t) => t.id !== 'spawn')
    .map((t) => `<button class="btn" data-travel="${t.id}"><span class="dot" style="width:10px;height:10px;background:${t.color};box-shadow:0 0 0 2px #1a1420"></span>${esc(t.name[i18n.lang])}</button>`)
    .join('')}</div>`
}

export function renderPanel(req: PanelRequest, github: GithubSnapshot): PanelView {
  const L = i18n.lang
  const tr = L === 'tr'
  switch (req.kind) {
    case 'welcome': {
      const touch = matchMedia('(pointer: coarse)').matches
      return {
        title: tr ? 'Hoş geldin!' : 'Welcome!',
        accent: '#f2c14e',
        html: `
          <p><b>${esc(profile.tagline[L])}</b></p>
          <p>${touch
            ? tr
              ? 'Bu ada benim portfolyom. Sol alttaki joystick ile dolaş, binalara ve tabelalara yaklaş, sağ alttaki butona dokunarak incele. Kod Mahallesi’ndeki her bina GitHub’daki bir repo ya da projem — yeni bir repo açtığımda şehir kendiliğinden büyüyor.'
              : 'This island is my portfolio. Walk with the joystick, go up to buildings and signs and tap the button to inspect them. Every building in the Code District is a GitHub repo or one of my projects — when I publish a new repo, the city grows on its own.'
            : tr
            ? 'Bu ada benim portfolyom. Etrafta dolaş, binalara ve tabelalara yaklaş, <b>E</b> ile incele. Kod Mahallesi’ndeki her bina GitHub’daki bir repo ya da projem — yeni bir repo açtığımda şehir kendiliğinden büyüyor.'
            : 'This island is my portfolio. Walk around, go up to buildings and signs and press <b>E</b> to inspect them. Every building in the Code District is a GitHub repo or one of my projects — when I publish a new repo, the city grows on its own.'}</p>
          <h3>${tr ? 'Nereye gitmek istersin?' : 'Where to?'}</h3>
          ${travelButtons()}
          <h3>${tr ? 'Kontroller' : 'Controls'}</h3>
          <p class="muted">${esc(i18n.t(matchMedia('(pointer: coarse)').matches ? 'controlsTouch' : 'controlsDesktop'))}</p>
          <p class="muted">${tr ? 'Aceleniz mi var? Sağ üstteki sayfa ikonu klasik görünümü açar.' : 'In a hurry? The page icon at the top right opens the classic view.'}</p>`,
      }
    }

    case 'about':
      return {
        title: profile.name,
        accent: '#ff8a5c',
        html: `
          <div class="about-portrait"><img src="${esc(import.meta.env.BASE_URL + profile.portrait)}" alt="${esc(profile.name)}" /></div>
          <p><b>${esc(profile.role[L])}</b></p>
          <div class="stats">
            <div class="stat"><b>3</b>${tr ? 'program' : 'programs'}</div>
            <div class="stat"><b>%100</b>${tr ? 'burs' : 'scholarship'}</div>
            <div class="stat"><b>${profile.projects.length}</b>${tr ? 'proje' : 'projects'}</div>
          </div>
          <p>${esc(profile.bio[L])}</p>
          <h3>${tr ? 'İki disiplin, tek kişi' : 'Two disciplines, one person'}</h3>
          <p>${tr
            ? 'Yazılım tarafında veri, yapay zekâ ve mobil ürünler geliştiriyorum; tasarım tarafında görsel iletişimle bunları insanların sevdiği şeylere dönüştürüyorum. Bu site ikisinin birleşimi: özel render hattından piksel karaktere kadar sıfırdan inşa edildi.'
            : 'On the engineering side I build data, AI and mobile products; on the design side I use visual communication to turn them into things people enjoy. This site is both at once — built from scratch, from the custom render pipeline to the pixel character.'}</p>
          <div class="actions">
            <button class="btn primary" data-open="contact">${tr ? 'İletişime geç' : 'Get in touch'}</button>
            <button class="btn" data-travel="code">${tr ? 'Projelere git' : 'See projects'}</button>
          </div>`,
      }

    case 'contact': {
      const c = profile.contact
      return {
        title: tr ? 'İletişim' : 'Contact',
        accent: '#ff8a5c',
        html: `
          <p>${tr ? 'Staj, iş birliği ya da sadece merhaba demek için:' : 'For internships, collaborations or just to say hi:'}</p>
          <div class="copy-row"><span>${esc(c.email)}</span><button class="btn" data-copy="${esc(c.email)}">${tr ? 'Kopyala' : 'Copy'}</button></div>
          <div class="actions">
            ${link(`mailto:${c.email}`, tr ? 'E-posta gönder' : 'Send email', 'btn primary')}
            ${link(c.linkedin, 'LinkedIn', 'btn cyan')}
            ${link(c.github, 'GitHub')}
            ${link(`tel:${c.phone.replace(/\s/g, '')}`, c.phone)}
          </div>`,
      }
    }

    case 'repo': {
      const lot = req.payload as Extract<Lot, { kind: 'repo' }>
      const r: Repo = lot.repo
      const p = lot.project
      return {
        title: p ? p.title[L] : r.name,
        accent: lot.color,
        html: `
          ${p ? `<p class="muted">${esc(r.name)}</p>` : ''}
          <p>${esc(p ? p.summary[L] : r.description || i18n.t('noDescription'))}</p>
          ${lot.active ? `<p><span class="chip">🏗 ${esc(i18n.t('underConstruction'))}</span></p>` : ''}
          <div class="stats">
            <div class="stat"><b>${r.stars}</b>${esc(i18n.t('stars'))}</div>
            <div class="stat"><b>${r.forks}</b>fork</div>
            <div class="stat"><b>${lot.floors}</b>${tr ? 'kat' : 'floors'}</div>
          </div>
          ${r.language ? chips([r.language], colorFor) : ''}
          ${p ? chips(p.stack) : ''}
          ${p ? `<ul>${p.bullets.map((b) => `<li>${esc(b[L])}</li>`).join('')}</ul>` : ''}
          ${r.topics.length ? chips(r.topics) : ''}
          <p class="muted">${esc(i18n.t('updated'))}: ${esc(date(r.pushedAt, L))}</p>
          <p class="muted">${tr ? 'Bina yüksekliği repo boyutu ve yıldızlarla, rengi ana dille belirleniyor.' : 'Building height comes from repo size and stars; colour from the main language.'}</p>
          <div class="actions">
            ${link(safeUrl(r.htmlUrl), i18n.t('openRepo'), 'btn primary')}
            ${link(safeUrl(r.homepage), i18n.t('openLive'), 'btn cyan')}
          </div>`,
      }
    }

    case 'project': {
      const p = (req.payload as Extract<Lot, { kind: 'project' }> | undefined)?.project ?? profile.projects.find((x) => x.id === req.id) ?? profile.projects[0]
      const ext = p.externalRepo ? github.featured?.find((f) => f.fullName.toLowerCase() === p.externalRepo!.toLowerCase()) : undefined
      return {
        title: p.title[L],
        accent: p.accent,
        html: `
          ${p.logo ? `<div class="brand-logo"><img src="${esc(import.meta.env.BASE_URL + p.logo)}" alt="${esc(p.short[L])} logo" /></div>` : ''}
          ${p.role ? `<p><b>${esc(p.role[L])}</b></p>` : ''}
          <p>${esc(p.summary[L])}</p>
          ${chips(p.stack)}
          <ul>${p.bullets.map((b) => `<li>${esc(b[L])}</li>`).join('')}</ul>
          ${p.team ? `<p class="muted">${tr ? 'Ekip' : 'Team'}: ${esc(p.team)}</p>` : ''}
          ${ext ? `<p class="muted">${esc(ext.fullName)}${ext.language ? ` · ${esc(ext.language)}` : ''} · ${esc(i18n.t('updated'))}: ${esc(date(ext.pushedAt, L))}</p>` : ''}
          ${p.featured ? '' : `<p class="muted">${tr ? 'Kubbeli binalar CV’mdeki seçili projeler; GitHub’a eklendiklerinde gökdelene dönüşecekler.' : 'Domed buildings are selected projects from my CV; they turn into towers once they are on GitHub.'}</p>`}
          <div class="actions">
            ${link(safeUrl(ext?.htmlUrl ?? p.url), i18n.t('openRepo'), 'btn primary')}
            ${link(safeUrl(ext?.homepage), i18n.t('openLive'), 'btn cyan')}
          </div>`,
      }
    }

    case 'empty':
      return { title: tr ? 'Boş arsa' : 'Empty lot', accent: '#f2c14e', html: `<p>${esc(i18n.t('emptyLot'))}</p>` }

    case 'github': {
      const u = github.user
      const repos = [...github.repos].sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt))
      const langs = Array.from(new Set(repos.map((r) => r.language).filter(Boolean))) as string[]
      return {
        title: 'GitHub',
        accent: '#39d353',
        html: `
          <div class="stats">
            <div class="stat"><b>${u?.publicRepos ?? repos.length}</b>repo</div>
            <div class="stat"><b>${u?.followers ?? '—'}</b>${tr ? 'takipçi' : 'followers'}</div>
            ${github.contributions ? `<div class="stat"><b>${github.contributions.total}</b>${tr ? 'katkı' : 'contribs'}</div>` : ''}
          </div>
          ${langs.length ? chips(langs, colorFor) : ''}
          <div class="repo-list">${repos
            .map((r) => {
              const url = safeUrl(r.htmlUrl)
              return url
                ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><b>${esc(r.name)}</b><br><span class="muted">${esc(r.description || i18n.t('noDescription'))}</span></a>`
                : ''
            })
            .join('')}</div>
          <div class="actions">${link(profile.contact.github, tr ? 'Profili aç' : 'Open profile', 'btn primary')}</div>
          ${github.generatedAt ? `<p class="muted">${tr ? 'Veri' : 'Data'}: ${esc(date(github.generatedAt, L))}</p>` : ''}`,
      }
    }

    case 'design':
      return {
        title: tr ? 'Tasarım Stüdyosu' : 'Design Studio',
        accent: '#c86bd8',
        html: `
          <p>${tr
            ? 'Görsel İletişim Tasarımı eğitimim bu sitenin her yerinde: palet, tipografi, piksel karakter ve arayüz. Galerideki şövalelerde seçili işlerim duruyor.'
            : 'My Visual Communication Design background is everywhere on this site: the palette, the type, the pixel character and the UI. The easels in the gallery hold selected work.'}</p>
          ${chips(profile.skills.find((s) => s.id === 'design')?.items ?? [])}
          <ul>${profile.design.map((d) => `<li><b>${esc(d.title[L])}</b> — ${esc(d.kind[L])}</li>`).join('')}</ul>`,
      }

    case 'designWork': {
      const work = profile.design.find((d) => d.id === req.id) ?? profile.design[0]
      const src = work.image ? `${import.meta.env.BASE_URL}${work.image.replace(/^\//, '')}` : paintPoster(work).toDataURL()
      return {
        title: work.title[L],
        accent: work.colors[2],
        html: `
          <img class="poster-view" src="${esc(src)}" alt="${esc(work.title[L])}" />
          <p><span class="chip">${esc(work.kind[L])}</span></p>
          ${work.image ? '' : `<p class="muted">${tr ? 'Bu, kodla üretilmiş bir yer tutucu afiş. Gerçek iş yakında burada.' : 'This is a code-generated placeholder poster. The real piece is coming soon.'}</p>`}
          <div class="actions">${link(safeUrl(work.link), tr ? 'Projeyi aç' : 'Open project', 'btn primary')}</div>`,
      }
    }

    case 'skills': {
      const group = profile.skills.find((s) => s.id === req.id) ?? profile.skills[0]
      return {
        title: group.title[L],
        accent: group.color,
        html: `
          ${chips(group.items)}
          <h3>${tr ? 'Diğer gruplar' : 'Other groups'}</h3>
          ${profile.skills
            .filter((s) => s.id !== group.id)
            .map((s) => `<p><b>${esc(s.title[L])}</b></p>${chips(s.items)}`)
            .join('')}`,
      }
    }

    case 'education':
      return {
        title: tr ? 'Eğitim' : 'Education',
        accent: '#3e6fb0',
        html: `<div class="timeline">${profile.education
          .map((e) => `<div class="item"><span class="when">${esc(e.period)}</span><strong>${esc(e.program[L])}</strong>${esc(e.school)} · ${esc(e.detail[L])}</div>`)
          .join('')}</div>`,
      }

    case 'experience':
      return {
        title: tr ? 'Deneyim' : 'Experience',
        accent: '#f2c14e',
        html: `<div class="timeline">${profile.experience
          .map(
            (x) =>
              `<div class="item"><span class="when">${esc(x.period[L])}</span><strong>${esc(x.title[L])}</strong>${esc(x.org)}<ul>${x.bullets
                .map((b) => `<li>${esc(b[L])}</li>`)
                .join('')}</ul></div>`,
          )
          .join('')}</div>`,
      }

    case 'languages':
      return {
        title: tr ? 'Diller' : 'Languages',
        accent: '#e30a17',
        html: `<ul>${profile.languages.map((l) => `<li><b>${esc(l.name[L])}</b> — ${esc(l.level[L])}</li>`).join('')}</ul>`,
      }
  }
  return { title: '', accent: '#f2c14e', html: '' }
}
