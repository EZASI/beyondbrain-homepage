import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy as CopyIcon,
  Info,
  Mail,
  X,
} from 'lucide-react'
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from '../showroom/brandMark'
import {
  CONTACT_EMAIL,
  LANGS,
  LANG_STORAGE_KEY,
  detectLang,
  findItem,
  findLine,
  getCopy,
  itemKey,
  lines,
  stationOrder,
  type Copy,
  type Lang,
  type LineId,
  type StationId,
} from '../showroom/content'
import { ShowroomScene, isWebGLAvailable } from '../showroom/ShowroomScene'
import '../showroom.css'

type Mode = 'loading' | 'ready' | 'static'
type Panel = 'info' | 'list' | null

const STORAGE_KEY = 'beyondbrain.inquiry'
const SITE_URL = 'https://www.beyondxbrain.com/'
const INFO_HASHES = new Set(['about', 'company', 'contact'])
/** Glyphs drawn into the 3D room's screens and signs; requested up front so the fonts are ready. */
const CANVAS_GLYPHS = '攻城バトルRPG定時退社バトロワオフィス・カードゲームタベモどっちが上？子午線'

function readHash(): { station?: StationId; panel?: Panel; anchor?: string } {
  const name = window.location.hash.replace(/^#/, '')
  if (!name) return {}
  if (INFO_HASHES.has(name)) return { panel: 'info', anchor: name }
  if (name === 'operations') return { station: lines[0].id }
  const station = stationOrder.find((id) => id === name)
  return station ? { station } : {}
}

function loadInquiry(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    /* Item keys are the same in every language, so either copy can vouch for them. */
    const known = (key: unknown): key is string =>
      typeof key === 'string' && Boolean(findItem(getCopy('ja'), key))
    return Array.isArray(stored) ? stored.filter(known) : []
  } catch {
    return []
  }
}

function inquiryText(copy: Copy, keys: string[]) {
  const rows = keys
    .map((key) => findItem(copy, key))
    .filter((found) => found !== undefined)
    .map(({ line, item }) => copy.ui.mailRow(line.title, item.name))
  return [copy.ui.mailIntro, '', ...rows, '', ...copy.ui.mailFields].join('\n')
}

function mailto(copy: Copy, keys: string[] = []) {
  if (keys.length === 0) return `mailto:${CONTACT_EMAIL}`
  const subject = encodeURIComponent(copy.ui.mailSubject)
  const body = encodeURIComponent(inquiryText(copy, keys))
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

function setHead(selector: string, attribute: string, value: string) {
  document.head.querySelector(selector)?.setAttribute(attribute, value)
}

function hasLangParam() {
  const value = new URLSearchParams(window.location.search).get('lang')
  return value === 'ja' || value === 'en'
}

/** Keeps the page's own title and description in the language on screen. */
function describePage(copy: Copy) {
  const { lang, meta } = copy
  const other = getCopy(lang === 'ja' ? 'en' : 'ja')
  document.documentElement.lang = lang
  document.title = meta.title
  setHead('meta[name="description"]', 'content', meta.description)
  setHead('meta[property="og:site_name"]', 'content', meta.siteName)
  setHead('meta[property="og:title"]', 'content', meta.ogTitle)
  setHead('meta[property="og:description"]', 'content', meta.ogDescription)
  setHead('meta[property="og:locale"]', 'content', meta.locale)
  setHead('meta[property="og:locale:alternate"]', 'content', other.meta.locale)
  /* A language asked for in the address is a page of its own; the bare address stays the default. */
  const address = hasLangParam() ? `${SITE_URL}?lang=${lang}` : SITE_URL
  setHead('link[rel="canonical"]', 'href', address)
  setHead('meta[property="og:url"]', 'content', address)
}

function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="sr-brand-mark"
      viewBox={BRAND_MARK_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path fill="currentColor" fillRule="evenodd" d={BRAND_MARK_PATH} />
    </svg>
  )
}

/** A dot that travels from the pressed button to the inquiry list, so the visitor sees where it went. */
function flyBetween(from: Element | null, to: Element | null) {
  if (!from || !to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const start = from.getBoundingClientRect()
  const end = to.getBoundingClientRect()
  const dot = document.createElement('span')
  dot.className = 'sr-fly'
  document.body.appendChild(dot)
  const x0 = start.left + start.width / 2
  const y0 = start.top + start.height / 2
  const x1 = end.left + end.width / 2
  const y1 = end.top + end.height / 2
  const lift = Math.min(160, Math.abs(y1 - y0) * 0.35 + 60)
  const animation = dot.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      {
        transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.25)`,
        opacity: 1,
        offset: 0.5,
      },
      { transform: `translate(${x1}px, ${y1}px) scale(0.4)`, opacity: 0.2 },
    ],
    { duration: 640, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' },
  )
  animation.finished.then(
    () => dot.remove(),
    () => dot.remove(),
  )
}

function LanguageSwitch({
  lang,
  label,
  onChange,
}: {
  lang: Lang
  label: string
  onChange: (lang: Lang) => void
}) {
  return (
    <div className="sr-lang" role="group" aria-label={label}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={code === 'ja' ? '日本語' : 'English'}
          aria-pressed={lang === code}
          onClick={() => onChange(code)}
        >
          {code === 'ja' ? 'JP' : 'EN'}
        </button>
      ))}
    </div>
  )
}

function Sheet({
  title,
  closeLabel,
  anchor,
  onClose,
  children,
}: {
  title: string
  closeLabel: string
  /** Section to open at, matched against `data-anchor` inside the sheet. */
  anchor?: string | null
  onClose: () => void
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus({ preventScroll: true })
    if (anchor) {
      bodyRef.current
        ?.querySelector(`[data-anchor="${anchor}"]`)
        ?.scrollIntoView({ block: 'start' })
    }
    return () => previous?.focus({ preventScroll: true })
  }, [anchor])

  return (
    <div className="sr-sheet-layer">
      <button
        className="sr-scrim"
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
      />
      <section className="sr-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sr-sheet-head">
          <h2>{title}</h2>
          <button
            ref={closeRef}
            className="sr-icon-button"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="sr-sheet-body" ref={bodyRef}>
          {children}
        </div>
      </section>
    </div>
  )
}

function ContactRow() {
  return (
    <a className="sr-contact" href={`mailto:${CONTACT_EMAIL}`}>
      <Mail size={18} aria-hidden="true" />
      <span>{CONTACT_EMAIL}</span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  )
}

function InfoContent({ copy }: { copy: Copy }) {
  const { about } = copy
  return (
    <>
      <h3 className="sr-statement">{about.title}</h3>
      <p className="sr-principle">{about.principle}</p>
      {about.body.map((paragraph) => (
        <p className="sr-prose" key={paragraph}>
          {paragraph}
        </p>
      ))}
      <ul className="sr-capabilities">
        {about.capabilities.map((capability) => (
          <li key={capability.label}>
            <span>{capability.label}</span>
            <strong>{capability.title}</strong>
            <p>{capability.description}</p>
          </li>
        ))}
      </ul>

      <h3 className="sr-sheet-heading" data-anchor="company">
        {copy.companyHeading}
      </h3>
      <p className="sr-prose">{copy.companyIntro}</p>
      <dl className="sr-profile">
        {copy.companyProfile.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {typeof row.value === 'string'
                ? row.value
                : row.value.map((phrase) => (
                    <span className="sr-phrase" key={phrase}>
                      {phrase}{' '}
                    </span>
                  ))}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="sr-sheet-heading" data-anchor="contact">
        {copy.contact.title}
      </h3>
      <p className="sr-prose">{copy.contact.text}</p>
      <ContactRow />

      <nav className="sr-legal" aria-label={copy.legalLabel}>
        {copy.legalLinks.map((link) => (
          <a href={link.href} key={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </nav>
      {copy.legalNote && <p className="sr-legal-note">{copy.legalNote}</p>}
      <p className="sr-copyright">© 2023–2026 BeyondBrain Inc.</p>
    </>
  )
}

/** Every wall and what it shows, as ordinary markup. */
function LineOutline({ copy }: { copy: Copy }) {
  return (
    <>
      {copy.lines.map((line) => (
        <section className="sr-static-line" key={line.id}>
          <p className="sr-category">{line.category}</p>
          <h2>
            {line.title}
            {line.status && <span className="sr-status">{line.status}</span>}
          </h2>
          <p className="sr-prose">{line.description}</p>
          {line.note && <p className="sr-note">{line.note}</p>}
          <ul>
            {line.items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                {item.original && <span lang="ja">{item.original}</span>}
                {item.kind && <span>{item.kind}</span>}
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
          {line.site && (
            <a className="sr-link" href={line.site.href} target="_blank" rel="noreferrer">
              {line.site.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
        </section>
      ))}
    </>
  )
}

/** The whole site as a plain page, for browsers that cannot draw the 3D room. */
function StaticCatalogue({
  copy,
  onLang,
}: {
  copy: Copy
  onLang: (lang: Lang) => void
}) {
  const { hero } = copy
  return (
    <div className="sr-static" lang={copy.lang}>
      <header className="sr-static-head">
        <BrandMark size={30} />
        <span>BeyondBrain</span>
        <LanguageSwitch lang={copy.lang} label={copy.ui.language} onChange={onLang} />
      </header>
      <main>
        <h1 className="sr-hero-title">
          <span className="sr-latin">{hero.first}</span>
          <span className="sr-mincho">{hero.second}</span>
        </h1>
        <p className="sr-hero-lead">{hero.lead}</p>
        <p className="sr-hero-summary">{hero.summary}</p>

        <LineOutline copy={copy} />
        <section className="sr-static-line">
          <InfoContent copy={copy} />
        </section>
      </main>
    </div>
  )
}

export default function Showroom() {
  const [initial] = useState(readHash)
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ShowroomScene | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const listButtonRef = useRef<HTMLButtonElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  const [lang, setLang] = useState<Lang>(detectLang)
  const copy = getCopy(lang)
  const { hero, ui } = copy

  const [mode, setMode] = useState<Mode>('loading')
  const [station, setStation] = useState<StationId>(initial.station ?? 'home')
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  /** The visitor is turning the room by hand. */
  const [grabbed, setGrabbed] = useState(false)
  /** The wall the camera last came to rest at; copy for a wall waits until it is reached. */
  const [settled, setSettled] = useState<StationId>(initial.station ?? 'home')
  const [panel, setPanel] = useState<Panel>(initial.panel ?? null)
  const [infoAnchor, setInfoAnchor] = useState<string | null>(initial.anchor ?? null)
  const [inquiry, setInquiry] = useState<string[]>(loadInquiry)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const stationRef = useRef(station)
  const focusRef = useRef(focusKey)
  useEffect(() => {
    stationRef.current = station
    focusRef.current = focusKey
  }, [station, focusKey])

  const line = findLine(copy, station)
  const focused = focusKey ? findItem(copy, focusKey) : undefined

  const changeLang = useCallback((next: Lang) => {
    setLang(next)
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      /* The choice still holds for this visit. */
    }
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', next)
      window.history.replaceState(null, '', url)
    } catch {
      /* Sandboxed frames may refuse history changes. */
    }
  }, [])

  useEffect(() => {
    describePage(copy)
  }, [copy])

  const openInfo = useCallback((anchor: string | null = null) => {
    setInfoAnchor(anchor)
    setPanel('info')
  }, [])

  const navigate = useCallback((id: StationId) => {
    setFocusKey(null)
    setStation(id)
  }, [])

  const stepStation = useCallback((step: 1 | -1) => {
    setFocusKey(null)
    setStation((current) => {
      const index = stationOrder.indexOf(current) + step
      return stationOrder[clampIndex(index, stationOrder.length)]
    })
  }, [])

  const stepItem = useCallback((step: 1 | -1) => {
    setFocusKey((current) => {
      const found = current ? findItem(getCopy('ja'), current) : undefined
      if (!found) return current
      const { items } = found.line
      const index = (items.indexOf(found.item) + step + items.length) % items.length
      return itemKey(found.line, items[index])
    })
  }, [])

  /* Start the 3D room once the fonts it draws with are available. */
  useEffect(() => {
    const mount = mountRef.current
    const canvas = canvasRef.current
    if (!mount || !canvas) return
    let cancelled = false
    let scene: ShowroomScene | null = null

    const start = () => {
      if (cancelled) return
      if (!isWebGLAvailable()) {
        setMode('static')
        return
      }
      try {
        scene = new ShowroomScene(mount, canvas, {
          onReady: () => undefined,
          onHover: setHoverKey,
          onPickItem: setFocusKey,
          onPickStation: (id: LineId) => {
            setFocusKey(null)
            setStation(id)
          },
          onBackground: () => setFocusKey(null),
          onMotion: (active) => {
            setMoving(active)
            if (!active) setSettled(stationRef.current)
          },
          onSwipe: (step) => {
            if (focusRef.current) stepItem(step)
            else stepStation(step)
          },
          onGrab: setGrabbed,
          onTurn: (id) => {
            stationRef.current = id
            setFocusKey(null)
            setStation(id)
          },
        })
        sceneRef.current = scene
        scene.goTo(stationRef.current, true)
        setMode('ready')
        scene.enter()
      } catch {
        scene?.dispose()
        scene = null
        sceneRef.current = null
        setMode('static')
      }
    }

    const fonts = document.fonts
      ? Promise.all([
          document.fonts.load('750 40px Manrope', 'BeyondBrain'),
          document.fonts.load('800 40px Manrope', 'KAMIHIKI 0123456789'),
          document.fonts.load('700 40px "Zen Kaku Gothic New"', CANVAS_GLYPHS),
          document.fonts.load('600 40px "Shippori Mincho"', CANVAS_GLYPHS),
        ])
      : Promise.resolve([])
    const patience = new Promise((resolve) => window.setTimeout(resolve, 2200))
    Promise.race([fonts, patience]).then(start, start)

    return () => {
      cancelled = true
      scene?.dispose()
      sceneRef.current = null
    }
  }, [stepItem, stepStation])

  useEffect(() => {
    sceneRef.current?.goTo(station)
  }, [station])

  useEffect(() => {
    sceneRef.current?.focus(focusKey)
  }, [focusKey])

  /* Keyboard focus follows the visitor into an item's card and back to its tag. */
  const lastFocusKey = useRef<string | null>(null)
  useEffect(() => {
    if (focusKey) {
      lastFocusKey.current = focusKey
      cardRef.current?.focus({ preventScroll: true })
      return
    }
    const previous = lastFocusKey.current
    lastFocusKey.current = null
    if (!previous) return
    const tag = document.querySelector<HTMLElement>(`[data-tag="${previous}"]`)
    tag?.focus({ preventScroll: true })
  }, [focusKey])

  /* Keep the address in step with the wall on view, and follow it when it changes. */
  useEffect(() => {
    const target = station === 'home' ? '' : `#${station}`
    if (window.location.hash === target) return
    try {
      window.history.replaceState(
        null,
        '',
        target || window.location.pathname + window.location.search,
      )
    } catch {
      /* Sandboxed frames may refuse history changes; navigation still works. */
    }
  }, [station])

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash()
      if (next.panel) openInfo(next.anchor)
      if (next.station) navigate(next.station)
      else if (!next.panel && !window.location.hash) navigate('home')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [navigate, openInfo])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Escape') {
        if (panel) setPanel(null)
        else if (focusKey) setFocusKey(null)
        return
      }
      if (panel) return
      const target = event.target
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      const step = event.key === 'ArrowRight' ? 1 : -1
      if (focusKey) stepItem(step)
      else stepStation(step)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusKey, panel, stepItem, stepStation])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiry))
    } catch {
      /* The list still works for this visit without storage. */
    }
  }, [inquiry])

  /* Tell the room how much floor the opening copy stands on, whenever that changes. */
  useLayoutEffect(() => {
    const main = mainRef.current
    const hero = heroRef.current
    if (!main || !hero || mode !== 'ready') return
    const report = () => sceneRef.current?.setHomeCopy(main.clientHeight - hero.offsetTop)
    report()
    const observer = new ResizeObserver(report)
    observer.observe(hero)
    observer.observe(main)
    return () => observer.disconnect()
  }, [mode])

  /* Slide the dark pill under the active navigation item. */
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const active = track.querySelector<HTMLElement>('[aria-current="true"]')
      const marker = thumbRef.current
      if (!active || !marker) return
      marker.style.width = `${active.offsetWidth}px`
      marker.style.transform = `translateX(${active.offsetLeft}px)`
      const overflow = track.scrollWidth - track.clientWidth
      if (overflow > 0) {
        const centre = active.offsetLeft + active.offsetWidth / 2 - track.clientWidth / 2
        track.scrollTo({ left: Math.max(0, Math.min(overflow, centre)), behavior: 'smooth' })
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [station, mode, lang])

  const toggleInquiry = (key: string, origin: Element | null) => {
    if (inquiry.includes(key)) {
      setInquiry((keys) => keys.filter((entry) => entry !== key))
      return
    }
    setInquiry((keys) => [...keys, key])
    setJustAdded(key)
    flyBetween(origin, listButtonRef.current)
    window.setTimeout(() => setJustAdded((current) => (current === key ? null : current)), 1800)
  }

  const copyInquiry = async () => {
    try {
      await navigator.clipboard.writeText(`${CONTACT_EMAIL}\n\n${inquiryText(copy, inquiry)}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  if (mode === 'static') return <StaticCatalogue copy={copy} onLang={changeLang} />

  const ready = mode === 'ready'
  const atHome = station === 'home'
  const arrived = ready && settled === station && !moving
  const showTags = arrived && !focused && !atHome
  const added = focusKey ? inquiry.includes(focusKey) : false
  const overlayOpen = panel !== null

  return (
    <div
      className="showroom"
      lang={lang}
      data-ready={ready}
      data-focused={Boolean(focused)}
      data-station={station}
    >
      <button
        className="sr-skip"
        type="button"
        onClick={() => navRef.current?.querySelector('button')?.focus()}
      >
        {ui.skip}
      </button>

      <div className="sr-stage" ref={mountRef}>
        <canvas ref={canvasRef} className="sr-canvas" aria-hidden="true" />
      </div>

      <div className="sr-loader" aria-hidden={ready}>
        <BrandMark size={44} />
        <span />
      </div>

      <header className="sr-header" inert={overlayOpen}>
        <LanguageSwitch lang={lang} label={ui.language} onChange={changeLang} />
        <button className="sr-brand" type="button" onClick={() => navigate('home')}>
          <span className="sr-brand-row">
            <BrandMark size={22} />
            <span>BeyondBrain</span>
          </span>
          <small>{ui.tagline}</small>
        </button>
        <button
          ref={listButtonRef}
          className="sr-icon-button sr-list-button"
          type="button"
          aria-label={ui.listCount(inquiry.length)}
          onClick={() => setPanel('list')}
        >
          <ClipboardList size={19} aria-hidden="true" />
          {inquiry.length > 0 && (
            <b key={inquiry.length} aria-hidden="true">
              {inquiry.length}
            </b>
          )}
        </button>
      </header>

      <main className="sr-main" ref={mainRef} inert={overlayOpen}>
        <section
          ref={heroRef}
          className="sr-hero"
          aria-labelledby="sr-hero-title"
          data-visible={ready && atHome && settled === 'home' && !focused && !grabbed}
          inert={!atHome}
        >
          <h1 id="sr-hero-title" className="sr-hero-title">
            <span className="sr-latin">{hero.first}</span>
            <span className="sr-mincho">{hero.second}</span>
          </h1>
          <p className="sr-hero-lead">{hero.lead}</p>
          <p className="sr-hero-summary">{hero.summary}</p>
          <div className="sr-actions">
            <button className="sr-button" type="button" onClick={() => navigate('fa-parts')}>
              {hero.primary}
            </button>
            <button className="sr-link" type="button" onClick={() => openInfo('contact')}>
              {hero.secondary}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        {line && (
          <section
            className="sr-caption"
            key={line.id}
            aria-labelledby="sr-caption-title"
            data-visible={arrived && !focused}
            inert={Boolean(focused)}
          >
            <div className="sr-caption-head">
              <p className="sr-category">{line.category}</p>
              <h2 id="sr-caption-title">
                {line.title}
                {line.status && <span className="sr-status">{line.status}</span>}
              </h2>
            </div>
            <div className="sr-caption-body">
              <p className="sr-caption-text">{line.description}</p>
              {line.note && <p className="sr-note">{line.note}</p>}
              {line.site && (
                <a className="sr-link" href={line.site.href} target="_blank" rel="noreferrer">
                  {line.site.domain}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
            </div>
          </section>
        )}

        {ready && line && (
          <ul className="sr-tags" data-visible={showTags} aria-label={ui.itemsOn(line.title)}>
            {line.items.map((item) => {
              const key = itemKey(line, item)
              return (
                <li
                  key={key}
                  ref={(element) => {
                    sceneRef.current?.setTag(key, element)
                    return () => sceneRef.current?.setTag(key, null)
                  }}
                >
                  <button
                    className="sr-tag"
                    type="button"
                    data-active={hoverKey === key}
                    data-tag={key}
                    tabIndex={showTags ? 0 : -1}
                    onClick={() => setFocusKey(key)}
                  >
                    {item.name}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {focused && (
          <>
            {focused.line.items.length > 1 && (
              <>
                <button
                  className="sr-icon-button sr-pager sr-pager-prev"
                  type="button"
                  aria-label={ui.previous}
                  onClick={() => stepItem(-1)}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  className="sr-icon-button sr-pager sr-pager-next"
                  type="button"
                  aria-label={ui.next}
                  onClick={() => stepItem(1)}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </>
            )}
            <aside
              ref={cardRef}
              className="sr-card"
              aria-labelledby="sr-card-title"
              tabIndex={-1}
              key={focusKey}
            >
              <button
                className="sr-icon-button sr-card-close"
                type="button"
                aria-label={ui.back}
                onClick={() => setFocusKey(null)}
              >
                <X size={17} aria-hidden="true" />
              </button>
              {/* A wall with one thing on it would otherwise say its name twice. */}
              <p className="sr-category">
                {focused.item.name === focused.line.title
                  ? focused.line.category
                  : focused.line.title}
              </p>
              <h2 id="sr-card-title">{focused.item.name}</h2>
              {focused.item.original && (
                <p className="sr-card-original" lang="ja">
                  {focused.item.original}
                </p>
              )}
              {(focused.item.kind || focused.item.status) && (
                <p className="sr-card-meta">
                  {focused.item.kind && <span>{focused.item.kind}</span>}
                  {focused.item.status && <span className="sr-status">{focused.item.status}</span>}
                </p>
              )}
              <p className="sr-card-text">{focused.item.summary}</p>
              {focused.item.facts && (
                <ul className="sr-facts">
                  {focused.item.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              )}
              {focused.line.note && <p className="sr-note">{focused.line.note}</p>}
              <div className="sr-card-actions">
                <button
                  className="sr-button"
                  type="button"
                  data-added={added}
                  aria-pressed={added}
                  onClick={(event) => focusKey && toggleInquiry(focusKey, event.currentTarget)}
                >
                  {added ? (
                    <>
                      <Check size={17} aria-hidden="true" />
                      {justAdded === focusKey ? ui.added : ui.addedRemove}
                    </>
                  ) : (
                    ui.add
                  )}
                </button>
                {focused.line.site && (
                  <a
                    className="sr-link"
                    href={focused.line.site.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {focused.line.site.label}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                )}
              </div>
            </aside>
          </>
        )}
      </main>

      <nav
        ref={navRef}
        className="sr-nav"
        aria-label={ui.walls}
        inert={overlayOpen}
      >
        <div className="sr-nav-track" ref={trackRef}>
          <span ref={thumbRef} className="sr-nav-thumb" aria-hidden="true" />
          {stationOrder.map((id) => (
            <button
              key={id}
              type="button"
              aria-current={station === id ? 'true' : undefined}
              onClick={() => navigate(id)}
            >
              {id === 'home' ? ui.home : findLine(copy, id)?.nav}
            </button>
          ))}
        </div>
        <span className="sr-nav-rule" aria-hidden="true" />
        <button
          className="sr-nav-info"
          type="button"
          aria-label={ui.info}
          onClick={() => openInfo()}
        >
          <Info size={18} aria-hidden="true" />
        </button>
      </nav>

      {/* The same content as the walls, present in the page for search engines and text tools. */}
      <div hidden>
        <LineOutline copy={copy} />
        <InfoContent copy={copy} />
      </div>

      {panel === 'info' && (
        <Sheet
          title={ui.aboutTitle}
          closeLabel={ui.close}
          anchor={infoAnchor}
          onClose={() => setPanel(null)}
        >
          <InfoContent copy={copy} />
        </Sheet>
      )}

      {panel === 'list' && (
        <Sheet title={ui.list} closeLabel={ui.close} onClose={() => setPanel(null)}>
          {inquiry.length === 0 ? (
            <p className="sr-prose">{ui.emptyList}</p>
          ) : (
            <>
              <ul className="sr-inquiry">
                {inquiry.map((key) => {
                  const found = findItem(copy, key)
                  if (!found) return null
                  return (
                    <li key={key}>
                      <span>
                        <small>{found.line.title}</small>
                        {found.item.name}
                      </span>
                      <button
                        className="sr-icon-button"
                        type="button"
                        aria-label={ui.remove(found.item.name)}
                        onClick={() => setInquiry((keys) => keys.filter((entry) => entry !== key))}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="sr-prose">{ui.listHint(CONTACT_EMAIL)}</p>
              <div className="sr-sheet-actions">
                <a className="sr-button" href={mailto(copy, inquiry)}>
                  <Mail size={17} aria-hidden="true" />
                  {ui.compose}
                </a>
                <button className="sr-button sr-button-quiet" type="button" onClick={copyInquiry}>
                  {copied ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <CopyIcon size={17} aria-hidden="true" />
                  )}
                  {copied ? ui.copied : ui.copy}
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  )
}

function clampIndex(index: number, length: number) {
  return Math.min(length - 1, Math.max(0, index))
}
