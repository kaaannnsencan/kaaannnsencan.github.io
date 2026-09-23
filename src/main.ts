import './ui/styles.css'
import { Sfx } from './audio/Sfx'
import { i18n } from './content/i18n'
import { loadGithub, type GithubSnapshot } from './data/github'
import { renderClassic } from './fallback/Classic'
import { loadPlayerSheet } from './player/Player'
import { paintCharacterSheet } from './player/SpriteFactory'

const $ = (id: string) => document.getElementById(id)!

const loader = $('loader')
const loaderBar = $('loader-bar')
const loaderText = $('loader-text')
const startBtn = $('btn-start') as HTMLButtonElement
const skipBtn = $('btn-skip') as HTMLButtonElement
const app = $('app')
const classicRoot = $('classic')

function progress(p: number) {
  loaderBar.style.width = `${Math.round(p * 100)}%`
}

let loaded = false

function localizeLoader() {
  loaderText.textContent = i18n.t(loaded ? 'ready' : 'loading')
  startBtn.textContent = i18n.t('start')
  skipBtn.textContent = i18n.t('classic')
}

function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

async function boot() {
  localizeLoader()
  i18n.onChange(localizeLoader)
  // the loader shows the same procedural character that walks around the world
  const sprite = $('loader-sprite')
  sprite.style.backgroundImage = `url(${paintCharacterSheet().toDataURL()})`

  const params = new URLSearchParams(location.search)
  const wantsClassic = params.has('classic') || location.hash === '#classic'
  const webgl = hasWebGL2()

  let github: GithubSnapshot = { generatedAt: null, user: null, repos: [], contributions: null }
  let classic: ReturnType<typeof renderClassic> | null = null
  let experience: import('./core/Experience').Experience | null = null
  const sfx = new Sfx()

  const showClassic = (notice?: string) => {
    experience?.stop()
    app.hidden = true
    loader.classList.add('done')
    loader.hidden = true
    document.body.classList.remove('world-mode')
    classicRoot.hidden = false
    if (!classic)
      classic = renderClassic(classicRoot, github, {
        canReturn: webgl,
        notice,
        onReturn: () => {
          if (!experience) return location.assign(location.pathname)
          sfx.unlock()
          classicRoot.hidden = true
          app.hidden = false
          document.body.classList.add('world-mode')
          window.scrollTo(0, 0)
          experience.resize()
          experience.start()
          history.replaceState(null, '', location.pathname)
        },
      })
    else classic.redraw()
    window.scrollTo(0, 0)
    if (location.hash !== '#classic') history.replaceState(null, '', '#classic')
  }

  skipBtn.addEventListener('click', () => showClassic())

  progress(0.1)
  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))])
  github = await loadGithub()
  progress(0.45)

  if (!webgl) return showClassic(i18n.t('webglMissing'))
  if (wantsClassic) {
    showClassic()
    // still build the world lazily so "back to world" is instant
  }

  try {
    const [{ Experience }, sheet] = await Promise.all([import('./core/Experience'), loadPlayerSheet(), fonts])
    progress(0.75)
    // let the progress bar paint before the (synchronous) world build
    // (setTimeout, not rAF: rAF never fires in background tabs and would stall the boot)
    await new Promise((r) => setTimeout(r, 30))
    app.hidden = false
    experience = new Experience($('world') as HTMLCanvasElement, github, sheet, sfx, () => showClassic())
    experience.onFatal = () => showClassic(i18n.t('contextLost'))
    if (import.meta.env.DEV) Object.assign(window, { __exp: experience })
    progress(1)

    if (wantsClassic) {
      app.hidden = true
      return
    }

    loaded = true
    localizeLoader()
    startBtn.hidden = false
    startBtn.focus()
    // dev-only hooks for automated visual checks: ?autostart&panel=about&map&night
    if (import.meta.env.DEV && params.has('autostart')) {
      queueMicrotask(() => {
        startBtn.click()
        const e = experience!
        e.ui.closePanel()
        const panel = params.get('panel')
        if (panel) e.ui.openPanel({ kind: panel, id: params.get('id') ?? undefined })
        if (params.has('map')) e.ui.toggleMap(true)
        if (params.has('night')) e.world.env.toggle()
      })
    }
    startBtn.addEventListener(
      'click',
      () => {
        sfx.unlock()
        loader.classList.add('done')
        setTimeout(() => (loader.hidden = true), 450)
        document.body.classList.add('world-mode')
        experience!.resize()
        experience!.start()
        let visited = false
        try {
          visited = localStorage.getItem('visited') === '1'
          localStorage.setItem('visited', '1')
        } catch {
          /* ignore */
        }
        if (!visited) experience!.ui.openPanel({ kind: 'welcome' }, false)
      },
      { once: true },
    )
  } catch (err) {
    console.error('[world] failed to start, falling back to classic view', err)
    showClassic(i18n.t('webglMissing'))
  }
}

boot().catch((err) => {
  console.error(err)
  loaderText.textContent = 'Something went wrong — please reload.'
})
