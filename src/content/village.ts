// Kaan's Village: the CV told as a deck of game cards. Every fact comes from
// profile.ts; cards only add game framing (rarity, card type), never new claims.

import { profile, type L } from './profile'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type CardArt = 'hero' | 'cap' | 'brush' | 'chart' | 'code' | 'briefcase' | 'speech' | 'gem' | 'brain' | 'gear' | 'scroll' | 'flagTr' | 'flagEn'

export interface GameCard {
  title: L | string
  type: L
  art: CardArt
  rarity: Rarity
  color: string
  stats: Array<{ k: L; v: L | string }>
  text: L
  list?: Array<L | string>
}

export interface Quest {
  when: L
  title: L
  done: boolean
}

export interface Chapter {
  id: string
  /** Sign on the house. */
  name: L
  roof: string
  wall: string
  intro: L
  cards: GameCard[]
  quests?: Quest[]
}

const tl = (tr: string, en: string): L => ({ tr, en })

const hero: GameCard = {
  title: profile.shortName,
  type: tl('Kahraman · Hibrit Sınıf', 'Hero · Hybrid Class'),
  art: 'hero',
  rarity: 'legendary',
  color: '#f2c14e',
  stats: [
    { k: tl('Program', 'Programs'), v: '3' },
    { k: tl('Burs', 'Scholarship'), v: '%100' },
    { k: tl('Proje', 'Projects'), v: String(profile.projects.length) },
    { k: tl('Dil', 'Languages'), v: String(profile.languages.length) },
  ],
  text: profile.tagline,
  list: [
    tl('Veri analizi & makine öğrenmesi', 'Data analysis & machine learning'),
    tl('LLM / yapay zekâ entegrasyonu', 'LLM / AI integration'),
    tl('Flutter ile mobil ürün', 'Mobile products with Flutter'),
    tl('Görsel iletişim tasarımı', 'Visual communication design'),
  ],
}

// card look per program (keyed by id, so reordering the CV never mismatches cards)
const EDU: Record<string, { art: CardArt; rarity: Rarity; color: string; text: L }> = {
  vcd: {
    art: 'brush',
    rarity: 'legendary',
    color: '#c86bd8',
    text: tl('Tipografi, kimlik, arayüz ve hareketli grafik: sitenin görsel dili buradan geliyor.', 'Typography, identity, interfaces and motion: the look of this site comes from here.'),
  },
  mis: {
    art: 'chart',
    rarity: 'epic',
    color: '#3e6fb0',
    text: tl('İş süreçleri, veritabanı, sistem analizi ve veri odaklı karar verme.', 'Business processes, databases, systems analysis and data-driven decisions.'),
  },
  se: {
    art: 'code',
    rarity: 'rare',
    color: '#37c3d6',
    text: tl('Algoritmalar, veri yapıları, nesne yönelimli programlama ve yazılım mimarisi.', 'Algorithms, data structures, object-oriented programming and software architecture.'),
  },
}

// same order as the CV: reverse chronological
const education: GameCard[] = profile.education.map((e) => {
  const look = EDU[e.id] ?? { art: 'cap' as CardArt, rarity: 'rare' as Rarity, color: '#3e6fb0', text: e.detail }
  return {
    title: e.program,
    type: tl('Eğitim · İstinye Üniversitesi', 'Education · İstinye University'),
    art: look.art,
    rarity: look.rarity,
    color: look.color,
    stats: [
      { k: tl('Dönem', 'Period'), v: e.period },
      { k: tl('Durum', 'Status'), v: e.detail },
    ],
    text: look.text,
  }
})

const career: GameCard[] = profile.experience.map((x) => ({
  title: x.title,
  type: tl('Deneyim · ' + x.org, 'Experience · ' + x.org),
  art: 'briefcase',
  rarity: 'rare',
  color: '#ff8a5c',
  stats: [
    { k: tl('Dönem', 'Period'), v: x.period },
    { k: tl('Günlük görüşme', 'Daily meetings'), v: '20+' },
  ],
  text: tl('Aday öğrencilere ve ailelerine bölüm ve program danışmanlığı.', 'Program advice for prospective students and their families.'),
  list: x.bullets,
}))

const projectArt: Record<string, CardArt> = { 'vitrin-ai': 'gem', 'node-ai': 'brain', rfm: 'chart', 'credit-risk': 'chart', portfolio: 'code' }

const projects: GameCard[] = profile.projects.map((p) => ({
  title: p.short,
  type: p.featured ? tl('Proje · Girişim', 'Project · Startup') : tl('Proje', 'Project'),
  art: projectArt[p.id] ?? 'code',
  rarity: p.featured ? 'legendary' : 'epic',
  color: p.accent,
  stats: [{ k: tl('Teknoloji', 'Stack'), v: p.stack.slice(0, 3).join(' · ') }],
  text: p.summary,
}))

const skills: GameCard[] = profile.skills.map((s) => ({
  title: s.title,
  type: tl('Yetenek Seti', 'Skill Set'),
  art: s.id === 'design' ? 'brush' : s.id === 'tools' ? 'gear' : s.id === 'lang' ? 'code' : s.id === 'tech' ? 'brain' : 'scroll',
  rarity: s.id === 'lang' || s.id === 'design' ? 'epic' : 'rare',
  color: s.color,
  stats: [{ k: tl('Adet', 'Count'), v: String(s.items.length) }],
  text: tl('Bu setteki araçlar ve alanlar:', 'Tools and fields in this set:'),
  list: s.items,
}))

const languages: GameCard[] = profile.languages.map((l, i) => ({
  title: l.name,
  type: tl('Dil', 'Language'),
  art: i === 0 ? 'flagTr' : 'flagEn',
  rarity: i === 0 ? 'epic' : 'rare',
  color: i === 0 ? '#e30a17' : '#1f3b8f',
  stats: [{ k: tl('Seviye', 'Level'), v: l.level }],
  text: i === 0 ? tl('Ana dilim.', 'My native language.') : tl('İş ortamında rahatça çalışabileceğim seviyede.', 'Comfortable working in it professionally.'),
}))

export const QUESTS: Quest[] = [
  { when: tl('Tem – Ağu 2024', 'Jul – Aug 2024'), title: tl('Tercih Tanıtım Danışmanı — İstinye Üniversitesi', 'Admissions Consultant — İstinye University'), done: true },
  { when: tl('Eki 2024', 'Oct 2024'), title: tl('Yönetim Bilişim Sistemleri ÇAP başladı (%100 burs)', 'Started MIS double major (100% scholarship)'), done: true },
  { when: tl('Eki 2025', 'Oct 2025'), title: tl('Yazılım Mühendisliği yandalı başladı', 'Started Software Engineering minor'), done: true },
  { when: tl('2026', '2026'), title: tl('Görsel İletişim Tasarımı — mezuniyet', 'Visual Communication Design — graduated'), done: true },
  { when: tl('2026', '2026'), title: tl('Vitrin AI — canlıya çıkış', 'Vitrin AI — public launch'), done: false },
  { when: tl('Haz 2027', 'Jun 2027'), title: tl('Yazılım Mühendisliği yandalı tamam', 'Software Engineering minor complete'), done: false },
  { when: tl('Haz 2028', 'Jun 2028'), title: tl('Yönetim Bilişim Sistemleri tamam', 'MIS complete'), done: false },
]

export const CHAPTERS: Chapter[] = [
  { id: 'hero', name: tl('BEN KİMİM', 'WHO AM I'), roof: '#c4473d', wall: '#f1e9d9', intro: tl('Karakter kartım.', 'My character card.'), cards: [hero] },
  { id: 'school', name: tl('OKUL', 'SCHOOL'), roof: '#3e6fb0', wall: '#eef1f6', intro: tl('Üç program, tek üniversite.', 'Three programs, one university.'), cards: education },
  { id: 'career', name: tl('İŞ', 'WORK'), roof: '#e0913d', wall: '#f4ead8', intro: tl('Deneyim kartları.', 'Experience cards.'), cards: career },
  { id: 'workshop', name: tl('ATÖLYE', 'WORKSHOP'), roof: '#7a4bb5', wall: '#f4eefc', intro: tl('Yetenek destem.', 'My skill deck.'), cards: skills },
  { id: 'archive', name: tl('ARŞİV', 'ARCHIVE'), roof: '#2f6b3a', wall: '#eef4e8', intro: tl('Projelerin özeti; binaları Kod Mahallesi’nde.', 'Project summaries; their buildings are in the Code District.'), cards: projects },
  { id: 'lang', name: tl('DİLLER', 'LANGUAGES'), roof: '#8e1b2b', wall: '#fbf1ee', intro: tl('Konuştuğum diller.', 'Languages I speak.'), cards: languages },
  {
    id: 'board',
    name: tl('GÖREV PANOSU', 'QUEST BOARD'),
    roof: '#6b4430',
    wall: '#9c6b43',
    intro: tl('Eğitim ve kariyer yolculuğum, görev günlüğü olarak.', 'My education and career path as a quest log.'),
    cards: [],
    quests: QUESTS,
  },
]
