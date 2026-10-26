import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Mail,
  Menu,
  X,
} from 'lucide-react'
import NeuralCanvas from '../components/NeuralCanvas'
import '../App.css'

const operations = [
  {
    category: 'GLOBAL TRADE',
    title: 'Tokyo Beyond Wholesale',
    description: '日本の製品を、東京から海外の棚へ卸す。',
    domain: 'wholesale.beyondxbrain.com',
    href: 'https://wholesale.beyondxbrain.com/',
  },
  {
    category: 'SOFTWARE',
    title: 'Game Centre',
    description: '自社でつくったゲームとアプリ。',
    domain: 'gamecentre.beyondxbrain.com',
    href: 'https://gamecentre.beyondxbrain.com/',
  },
  {
    category: 'INFRASTRUCTURE',
    title: 'BeyondBrain Server Parts',
    description: 'サーバー関連部品の供給事業。',
    domain: 'serverparts.beyondxbrain.com',
    href: 'https://www.serverparts.beyondxbrain.com/',
  },
  {
    category: 'FACTORY AUTOMATION',
    title: 'BeyondBrain FA Parts',
    description:
      '日本のFA（工場自動化）部品の余剰在庫を、海外へ供給します。',
    detail:
      '取扱メーカー例：Mitsubishi、Omron、Yaskawa、FANUC など。各社の正規代理店ではありません。',
  },
  {
    category: 'MARKET ENTRY',
    title: '海外企業の日本進出支援',
    description: '日本での需要検証、営業・拠点の立ち上げ、運営。',
    status: '準備中',
  },
]

const capabilities = [
  {
    label: 'AI SYSTEMS & DX',
    title: '現場で動くAI',
    description:
      'AIシステム開発・DXコンサルティングから、外国人材の採用・定着支援まで。',
  },
  {
    label: 'CROSS-BORDER OPERATIONS',
    title: '日本から世界へ',
    description:
      'FA・産業用ロボット部品と日本製品を、海外の取引先へ供給。',
  },
  {
    label: 'JAPAN MARKET ENTRY',
    title: '世界から日本へ',
    description:
      '需要検証、営業・拠点の立ち上げ、運営までを支える日本進出支援。準備中。',
  },
]

const companyProfile = [
  { label: '会社名', value: '株式会社BeyondBrain' },
  { label: '設立', value: '2023年10月' },
  { label: '代表者', value: '代表取締役 冨田 英志' },
  { label: '資本金', value: '1,000,000円' },
  {
    label: '事業内容',
    value:
      '外国人材プラットフォーム事業、FA・産業用ロボット及び日本製品の貿易事業、ゲーム・アプリの企画・開発、AIシステム開発・DXコンサルティング',
  },
  { label: '所在地', value: '東京都渋谷区渋谷１−１９−１８' },
]

const legalLinks = [
  { label: '利用規約', href: 'https://www.beyondxbrain.com/terms' },
  {
    label: 'プライバシーポリシー',
    href: 'https://www.beyondxbrain.com/privacy',
  },
  {
    label: '特定商取引法に基づく表記',
    href: 'https://www.beyondxbrain.com/legal',
  },
  {
    label: 'セキュリティ方針',
    href: 'https://www.beyondxbrain.com/security',
  },
]

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a
      className={`brand${footer ? ' brand-footer' : ''}`}
      href="#main"
      aria-label="BeyondBrain ホームへ"
    >
      <img
        className="brand-mark"
        src="/brand-mark.svg"
        alt=""
        width="30"
        height="32"
      />
      <span>BeyondBrain</span>
    </a>
  )
}

export default function Home() {
  const experienceRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <a className="skip-link" href="#main-content">
        本文へスキップ
      </a>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="page-shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="メインナビゲーション">
            <a href="#about">私たちについて</a>
            <a href="#operations">事業領域</a>
            <a href="#company">会社概要</a>
            <a className="header-contact" href="#contact">
              お問い合わせ
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </nav>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="モバイルナビゲーション"
          >
            <a href="#about" onClick={closeMenu}>
              私たちについて
            </a>
            <a href="#operations" onClick={closeMenu}>
              事業領域
            </a>
            <a href="#company" onClick={closeMenu}>
              会社概要
            </a>
            <a href="#contact" onClick={closeMenu}>
              お問い合わせ
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </nav>
        )}
      </header>

      <main id="main-content">
        <div className="experience" ref={experienceRef} id="main">
          <div className="scene-sticky">
            <NeuralCanvas experienceRef={experienceRef} />
          </div>

          <div className="experience-content">
            <section className="hero experience-panel" aria-labelledby="hero-title">
              <div className="page-shell hero-layout">
                <div className="hero-copy">
                  <p className="hero-location">
                    <span className="live-dot" aria-hidden="true" />
                    TOKYO / SHIBUYA
                  </p>
                  <h1 id="hero-title" className="hero-title">
                    <span className="hero-title-latin">AI at work,</span>
                    <span className="hero-title-accent">日本から。</span>
                  </h1>
                  <p className="hero-english">現場で使われるAIを、日本から世界へ。</p>
                  <p className="hero-summary">
                    FA・産業用ロボット部品、
                    <span className="nowrap">日本製品の海外供給</span>、日本進出支援。
                    <br />
                    BeyondBrainは、実際に動くAIと事業基盤で現場をつなぎます。
                  </p>
                  <div className="hero-actions">
                    <a className="button-primary" href="#operations">
                      事業を見る
                      <ArrowDown size={18} aria-hidden="true" />
                    </a>
                    <a className="text-link" href="mailto:contact@beyondxbrain.com">
                      まずは話す
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                  </div>
                  <div className="hero-technical" aria-label="事業の領域">
                    <span>AI SYSTEMS</span>
                    <span>CROSS-BORDER TRADE</span>
                    <span>JAPAN MARKET ENTRY</span>
                  </div>
                </div>
              </div>
              <a className="scroll-cue" href="#about">
                <span>SCROLL TO EXPLORE</span>
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </section>

            <section
              className="manifesto experience-panel"
              id="about"
              aria-labelledby="about-title"
            >
              <div className="page-shell manifesto-layout">
                <div className="manifesto-copy">
                  <p className="section-index">THE COMPANY</p>
                  <h2 id="about-title">
                    AIの能力を、<span>現場の成果へ。</span>
                  </h2>
                  <p className="manifesto-principle">
                    AIの能力は、すでに十分に高い。足りないのは、それが現場で使われることです。
                  </p>
                  <div className="manifesto-body">
                    <p>
                      私たちは東京から、日本と海外の現場をつないでいます。FA・産業用ロボットの部品、そして日本の製品を、海外の取引先へ。扱うのは、現場で使われているものだけです。
                    </p>
                    <p>
                      これから、反対の方向にも橋をかけます。日本に進出する海外企業のために、需要の検証から営業・拠点の立ち上げ、運営までを支える準備を進めています。
                    </p>
                  </div>
                  <div className="capability-list" aria-label="BeyondBrainのケイパビリティ">
                    {capabilities.map((capability) => (
                      <article className="capability-row" key={capability.title}>
                        <span>{capability.label}</span>
                        <div>
                          <h3>{capability.title}</h3>
                          <p>{capability.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section
          className="operations light-section"
          id="operations"
          aria-labelledby="operations-title"
        >
          <div className="page-shell">
            <div className="operations-header">
              <h2 id="operations-title">In operation</h2>
              <p>
                東京から、製品・部品・ソフトウェアを世界へ。
                <br />
                そして、世界の企業が日本で動き出すための基盤へ。
              </p>
            </div>
            <div className="operations-list">
              {operations.map((operation) => {
                const content = (
                  <>
                    <div className="operation-name">
                      <span className="operation-category">
                        {operation.category}
                      </span>
                      <h3>{operation.title}</h3>
                    </div>
                    <div className="operation-description">
                      <p>{operation.description}</p>
                      {'detail' in operation && operation.detail && (
                        <small>{operation.detail}</small>
                      )}
                    </div>
                    <div className="operation-meta">
                      {'domain' in operation && operation.domain && (
                        <span>{operation.domain}</span>
                      )}
                      {'status' in operation && operation.status && (
                        <span className="status-badge">{operation.status}</span>
                      )}
                    </div>
                    {'href' in operation && operation.href ? (
                      <ArrowUpRight
                        className="operation-arrow"
                        size={25}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="operation-arrow-placeholder" aria-hidden="true" />
                    )}
                  </>
                )

                return (
                  <article className="operation-row" key={operation.title}>
                    {'href' in operation && operation.href ? (
                      <a
                        className="operation-link"
                        href={operation.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${operation.title}（外部サイト）`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="operation-link operation-static">
                        {content}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section
          className="company light-section"
          id="company"
          aria-labelledby="company-title"
        >
          <div className="page-shell company-layout">
            <div className="company-heading">
              <p>COMPANY PROFILE</p>
              <h2 id="company-title">会社概要</h2>
              <span>東京を拠点とする、少人数のチームです。</span>
            </div>
            <dl className="company-list">
              {companyProfile.map((item) => (
                <div className="company-row" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="contact-title">
          <div className="contact-orbit" aria-hidden="true" />
          <div className="page-shell contact-layout">
            <p className="contact-label">START A CONVERSATION</p>
            <h2 id="contact-title">
              <span>現場を変えたいなら、</span>
              <span>ここから。</span>
            </h2>
            <p className="contact-copy">
              事業のご相談、協業、私たちと働きたい方は、ご連絡ください。
            </p>
            <a className="contact-email" href="mailto:contact@beyondxbrain.com">
              <Mail size={25} aria-hidden="true" />
              <span>contact@beyondxbrain.com</span>
              <ArrowUpRight size={26} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-main">
          <Brand footer />
          <nav className="legal-links" aria-label="法務情報">
            {legalLinks.map((link) => (
              <a href={link.href} key={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="page-shell footer-bottom">
          <span>© 2023–2026 BeyondBrain Inc.</span>
          <a href="#main">
            BACK TO TOP
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </>
  )
}
