export type Lang = 'ja' | 'en'

export const LANGS: Lang[] = ['ja', 'en']

export type LineId =
  | 'wholesale'
  | 'server-parts'
  | 'fa-parts'
  | 'games'
  | 'japan-entry'

export type StationId = 'home' | LineId

export type ShowItem = {
  id: string
  name: string
  /** The title in its own language, where `name` is a romanisation of it. */
  original?: string
  kind?: string
  summary: string
  facts?: string[]
  status?: string
}

export type Line = {
  id: LineId
  nav: string
  category: string
  title: string
  description: string
  note?: string
  status?: string
  site?: { label: string; domain: string; href: string }
  items: ShowItem[]
}

/** Every word the site shows, in one language. */
export type Copy = {
  lang: Lang
  /** Mirrors the tags in index.html, which are written in Japanese. */
  meta: {
    title: string
    description: string
    siteName: string
    ogTitle: string
    ogDescription: string
    locale: string
  }
  hero: {
    first: string
    second: string
    lead: string
    summary: string
    primary: string
    secondary: string
  }
  /** Wall order, left to right around the room. The centre wall is index 2. */
  lines: Line[]
  about: {
    title: string
    principle: string
    body: string[]
    capabilities: { label: string; title: string; description: string }[]
  }
  companyHeading: string
  companyIntro: string
  /** A value given as a list is shown as phrases that each stay on one line. */
  companyProfile: { label: string; value: string | string[] }[]
  contact: { title: string; text: string }
  legalLabel: string
  legalLinks: { label: string; href: string }[]
  /** Shown under the legal links when they lead to pages in another language. */
  legalNote?: string
  ui: {
    tagline: string
    home: string
    skip: string
    walls: string
    info: string
    close: string
    language: string
    list: string
    listCount: (count: number) => string
    itemsOn: (line: string) => string
    previous: string
    next: string
    back: string
    add: string
    added: string
    addedRemove: string
    aboutTitle: string
    emptyList: string
    listHint: (email: string) => string
    compose: string
    copy: string
    copied: string
    remove: (name: string) => string
    mailSubject: string
    mailIntro: string
    mailFields: string[]
    mailRow: (line: string, item: string) => string
  }
}

export const CONTACT_EMAIL = 'contact@beyondxbrain.com'

export const LANG_STORAGE_KEY = 'beyondbrain.lang'

/**
 * The single source for all wording. Each `t(japanese, english)` keeps the two
 * languages side by side, so a change to one is hard to make without the other.
 */
function build(lang: Lang): Copy {
  const t = (ja: string, en: string) => (lang === 'ja' ? ja : en)
  /** Japanese titles are shown beside their romanised names, which only English needs. */
  const original = (title: string) => (lang === 'ja' ? undefined : title)
  const stockNote = t(
    '型番と参考単価は在庫一覧で確認できます。',
    'Part numbers and indicative prices are in the stock list.',
  )

  return {
    lang,
    meta: {
      title: t(
        '株式会社BeyondBrain｜現場を変えるAIを、日本から。',
        'BeyondBrain Inc. | AI at work, from Japan',
      ),
      description: t(
        '株式会社BeyondBrainは、AIシステム開発、FA・産業用ロボットと日本製品の貿易、ゲーム・アプリ開発を手がける東京・渋谷の会社です。',
        'BeyondBrain Inc. is a company in Shibuya, Tokyo, that develops AI systems, trades factory-automation and industrial-robot equipment and Japanese products, and builds games and apps.',
      ),
      siteName: t('株式会社BeyondBrain', 'BeyondBrain Inc.'),
      ogTitle: t(
        '現場を変えるAIを、日本から。｜株式会社BeyondBrain',
        'AI at work, from Japan | BeyondBrain Inc.',
      ),
      ogDescription: t(
        'AIとグローバルな事業基盤で、日本と海外の現場をつなぐ。',
        'Connecting workplaces in Japan and overseas with AI and a global business base.',
      ),
      locale: t('ja_JP', 'en_US'),
    },

    hero: {
      first: 'AI at work,',
      second: t('日本から。', 'from Japan.'),
      lead: t(
        '現場で使われるAIを、日本から世界へ。',
        'AI put to work, from Japan to the world.',
      ),
      summary: t(
        'FA・産業用ロボット部品、日本製品の海外供給、日本進出支援。BeyondBrainは、実際に動くAIと事業基盤で現場をつなぎます。',
        'Factory-automation and industrial-robot parts, Japanese products for overseas buyers, and support for entering Japan. BeyondBrain connects workplaces with AI that actually runs and the business base behind it.',
      ),
      primary: t('事業を見る', 'See our businesses'),
      secondary: t('まずは話す', 'Talk to us'),
    },

    lines: [
      {
        id: 'wholesale',
        nav: t('卸売', 'Wholesale'),
        category: 'Global trade',
        title: 'Tokyo Beyond Wholesale',
        description: t(
          '日本の製品を、東京から海外の棚へ卸す。',
          'Japanese products, wholesale from Tokyo to shelves overseas.',
        ),
        site: {
          label: t('カタログを見る', 'View the catalogue'),
          domain: 'wholesale.beyondxbrain.com',
          href: 'https://wholesale.beyondxbrain.com/',
        },
        items: [
          {
            id: 'beauty',
            name: t('ビューティー・スキンケア', 'Beauty & skincare'),
            summary: t(
              '日本ブランドのスキンケアと化粧品。',
              'Skincare and cosmetics from Japanese brands.',
            ),
          },
          {
            id: 'towels',
            name: t('タオル・バス', 'Towels & bath'),
            summary: t(
              '今治タオルをはじめとする、日本のタオルとバス用品。',
              'Japanese towels and bath goods, including Imabari towels.',
            ),
          },
          {
            id: 'blades',
            name: t('刃物・グルーミング', 'Blades & grooming'),
            summary: t(
              '関の包丁など、日本の刃物とグルーミング用品。',
              'Japanese blades and grooming tools, including kitchen knives from Seki.',
            ),
          },
          {
            id: 'ceramics',
            name: t('陶磁器・工芸', 'Ceramics & craft'),
            summary: t('和食器と工芸品。', 'Japanese tableware and craft pieces.'),
          },
          {
            id: 'matcha',
            name: t('抹茶・お茶', 'Matcha & tea'),
            summary: t('抹茶と日本茶。', 'Matcha and Japanese tea.'),
          },
          {
            id: 'stationery',
            name: t('文具・ギフト', 'Stationery & gifts'),
            summary: t('日本の文具とギフト雑貨。', 'Japanese stationery and gift items.'),
          },
        ],
      },
      {
        id: 'server-parts',
        nav: t('サーバー', 'Servers'),
        category: 'Infrastructure',
        title: 'BeyondBrain Server Parts',
        description: t(
          'サーバー用メモリ、エンタープライズSSD・HDD、サーバー用CPU、ネットワーク部品の法人向け卸売。',
          'Server memory, enterprise SSDs and HDDs, server CPUs and network parts, wholesale for businesses.',
        ),
        site: {
          label: t('在庫一覧を見る', 'View the stock list'),
          domain: 'serverparts.beyondxbrain.com',
          href: t(
            'https://www.serverparts.beyondxbrain.com/',
            'https://www.serverparts.beyondxbrain.com/?lang=en',
          ),
        },
        items: [
          {
            id: 'ddr5',
            name: t('DDR5メモリ', 'DDR5 memory'),
            summary: t(`サーバー用のDDR5メモリ。${stockNote}`, `DDR5 memory for servers. ${stockNote}`),
            facts: ['RDIMM', 'UDIMM', 'SO-DIMM'],
          },
          {
            id: 'ddr4',
            name: t('DDR4メモリ', 'DDR4 memory'),
            summary: t(`サーバー用のDDR4メモリ。${stockNote}`, `DDR4 memory for servers. ${stockNote}`),
            facts: ['RDIMM', 'LRDIMM', 'UDIMM', 'SO-DIMM'],
          },
          {
            id: 'ssd',
            name: t('エンタープライズSSD', 'Enterprise SSD'),
            summary: t(`データセンター向けのSSD。${stockNote}`, `SSDs for data centres. ${stockNote}`),
            facts: ['NVMe', 'SAS', 'SATA'],
          },
          {
            id: 'hdd',
            name: t('エンタープライズHDD', 'Enterprise HDD'),
            summary: t(
              `大容量のサーバー用HDD。${stockNote}`,
              `High-capacity HDDs for servers. ${stockNote}`,
            ),
            facts: ['SAS', 'SATA'],
          },
          {
            id: 'cpu',
            name: t('サーバー用CPU', 'Server CPU'),
            summary: t(
              `サーバー・ワークステーション用のCPU。${stockNote}`,
              `CPUs for servers and workstations. ${stockNote}`,
            ),
            facts: ['AMD EPYC', 'Intel Xeon'],
          },
          {
            id: 'network',
            name: t('ネットワーク', 'Network'),
            summary: t(
              'ネットワークカードなどの通信部品。',
              'Network cards and other networking parts.',
            ),
          },
        ],
      },
      {
        id: 'fa-parts',
        nav: t('FA部品', 'Automation'),
        category: 'Factory automation',
        title: 'BeyondBrain FA Parts',
        description: t(
          '日本のFA（工場自動化）部品の余剰在庫を、海外へ供給します。',
          'We supply surplus stock of Japanese factory-automation (FA) parts to buyers overseas.',
        ),
        note: t(
          '取扱メーカー例：Mitsubishi、Omron、Yaskawa、FANUC など。各社の正規代理店ではありません。',
          'Makers we handle include Mitsubishi, Omron, Yaskawa and FANUC. We are not an authorised distributor for any of them.',
        ),
        items: [
          {
            id: 'servo-motor',
            name: t('サーボモーター', 'Servo motors'),
            summary: t(
              '位置決めや搬送の軸を動かすACサーボモーター。',
              'AC servo motors that drive positioning and conveying axes.',
            ),
          },
          {
            id: 'servo-amp',
            name: t('サーボアンプ', 'Servo amplifiers'),
            summary: t(
              'サーボモーターを駆動し、制御するアンプ。',
              'Amplifiers that drive and control servo motors.',
            ),
          },
          {
            id: 'plc',
            name: t('PLC', 'PLCs'),
            summary: t(
              '設備の動きを制御するPLC本体と、入出力・通信ユニット。',
              'PLC main units that control equipment, with their I/O and communication modules.',
            ),
          },
          {
            id: 'inverter',
            name: t('インバータ', 'Inverters'),
            summary: t(
              'モーターの回転数を変える可変速ドライブ。',
              'Variable-speed drives that change how fast a motor turns.',
            ),
          },
          {
            id: 'hmi',
            name: t('HMI（表示器）', 'HMIs'),
            summary: t(
              '設備の状態を表示し、操作するタッチパネル。',
              'Touch panels that show equipment status and take operator input.',
            ),
          },
          {
            id: 'power-io',
            name: t('電源・I/Oユニット', 'Power supplies & I/O'),
            summary: t(
              '制御盤に組み込む電源と、入出力ターミナル。',
              'Power supplies and I/O terminals that go into control panels.',
            ),
          },
        ],
      },
      {
        id: 'games',
        nav: t('ゲーム', 'Games'),
        category: 'Software',
        title: 'Game Centre',
        description: t('自社でつくったゲームとアプリ。', 'Games and apps we build ourselves.'),
        site: {
          label: t('タイトルを見る', 'View the titles (in Japanese)'),
          domain: 'gamecentre.beyondxbrain.com',
          href: 'https://gamecentre.beyondxbrain.com/',
        },
        items: [
          {
            id: 'kamihiki',
            name: 'KAMIHIKI',
            kind: t('攻城バトルRPG', 'Siege battle RPG'),
            summary: t(
              '攻城戦は自動で進む。決めるのは、連れて行く4体と、札を切るタイミング。',
              'The siege plays out on its own. You choose the four units to bring and when to play your cards.',
            ),
            status: t('ベータ配信中', 'In beta'),
          },
          {
            id: 'teiji',
            name: t('定時退社バトロワ', 'Teiji Taisha Battle Royale'),
            original: original('定時退社バトロワ'),
            kind: t('オフィス・カードゲーム', 'Office card game'),
            summary: t(
              '定時に帰りたい社員たちの脱落戦。最後まで席に残らなかった一人が勝つ、56枚のカードゲーム。',
              'A 56-card elimination game among office workers who want to leave on time (teiji taisha). The one player not left at their desk at the end wins.',
            ),
            facts: [t('3〜6人', '3–6 players')],
            status: t('テストプレイ中', 'In playtesting'),
          },
          {
            id: 'tabemo',
            name: t('タベモ', 'Tabemo'),
            original: original('タベモ'),
            kind: t('グルメSNS', 'Food social app'),
            summary: t(
              '点数をつけるのをやめて、二軒を並べて「どっちが上か」を答えるだけでランキングができるグルメSNS。',
              'A food social app with no scores. You are shown two places, you say which is better, and your ranking builds from there.',
            ),
            status: t('配信中', 'Available now'),
          },
          {
            id: 'shigosen',
            name: t('子午線', 'Shigosen'),
            original: original('子午線'),
            kind: t('パーソナル Life OS', 'Personal Life OS'),
            summary: t(
              '自分の記録から読みが立ち上がる、パーソナル Life OS。',
              'A personal Life OS whose readings come from your own records.',
            ),
            status: t('開発中', 'In development'),
          },
        ],
      },
      {
        id: 'japan-entry',
        nav: t('日本進出', 'Japan entry'),
        category: 'Market entry',
        title: t('海外企業の日本進出支援', 'Japan entry support'),
        description: t(
          '日本での需要検証、営業・拠点の立ち上げ、運営。',
          'For overseas companies: validating demand, launching sales and a local base, and running operations in Japan.',
        ),
        status: t('準備中', 'In preparation'),
        items: [
          {
            id: 'noren',
            name: t('日本進出支援', 'Japan entry support'),
            summary: t(
              '日本に進出する海外企業のために、需要の検証から営業・拠点の立ち上げ、運営までを支える準備を進めています。',
              'For overseas companies entering Japan, we are preparing support that runs from validating demand, through launching sales and a local base, to running operations.',
            ),
            facts: [
              t('需要検証', 'Demand validation'),
              t('営業・拠点の立ち上げ', 'Sales & local base'),
              t('運営', 'Operations'),
            ],
            status: t('準備中', 'In preparation'),
          },
        ],
      },
    ],

    about: {
      title: t(
        'AIの能力を、現場の成果へ。',
        'Turning AI’s capability into results on the ground.',
      ),
      principle: t(
        'AIの能力は、すでに十分に高い。足りないのは、それが現場で使われることです。',
        'AI is already capable enough. What is missing is its use where the work happens.',
      ),
      body: [
        t(
          '私たちは東京から、日本と海外の現場をつないでいます。FA・産業用ロボットの部品、そして日本の製品を、海外の取引先へ。扱うのは、現場で使われているものだけです。',
          'From Tokyo, we connect workplaces in Japan and overseas. We supply factory-automation and industrial-robot parts, and Japanese products, to customers abroad. We handle only what is in real use where the work happens.',
        ),
        t(
          'これから、反対の方向にも橋をかけます。日本に進出する海外企業のために、需要の検証から営業・拠点の立ち上げ、運営までを支える準備を進めています。',
          'Next, we are building a bridge in the other direction: for overseas companies entering Japan, we are preparing support that runs from validating demand, through launching sales and a local base, to running operations.',
        ),
      ],
      capabilities: [
        {
          label: t('AI systems & DX', 'AI systems & digital transformation'),
          title: t('現場で動くAI', 'AI that runs where the work happens'),
          description: t(
            'AIシステム開発・DXコンサルティングから、外国人材の採用・定着支援まで。',
            'From AI system development and digital-transformation consulting to support for hiring and retaining international talent.',
          ),
        },
        {
          label: 'Cross-border operations',
          title: t('日本から世界へ', 'From Japan to the world'),
          description: t(
            'FA・産業用ロボット部品と日本製品を、海外の取引先へ供給。',
            'Supplying factory-automation and industrial-robot parts and Japanese products to customers overseas.',
          ),
        },
        {
          label: 'Japan market entry',
          title: t('世界から日本へ', 'From the world to Japan'),
          description: t(
            '需要検証、営業・拠点の立ち上げ、運営までを支える日本進出支援。準備中。',
            'Japan entry support covering demand validation, launching sales and a local base, and operations. In preparation.',
          ),
        },
      ],
    },

    companyHeading: t('会社概要', 'Company profile'),
    companyIntro: t('東京を拠点とする、少人数のチームです。', 'A small team based in Tokyo.'),
    companyProfile: [
      {
        label: t('会社名', 'Company'),
        value: t('株式会社BeyondBrain', 'BeyondBrain Inc. (株式会社BeyondBrain)'),
      },
      { label: t('設立', 'Founded'), value: t('2023年10月', 'October 2023') },
      {
        label: t('代表者', 'Representative'),
        value: t('代表取締役 冨田 英志', 'Eiji Tomita, Representative Director'),
      },
      { label: t('資本金', 'Capital'), value: t('1,000,000円', '¥1,000,000') },
      {
        label: t('事業内容', 'Business'),
        value: t(
          '外国人材プラットフォーム事業、FA・産業用ロボット及び日本製品の貿易事業、ゲーム・アプリの企画・開発、AIシステム開発・DXコンサルティング',
          'International talent platform; trading in factory-automation and industrial-robot equipment and Japanese products; planning and development of games and apps; AI system development and digital-transformation consulting',
        ),
      },
      {
        label: t('所在地', 'Address'),
        value:
          lang === 'ja'
            ? '東京都渋谷区渋谷１−１９−１８'
            : ['1-19-18 Shibuya,', 'Shibuya-ku,', 'Tokyo 150-0002,', 'Japan'],
      },
    ],

    contact: {
      title: t(
        '現場を変えたいなら、ここから。',
        'Want to change how the work gets done? Start here.',
      ),
      text: t(
        '事業のご相談、協業、私たちと働きたい方は、ご連絡ください。',
        'For business inquiries, partnerships, or to work with us, get in touch.',
      ),
    },

    legalLabel: t('法務情報', 'Legal'),
    legalLinks: [
      { label: t('利用規約', 'Terms of Service'), href: 'https://www.beyondxbrain.com/terms' },
      {
        label: t('プライバシーポリシー', 'Privacy Policy'),
        href: 'https://www.beyondxbrain.com/privacy',
      },
      {
        label: t('特定商取引法に基づく表記', 'Specified Commercial Transactions Act notice'),
        href: 'https://www.beyondxbrain.com/legal',
      },
      {
        label: t('セキュリティ方針', 'Security Policy'),
        href: 'https://www.beyondxbrain.com/security',
      },
    ],

    legalNote: lang === 'ja' ? undefined : 'These four pages are in Japanese.',

    ui: {
      tagline: t('バーチャルショールーム', 'Virtual showroom'),
      home: t('ホーム', 'Home'),
      skip: t('ナビゲーションへスキップ', 'Skip to navigation'),
      walls: t('展示の切り替え', 'Showroom walls'),
      info: t('会社情報とお問い合わせ', 'Company information and contact'),
      close: t('閉じる', 'Close'),
      language: t('言語', 'Language'),
      list: t('問い合わせリスト', 'Inquiry list'),
      listCount: (count) =>
        lang === 'ja'
          ? `問い合わせリスト（${count}件）`
          : `Inquiry list (${count} ${count === 1 ? 'item' : 'items'})`,
      itemsOn: (line) => (lang === 'ja' ? `${line}の展示` : `Items on the ${line} wall`),
      previous: t('前の展示', 'Previous item'),
      next: t('次の展示', 'Next item'),
      back: t('展示に戻る', 'Close item'),
      add: t('問い合わせリストに追加', 'Add to inquiry list'),
      added: t('リストに追加しました', 'Added to the list'),
      addedRemove: t('追加済み（外す）', 'Added (remove)'),
      aboutTitle: t('BeyondBrainについて', 'About BeyondBrain'),
      emptyList: t(
        'まだ何も入っていません。展示を開いて「問い合わせリストに追加」を押すと、ここにまとまります。',
        'Nothing here yet. Open an item and choose “Add to inquiry list” to collect it here.',
      ),
      listHint: (email) =>
        lang === 'ja'
          ? `リストの内容を本文に入れたメールを作成します。宛先は ${email} です。`
          : `This drafts an email to ${email} with the list in the body.`,
      compose: t('メールを作成', 'Draft the email'),
      copy: t('内容をコピー', 'Copy the text'),
      copied: t('コピーしました', 'Copied'),
      remove: (name) => (lang === 'ja' ? `${name}をリストから外す` : `Remove ${name} from the list`),
      mailSubject: t(
        'お問い合わせ（BeyondBrain ショールーム）',
        'Inquiry from the BeyondBrain showroom',
      ),
      mailIntro: t('以下について問い合わせます。', 'I would like to ask about the following:'),
      mailFields:
        lang === 'ja'
          ? ['会社名：', 'ご担当者名：', 'ご希望の数量・納期など：']
          : ['Company:', 'Name:', 'Quantity, timing and other details:'],
      mailRow: (line, item) => (lang === 'ja' ? `・${line}／${item}` : `- ${line} / ${item}`),
    },
  }
}

const copies: Record<Lang, Copy> = { ja: build('ja'), en: build('en') }

export function getCopy(lang: Lang) {
  return copies[lang]
}

/** The walls and their items, for code that only needs ids and order. */
export const lines = copies.ja.lines

export const stationOrder: StationId[] = ['home', ...lines.map((line) => line.id)]

export function findLine(copy: Copy, id: StationId): Line | undefined {
  return copy.lines.find((line) => line.id === id)
}

export function findItem(copy: Copy, key: string): { line: Line; item: ShowItem } | undefined {
  const [lineId, itemId] = key.split('/')
  const line = copy.lines.find((entry) => entry.id === lineId)
  const item = line?.items.find((entry) => entry.id === itemId)
  return line && item ? { line, item } : undefined
}

export const itemKey = (line: Line, item: ShowItem) => `${line.id}/${item.id}`

/** Language to show first: an explicit `?lang=`, then the visitor's last choice, then their browser. */
export function detectLang(): Lang {
  const isLang = (value: unknown): value is Lang => value === 'ja' || value === 'en'
  const requested = new URLSearchParams(window.location.search).get('lang')
  if (isLang(requested)) return requested
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (isLang(stored)) return stored
  } catch {
    /* Storage can be unavailable; fall through to the browser's languages. */
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const code of preferred) {
    const base = code?.toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return 'en'
}
