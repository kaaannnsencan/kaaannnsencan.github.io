import type { L, Lang } from './profile'

export const ui = {
  loading: { tr: 'Dünya inşa ediliyor', en: 'Building the world' },
  start: { tr: 'Keşfetmeye Başla', en: 'Start Exploring' },
  ready: { tr: 'Dünya hazır!', en: 'The world is ready!' },
  classic: { tr: 'Klasik görünüm', en: 'Classic view' },
  world: { tr: '3D dünyaya dön', en: 'Back to the world' },
  controlsDesktop: { tr: 'WASD / Oklar: yürü · Shift: koş · E: etkileşim · M: harita', en: 'WASD / Arrows: walk · Shift: run · E: interact · M: map' },
  controlsTouch: { tr: 'Sol alttaki joystick ile yürü, butona dokunarak etkileşime geç', en: 'Walk with the joystick, tap the button to interact' },
  interact: { tr: 'İncele', en: 'Inspect' },
  ride: { tr: "ATV'ye bin", en: 'Ride the ATV' },
  dismount: { tr: 'İn', en: 'Get off' },
  firstPerson: { tr: 'Birinci şahıs kamera', en: 'First-person camera' },
  fpClick: { tr: 'Fareyle bakmak için tıkla · V: kamerayı değiştir', en: 'Click to look around with the mouse · V: switch camera' },
  fpLocked: { tr: 'Fare: bak · WASD: yürü · E: incele · Esc: fareyi bırak · V: çık', en: 'Mouse: look · WASD: walk · E: inspect · Esc: release mouse · V: exit' },
  rideHint: { tr: 'Sür: WASD / oklar · Shift: turbo · E: in', en: 'Drive: WASD / arrows · Shift: boost · E: get off' },
  close: { tr: 'Kapat', en: 'Close' },
  travel: { tr: 'Hızlı Seyahat', en: 'Fast Travel' },
  sound: { tr: 'Ses', en: 'Sound' },
  night: { tr: 'Gece / Gündüz', en: 'Day / Night' },
  goals: { tr: 'Gol', en: 'Goals' },
  openRepo: { tr: "GitHub'da aç", en: 'Open on GitHub' },
  openLive: { tr: 'Canlı demo', en: 'Live demo' },
  stars: { tr: 'yıldız', en: 'stars' },
  updated: { tr: 'Son güncelleme', en: 'Last push' },
  underConstruction: { tr: 'Aktif geliştiriliyor', en: 'Under active development' },
  emptyLot: { tr: 'Boş arsa — bir sonraki proje buraya gelecek.', en: 'Empty lot — the next project will be built here.' },
  noDescription: { tr: 'Açıklama eklenmemiş.', en: 'No description yet.' },
  webglMissing: {
    tr: 'Tarayıcın 3D dünyayı çalıştıramıyor, klasik görünümü açtım.',
    en: 'Your browser can’t run the 3D world, so here’s the classic view.',
  },
  contextLost: { tr: 'Grafik bağlamı kayboldu, yeniden yükleniyor…', en: 'Graphics context lost, reloading…' },
  contributions: { tr: 'katkı / son 1 yıl', en: 'contributions / last year' },
} satisfies Record<string, L>

export type UiKey = keyof typeof ui

type Listener = (lang: Lang) => void

/** Tiny reactive language store shared by the world and the DOM UI. */
class I18n {
  private listeners = new Set<Listener>()
  lang: Lang

  constructor() {
    this.lang = detectLang()
    document.documentElement.lang = this.lang
  }

  t(key: UiKey): string {
    return ui[key][this.lang]
  }

  pick(value: L): string {
    return value[this.lang]
  }

  set(lang: Lang) {
    if (lang === this.lang) return
    this.lang = lang
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* storage unavailable */
    }
    this.listeners.forEach((l) => l(lang))
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

function detectLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'tr' || param === 'en') return param
  try {
    const stored = localStorage.getItem('lang')
    if (stored === 'tr' || stored === 'en') return stored
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

export const i18n = new I18n()
