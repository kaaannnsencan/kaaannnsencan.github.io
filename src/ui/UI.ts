import { i18n } from '../content/i18n'
import { profile } from '../content/profile'
import type { GithubSnapshot } from '../data/github'
import { roundedRectSdf } from '../world/Collision'
import type { PanelRequest } from '../world/kit'
import { ISLAND, PATHS, TRAVEL, type TravelId } from '../world/layout'
import { icon } from './icons'
import { renderDeck, warmCardArt, warmDecks } from './cards'
import { renderPanel } from './panels'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

export interface UIHooks {
  travel: (id: TravelId) => void
  toggleNight: () => boolean
  toggleSound: () => boolean
  isMuted: () => boolean
  isNight: () => boolean
  showClassic: () => void
  sfx: (name: string) => void
}

/** All DOM UI on top of the canvas: HUD, panels, prompt, map, minimap, toasts. */
export class UI {
  readonly panel = $('panel')
  private panelTitle = $('panel-title')
  private panelBody = $('panel-body')
  private deck = $('deck')
  private prompt = $('prompt')
  private promptText = this.prompt.querySelector('span')!
  private hint = $('hint')
  private map = $('map')
  private toastEl = $('toast')
  private actionBtn = $('btn-action')
  private minimap = $<HTMLCanvasElement>('minimap')
  private mapCanvas = $<HTMLCanvasElement>('map-canvas')
  private mapBase: HTMLCanvasElement | null = null
  private current: PanelRequest | null = null
  private toastTimer = 0
  private lastFocus: HTMLElement | null = null

  constructor(private github: GithubSnapshot, private hooks: UIHooks) {
    $('panel-close').innerHTML = icon('close')
    $('map-close').innerHTML = icon('close')
    $('btn-map').innerHTML = icon('map')
    $('btn-classic').innerHTML = icon('page')

    $('deck-close').innerHTML = icon('close')
    $('deck-close').addEventListener('click', () => this.closePanel())
    $('panel-close').addEventListener('click', () => this.closePanel())
    $('map-close').addEventListener('click', () => this.toggleMap(false))
    $('btn-map').addEventListener('click', () => this.toggleMap())
    this.minimap.addEventListener('click', () => this.toggleMap(true))
    $('btn-classic').addEventListener('click', () => hooks.showClassic())
    $('btn-lang').addEventListener('click', () => {
      i18n.set(i18n.lang === 'tr' ? 'en' : 'tr')
      hooks.sfx('select')
    })
    $('btn-night').addEventListener('click', () => {
      hooks.toggleNight()
      this.syncButtons()
    })
    $('btn-sound').addEventListener('click', () => {
      hooks.toggleSound()
      this.syncButtons()
    })
    this.map.addEventListener('click', (e) => {
      if (e.target === this.map) this.toggleMap(false)
    })

    // delegated actions inside panels / map
    const delegate = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-travel],[data-open],[data-copy]')
      if (!t) return
      if (t.dataset.travel) {
        this.toggleMap(false)
        this.closePanel()
        hooks.travel(t.dataset.travel as TravelId)
      } else if (t.dataset.open) this.openPanel({ kind: t.dataset.open })
      else if (t.dataset.copy) this.copy(t.dataset.copy)
    }
    this.panelBody.addEventListener('click', delegate)
    $('map-list').addEventListener('click', delegate)

    i18n.onChange(() => this.localize())
    this.localize()
    warmCardArt()
    warmDecks()
  }

  localize() {
    const L = i18n.lang
    $('hud-role').textContent = profile.role[L]
    $('btn-lang').textContent = L === 'tr' ? 'EN' : 'TR'
    $('btn-lang').setAttribute('aria-label', L === 'tr' ? 'Switch to English' : 'Türkçeye geç')
    $('btn-map').setAttribute('aria-label', i18n.t('travel'))
    $('btn-map').title = `${i18n.t('travel')} (M)`
    $('btn-classic').setAttribute('aria-label', i18n.t('classic'))
    $('btn-classic').title = i18n.t('classic')
    $('panel-close').setAttribute('aria-label', i18n.t('close'))
    $('deck-close').setAttribute('aria-label', i18n.t('close'))
    $('map-close').setAttribute('aria-label', i18n.t('close'))
    $('map-title').textContent = i18n.t('travel')
    this.hint.textContent = matchMedia('(pointer: coarse)').matches ? i18n.t('controlsTouch') : i18n.t('controlsDesktop')
    this.promptText.textContent = i18n.t('interact')
    $('map-list').innerHTML = TRAVEL.map(
      (t) => `<li><button class="btn" data-travel="${t.id}"><span class="swatch" style="background:${t.color}"></span>${t.name[L]}</button></li>`,
    ).join('')
    this.syncButtons()
    if (this.current) this.openPanel(this.current, false)
  }

  syncButtons() {
    const night = this.hooks.isNight()
    const muted = this.hooks.isMuted()
    const n = $('btn-night')
    n.innerHTML = icon(night ? 'moon' : 'sun')
    n.setAttribute('aria-label', i18n.t('night'))
    n.title = `${i18n.t('night')} (N)`
    const s = $('btn-sound')
    s.innerHTML = icon(muted ? 'mute' : 'sound')
    s.setAttribute('aria-label', i18n.t('sound'))
    s.setAttribute('aria-pressed', String(!muted))
    s.title = i18n.t('sound')
  }

  get panelOpen() {
    return this.current !== null
  }

  get panelKind() {
    return this.current?.kind ?? null
  }

  openPanel(req: PanelRequest, sound = true) {
    const firstOpen = this.current === null
    if (req.kind === 'cards') {
      // village chapters show as a hand of game cards instead of the side panel
      const deck = renderDeck(req.id ?? '')
      this.current = req
      this.panel.hidden = true
      $('deck-title').textContent = deck.title
      $('deck-intro').textContent = deck.intro
      $('deck-cards').replaceChildren(...deck.nodes)
      $('deck-cards').scrollLeft = 0
      this.deck.hidden = false
      if (firstOpen) this.lastFocus = document.activeElement as HTMLElement | null
      if (sound) this.hooks.sfx('open')
      // focusing forces a synchronous layout; let the first frame paint first
      requestAnimationFrame(() => ($('deck-close') as HTMLButtonElement).focus({ preventScroll: true }))
      return
    }
    this.deck.hidden = true
    const view = renderPanel(req, this.github)
    this.current = req
    this.panel.style.setProperty('--accent', view.accent)
    this.panelTitle.textContent = view.title
    this.panelBody.innerHTML = view.html
    this.panelBody.scrollTop = 0
    this.panel.hidden = false
    if (firstOpen) this.lastFocus = document.activeElement as HTMLElement | null
    if (sound) this.hooks.sfx('open')
    // move focus into the dialog for keyboard / screen-reader users, without scrolling the page
    ;($('panel-close') as HTMLButtonElement).focus({ preventScroll: true })
  }

  closePanel() {
    if (!this.current) return
    this.current = null
    this.panel.hidden = true
    this.deck.hidden = true
    this.hooks.sfx('close')
    ;(this.lastFocus && document.contains(this.lastFocus) ? this.lastFocus : $('world')).focus({ preventScroll: true })
  }

  toggleMap(force?: boolean) {
    const show = force ?? this.map.hidden
    this.map.hidden = !show
    if (show) {
      this.hooks.sfx('select')
      ;(this.map.querySelector('[data-travel]') as HTMLElement | null)?.focus({ preventScroll: true })
    } else $('world').focus({ preventScroll: true })
  }

  get mapOpen() {
    return !this.map.hidden
  }

  setPrompt(screen: { x: number; y: number } | null, label?: string) {
    // the touch action button mirrors the prompt ("İncele", "ATV'ye bin", "İn")
    const action = label ?? ''
    if (this.actionBtn.textContent !== (action || 'E')) this.actionBtn.textContent = action || 'E'
    this.actionBtn.classList.toggle('ready', !!label)
    this.actionBtn.classList.toggle('wide', action.length > 2)
    if (!screen) {
      this.prompt.hidden = true
      return
    }
    this.prompt.hidden = false
    if (label && this.promptText.textContent !== label) this.promptText.textContent = label
    this.prompt.style.left = `${Math.round(screen.x)}px`
    this.prompt.style.top = `${Math.round(screen.y)}px`
  }

  setGameHud(text: string | null) {
    const el = $('game-hud')
    if (text === null) {
      el.hidden = true
      return
    }
    el.hidden = false
    if (el.textContent !== text) el.textContent = text
  }

  fadeHint() {
    setTimeout(() => this.hint.classList.add('fade'), 5000)
  }

  toast(text: string) {
    this.toastEl.textContent = text
    this.toastEl.classList.add('show')
    clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1800)
  }

  private async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      this.toast(i18n.lang === 'tr' ? 'Kopyalandı!' : 'Copied!')
    } catch {
      this.toast(text)
    }
  }

  // ------------------------------------------------------------ maps

  private paintMapBase(): HTMLCanvasElement {
    if (this.mapBase) return this.mapBase
    const { halfW, halfH, radius } = ISLAND
    const s = 2 // px per unit
    const c = document.createElement('canvas')
    c.width = (halfW * 2 + 16) * s
    c.height = (halfH * 2 + 16) * s
    const g = c.getContext('2d')!
    g.fillStyle = '#2a5d9f'
    g.fillRect(0, 0, c.width, c.height)
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const wx = x / s - halfW - 8
        const wz = y / s - halfH - 8
        const d = roundedRectSdf(wx, wz, halfW, halfH, radius)
        if (d < 0) {
          g.fillStyle = d > -1.5 ? '#f0dca0' : '#63ab3f'
          g.fillRect(x, y, 1, 1)
        }
      }
    g.fillStyle = '#e4c590'
    for (const path of PATHS)
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, az] = path[i]
        const [bx, bz] = path[i + 1]
        const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * s
        for (let k = 0; k <= steps; k++) {
          const wx = ax + ((bx - ax) * k) / steps
          const wz = az + ((bz - az) * k) / steps
          g.fillRect(Math.round((wx + halfW + 8) * s) - 3, Math.round((wz + halfH + 8) * s) - 3, 6, 6)
        }
      }
    for (const t of TRAVEL) {
      g.fillStyle = '#1a1420'
      g.fillRect(Math.round((t.x + halfW + 8) * s) - 6, Math.round((t.z + halfH + 8) * s) - 12, 12, 12)
      g.fillStyle = t.color
      g.fillRect(Math.round((t.x + halfW + 8) * s) - 4, Math.round((t.z + halfH + 8) * s) - 10, 8, 8)
    }
    this.mapBase = c
    return c
  }

  drawMaps(px: number, pz: number, time: number) {
    const base = this.paintMapBase()
    const s = 2
    const mx = (px + ISLAND.halfW + 8) * s
    const mz = (pz + ISLAND.halfH + 8) * s
    const blink = Math.floor(time * 3) % 2 === 0
    const draw = (canvas: HTMLCanvasElement) => {
      const g = canvas.getContext('2d')!
      g.imageSmoothingEnabled = false
      g.drawImage(base, 0, 0, canvas.width, canvas.height)
      const kx = canvas.width / base.width
      const kz = canvas.height / base.height
      g.fillStyle = '#1a1420'
      g.fillRect(Math.round(mx * kx) - 4, Math.round(mz * kz) - 4, 8, 8)
      g.fillStyle = blink ? '#ffffff' : '#f2c14e'
      g.fillRect(Math.round(mx * kx) - 2, Math.round(mz * kz) - 2, 4, 4)
    }
    if (this.minimap.offsetParent !== null) draw(this.minimap)
    if (!this.map.hidden) draw(this.mapCanvas)
  }
}
