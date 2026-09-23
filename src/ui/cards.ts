import { i18n } from '../content/i18n'
import { profile, type L } from '../content/profile'
import { CHAPTERS, type CardArt, type Chapter, type GameCard, type Rarity } from '../content/village'
import { FRAME_H, FRAME_W, paintCharacterSheet } from '../player/SpriteFactory'
import { esc } from './panels'

// 12×12 pixel card art. Letters index into the palette below.
const ART: Record<Exclude<CardArt, 'hero' | 'portrait'>, string[]> = {
  cap: ['............', '.....kk.....', '...kkkkkk...', '.kkkkkkkkkk.', 'kkkkkkkkkkkk', '..kkkkkkkky.', '..kkkkkkk.y.', '..kkkkkkk.y.', '...kkkkk..yy', '............', '............', '............'],
  brush: ['.........kk.', '........kkk.', '.......kkk..', '......kkk...', '.....kkk....', '....yyk.....', '...yyy......', '..mmyy......', '.mmmm.......', '.mmm........', 'mm..........', '............'],
  chart: ['............', '.........gg.', '.........gg.', '......cc.gg.', '......cc.gg.', '...yy.cc.gg.', '...yy.cc.gg.', 'm..yy.cc.gg.', 'm..yy.cc.gg.', 'kkkkkkkkkkkk', '............', '............'],
  code: ['............', '............', '..c.....c...', '.c...y...c..', 'c...y.....c.', 'c...y.....c.', '.c.y.....c..', '..cy....c...', '..y.........', '............', '............', '............'],
  briefcase: ['............', '....kkkk....', '....k..k....', '.oooooooooo.', '.oooooooooo.', '.ooooyyooooo', '.kkkkyykkkk.', '.oooooooooo.', '.oooooooooo.', '.oooooooooo.', '............', '............'],
  speech: ['............', '.wwwwwwwwww.', 'wwkkwwkkwwkw', 'wwwwwwwwwwww', 'wkkkkwwkkkww', 'wwwwwwwwwwww', '.wwwwwwwwww.', '...ww.......', '..w.........', '............', '............', '............'],
  gem: ['............', '...yyyyyy...', '..yyyyyyyy..', '.wwyyyyyyww.', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..', '...wwwwww...', '....wwww....', '.....ww.....', '............', '............'],
  brain: ['............', '...mmmmmm...', '..mmwmmwmm..', '.mmwmmmmwmm.', '.mwmmwwmmwm.', '.mmmwmmwmmm.', '.mmwmmmmwmm.', '..mmwmmwmm..', '...mmmmmm...', '.....mm.....', '.....mm.....', '............'],
  gear: ['.....kk.....', '..k.kkkk.k..', '.kkkkkkkkkk.', '..kkk..kkk..', 'kkkk....kkkk', 'kkk......kkk', 'kkk......kkk', 'kkkk....kkkk', '..kkk..kkk..', '.kkkkkkkkkk.', '..k.kkkk.k..', '.....kk.....'],
  scroll: ['............', '.yyyyyyyyy..', 'y.wwwwwwwwy.', '.ywkkkkkwwy.', '.ywwwwwwwwy.', '.ywkkkkwwwy.', '.ywwwwwwwwy.', '.ywkkkkkkwy.', '.ywwwwwwwwy.', '.yyyyyyyyy.y', '..........y.', '............'],
  flagTr: ['............', 'rrrrrrrrrrrr', 'rrrwwwrrrrrr', 'rrwwrrrrwrrr', 'rrwrrrrwwwrr', 'rrwrrrrrwrrr', 'rrwwrrrrrrrr', 'rrrwwwrrrrrr', 'rrrrrrrrrrrr', '............', '............', '............'],
  flagEn: ['............', 'bbbbbwrwbbbb', 'bbbbbwrwbbbb', 'wwwwwwrwwwww', 'rrrrrrrrrrrr', 'wwwwwwrwwwww', 'bbbbbwrwbbbb', 'bbbbbwrwbbbb', 'bbbbbwrwbbbb', '............', '............', '............'],
}

const PAL: Record<string, string> = {
  k: '#1a1420', y: '#f2c14e', w: '#fbf7ef', m: '#c86bd8', c: '#37c3d6', g: '#7bd66a', o: '#9c6b43', r: '#e30a17', b: '#1f3b8f',
}

const artCache = new Map<CardArt, string>()

/** Card art as a data URL (drawn once, cached). */
function artUrl(art: CardArt): string {
  const hit = artCache.get(art)
  if (hit) return hit
  if (art === 'portrait') return import.meta.env.BASE_URL + profile.portrait
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  if (art === 'hero') {
    // the in-world character, front-facing frame
    c.width = FRAME_W
    c.height = FRAME_H
    g.drawImage(paintCharacterSheet(), 0, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H)
  } else {
    const rows = ART[art]
    c.width = 12
    c.height = 12
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = PAL[row[x]]
        if (!col) continue
        g.fillStyle = col
        g.fillRect(x, y, 1, 1)
      }
    })
  }
  const url = c.toDataURL()
  artCache.set(art, url)
  return url
}

/** Draws every card picture ahead of time so opening a deck never paints on the spot. */
export function warmCardArt() {
  const arts = new Set<CardArt>()
  for (const ch of CHAPTERS) for (const c of ch.cards) arts.add(c.art)
  const queue = [...arts]
  const next = () => {
    const art = queue.shift()
    if (!art) return
    artUrl(art)
    schedule(next)
  }
  schedule(next)
}

function schedule(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
  if (ric) ric(fn)
  else setTimeout(fn, 30)
}

const RARITY: Record<Rarity, L> = {
  common: { tr: 'Sıradan', en: 'Common' },
  rare: { tr: 'Nadir', en: 'Rare' },
  epic: { tr: 'Epik', en: 'Epic' },
  legendary: { tr: 'Efsanevi', en: 'Legendary' },
}

const pick = (v: L | string) => (typeof v === 'string' ? v : i18n.pick(v))

function cardHtml(card: GameCard, i: number) {
  return `
    <article class="gcard r-${card.rarity}" style="--c:${esc(card.color)};--i:${i}">
      <header><h3>${esc(pick(card.title))}</h3></header>
      <div class="gcard-art${card.art === 'portrait' ? ' portrait' : ''}"><img src="${artUrl(card.art)}" alt="" decoding="async" /></div>
      <div class="gcard-type"><span>${esc(pick(card.type))}</span><span class="gem" title="${esc(pick(RARITY[card.rarity]))}"></span></div>
      <div class="gcard-text">
        <p>${esc(pick(card.text))}</p>
        ${card.list ? `<ul>${card.list.map((l) => `<li>${esc(pick(l))}</li>`).join('')}</ul>` : ''}
      </div>
      <footer>${card.stats.map((s) => `<div><b>${esc(pick(s.v))}</b><small>${esc(pick(s.k))}</small></div>`).join('')}</footer>
      <div class="gcard-rarity">${esc(pick(RARITY[card.rarity]))}</div>
    </article>`
}

function questHtml(ch: Chapter) {
  return `
    <article class="quest-log">
      <ol>${(ch.quests ?? [])
        .map(
          (q) => `<li class="${q.done ? 'done' : 'open'}">
            <span class="box">${q.done ? '✔' : ''}</span>
            <span class="when">${esc(pick(q.when))}</span>
            <span class="what">${esc(pick(q.title))}</span>
          </li>`,
        )
        .join('')}</ol>
    </article>`
}

export function chapterTitle(id: string) {
  const ch = CHAPTERS.find((c) => c.id === id)
  return ch ? pick(ch.name) : ''
}

export interface Deck {
  title: string
  intro: string
  /** Parsed card nodes, reused on every open (re-inserting them replays the deal animation). */
  nodes: Node[]
}

const decks = new Map<string, Deck>()
i18n.onChange(() => decks.clear())

function buildDeck(id: string): Deck {
  const ch = CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0]
  const tpl = document.createElement('template')
  tpl.innerHTML = ch.quests ? questHtml(ch) : ch.cards.map(cardHtml).join('')
  return { title: pick(ch.name), intro: pick(ch.intro), nodes: Array.from(tpl.content.childNodes) }
}

/** A village chapter as a deck of card elements (built once per language). */
export function renderDeck(id: string): Deck {
  let deck = decks.get(id)
  if (!deck) decks.set(id, (deck = buildDeck(id)))
  return deck
}

/** Builds every deck while the browser is idle so the first open is instant too. */
export function warmDecks() {
  const ids = CHAPTERS.map((c) => c.id)
  const next = () => {
    const id = ids.shift()
    if (!id) return
    renderDeck(id)
    schedule(next)
  }
  schedule(next)
}
