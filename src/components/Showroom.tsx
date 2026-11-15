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
  Copy,
  Info,
  Mail,
  X,
} from 'lucide-react'
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from '../showroom/brandMark'
import {
  CONTACT_EMAIL,
  about,
  companyIntro,
  companyProfile,
  contact,
  findItem,
  findLine,
  hero,
  itemKey,
  legalLinks,
  lines,
  stationOrder,
  type LineId,
  type StationId,
} from '../showroom/content'
import { ShowroomScene, isWebGLAvailable } from '../showroom/ShowroomScene'
import '../showroom.css'

type Mode = 'loading' | 'ready' | 'static'
type Panel = 'info' | 'list' | null

const STORAGE_KEY = 'beyondbrain.inquiry'
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
    return Array.isArray(stored)
      ? stored.filter((key): key is string => typeof key === 'string' && Boolean(findItem(key)))
      : []
  } catch {
    return []
  }
}

function inquiryText(keys: string[]) {
  const rows = keys
    .map((key) => findItem(key))
    .filter((found) => found !== undefined)
    .map(({ line, item }) => `・${line.title}／${item.name}`)
  return [
    '以下について問い合わせます。',
    '',
    ...rows,
    '',
    '会社名：',
    'ご担当者名：',
    'ご希望の数量・納期など：',
  ].join('\n')
}

function mailto(keys: string[] = []) {
  if (keys.length === 0) return `mailto:${CONTACT_EMAIL}`
  const subject = encodeURIComponent('お問い合わせ（BeyondBrain ショールーム）')
  const body = encodeURIComponent(inquiryText(keys))
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
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

function Sheet({
  title,
  anchor,
  onClose,
  children,
}: {
  title: string
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
      <button className="sr-scrim" type="button" aria-label="閉じる" tabIndex={-1} onClick={onClose} />
      <section className="sr-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sr-sheet-head">
          <h2>{title}</h2>
          <button
            ref={closeRef}
            className="sr-icon-button"
            type="button"
            aria-label="閉じる"
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
    <a className="sr-contact" href={mailto()}>
      <Mail size={18} aria-hidden="true" />
      <span>{CONTACT_EMAIL}</span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  )
}

function InfoContent() {
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
          <li key={capability.title}>
            <span>{capability.label}</span>
            <strong>{capability.title}</strong>
            <p>{capability.description}</p>
          </li>
        ))}
      </ul>

      <h3 className="sr-sheet-heading" data-anchor="company">
        会社概要
      </h3>
      <p className="sr-prose">{companyIntro}</p>
      <dl className="sr-profile">
        {companyProfile.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="sr-sheet-heading" data-anchor="contact">
        {contact.title}
      </h3>
      <p className="sr-prose">{contact.text}</p>
      <ContactRow />

      <nav className="sr-legal" aria-label="法務情報">
        {legalLinks.map((link) => (
          <a href={link.href} key={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </nav>
      <p className="sr-copyright">© 2023–2026 BeyondBrain Inc.</p>
    </>
  )
}

/** Every wall and what it shows, as ordinary markup. */
function LineOutline() {
  return (
    <>
      {lines.map((line) => (
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
function StaticCatalogue() {
  return (
    <div className="sr-static">
      <header className="sr-static-head">
        <BrandMark size={30} />
        <span>BeyondBrain</span>
      </header>
      <main>
        <h1 className="sr-hero-title">
          <span className="sr-latin">{hero.titleLatin}</span>
          <span className="sr-mincho">{hero.titleJapanese}</span>
        </h1>
        <p className="sr-hero-lead">{hero.lead}</p>
        <p className="sr-hero-summary">{hero.summary}</p>

        <LineOutline />
        <section className="sr-static-line">
          <InfoContent />
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

  const [mode, setMode] = useState<Mode>('loading')
  const [station, setStation] = useState<StationId>(initial.station ?? 'home')
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
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

  const line = findLine(station)
  const focused = focusKey ? findItem(focusKey) : undefined

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
      const found = current ? findItem(current) : undefined
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
  }, [station, mode])

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
      await navigator.clipboard.writeText(`${CONTACT_EMAIL}\n\n${inquiryText(inquiry)}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  if (mode === 'static') return <StaticCatalogue />

  const ready = mode === 'ready'
  const atHome = station === 'home'
  const arrived = ready && settled === station && !moving
  const showTags = arrived && !focused && !atHome
  const added = focusKey ? inquiry.includes(focusKey) : false
  const overlayOpen = panel !== null

  return (
    <div
      className="showroom"
      data-ready={ready}
      data-focused={Boolean(focused)}
      data-station={station}
    >
      <button
        className="sr-skip"
        type="button"
        onClick={() => navRef.current?.querySelector('button')?.focus()}
      >
        ナビゲーションへスキップ
      </button>

      <div className="sr-stage" ref={mountRef}>
        <canvas ref={canvasRef} className="sr-canvas" aria-hidden="true" />
      </div>

      <div className="sr-loader" aria-hidden={ready}>
        <BrandMark size={44} />
        <span />
      </div>

      <header className="sr-header" inert={overlayOpen}>
        <button className="sr-brand" type="button" onClick={() => navigate('home')}>
          <span className="sr-brand-row">
            <BrandMark size={22} />
            <span>BeyondBrain</span>
          </span>
          <small>バーチャルショールーム</small>
        </button>
        <button
          ref={listButtonRef}
          className="sr-icon-button sr-list-button"
          type="button"
          aria-label={`問い合わせリスト（${inquiry.length}件）`}
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

      <main className="sr-main" inert={overlayOpen}>
        <section
          className="sr-hero"
          aria-labelledby="sr-hero-title"
          data-visible={ready && atHome && settled === 'home' && !focused}
          inert={!atHome}
        >
          <h1 id="sr-hero-title" className="sr-hero-title">
            <span className="sr-latin">{hero.titleLatin}</span>
            <span className="sr-mincho">{hero.titleJapanese}</span>
          </h1>
          <p className="sr-hero-lead">{hero.lead}</p>
          <p className="sr-hero-summary">{hero.summary}</p>
          <div className="sr-actions">
            <button className="sr-button" type="button" onClick={() => navigate('fa-parts')}>
              事業を見る
            </button>
            <button className="sr-link" type="button" onClick={() => openInfo('contact')}>
              まずは話す
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
            <p className="sr-category">{line.category}</p>
            <h2 id="sr-caption-title">
              {line.title}
              {line.status && <span className="sr-status">{line.status}</span>}
            </h2>
            <p className="sr-caption-text">{line.description}</p>
            {line.note && <p className="sr-note">{line.note}</p>}
            {line.site && (
              <a className="sr-link" href={line.site.href} target="_blank" rel="noreferrer">
                {line.site.domain}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            )}
          </section>
        )}

        {ready && line && (
          <ul className="sr-tags" data-visible={showTags} aria-label={`${line.title}の展示`}>
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
                  aria-label="前の展示"
                  onClick={() => stepItem(-1)}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  className="sr-icon-button sr-pager sr-pager-next"
                  type="button"
                  aria-label="次の展示"
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
                aria-label="展示に戻る"
                onClick={() => setFocusKey(null)}
              >
                <X size={17} aria-hidden="true" />
              </button>
              <p className="sr-category">{focused.line.title}</p>
              <h2 id="sr-card-title">{focused.item.name}</h2>
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
                      {justAdded === focusKey ? 'リストに追加しました' : '追加済み（外す）'}
                    </>
                  ) : (
                    '問い合わせリストに追加'
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
        aria-label="展示の切り替え"
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
              {id === 'home' ? 'ホーム' : findLine(id)?.nav}
            </button>
          ))}
        </div>
        <span className="sr-nav-rule" aria-hidden="true" />
        <button
          className="sr-nav-info"
          type="button"
          aria-label="会社情報とお問い合わせ"
          onClick={() => openInfo()}
        >
          <Info size={18} aria-hidden="true" />
        </button>
      </nav>

      {/* The same content as the walls, present in the page for search engines and text tools. */}
      <div hidden>
        <LineOutline />
        <InfoContent />
      </div>

      {panel === 'info' && (
        <Sheet title="BeyondBrainについて" anchor={infoAnchor} onClose={() => setPanel(null)}>
          <InfoContent />
        </Sheet>
      )}

      {panel === 'list' && (
        <Sheet title="問い合わせリスト" onClose={() => setPanel(null)}>
          {inquiry.length === 0 ? (
            <p className="sr-prose">
              まだ何も入っていません。展示を開いて「問い合わせリストに追加」を押すと、ここにまとまります。
            </p>
          ) : (
            <>
              <ul className="sr-inquiry">
                {inquiry.map((key) => {
                  const found = findItem(key)
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
                        aria-label={`${found.item.name}をリストから外す`}
                        onClick={() => setInquiry((keys) => keys.filter((entry) => entry !== key))}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="sr-prose">
                リストの内容を本文に入れたメールを作成します。宛先は {CONTACT_EMAIL} です。
              </p>
              <div className="sr-sheet-actions">
                <a className="sr-button" href={mailto(inquiry)}>
                  <Mail size={17} aria-hidden="true" />
                  メールを作成
                </a>
                <button className="sr-button sr-button-quiet" type="button" onClick={copyInquiry}>
                  {copied ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Copy size={17} aria-hidden="true" />
                  )}
                  {copied ? 'コピーしました' : '内容をコピー'}
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
