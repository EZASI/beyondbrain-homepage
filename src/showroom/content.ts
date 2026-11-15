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

export const CONTACT_EMAIL = 'contact@beyondxbrain.com'

export const hero = {
  titleLatin: 'AI at work,',
  titleJapanese: '日本から。',
  lead: '現場で使われるAIを、日本から世界へ。',
  summary:
    'FA・産業用ロボット部品、日本製品の海外供給、日本進出支援。BeyondBrainは、実際に動くAIと事業基盤で現場をつなぎます。',
}

/** Wall order, left to right around the room. The centre wall is index 2. */
export const lines: Line[] = [
  {
    id: 'wholesale',
    nav: '卸売',
    category: 'Global trade',
    title: 'Tokyo Beyond Wholesale',
    description: '日本の製品を、東京から海外の棚へ卸す。',
    site: {
      label: 'カタログを見る',
      domain: 'wholesale.beyondxbrain.com',
      href: 'https://wholesale.beyondxbrain.com/',
    },
    items: [
      {
        id: 'beauty',
        name: 'ビューティー・スキンケア',
        summary: '日本ブランドのスキンケアと化粧品。',
      },
      {
        id: 'towels',
        name: 'タオル・バス',
        summary: '今治タオルをはじめとする、日本のタオルとバス用品。',
      },
      {
        id: 'blades',
        name: '刃物・グルーミング',
        summary: '関の包丁など、日本の刃物とグルーミング用品。',
      },
      {
        id: 'ceramics',
        name: '陶磁器・工芸',
        summary: '和食器と工芸品。',
      },
      {
        id: 'matcha',
        name: '抹茶・お茶',
        summary: '抹茶と日本茶。',
      },
      {
        id: 'stationery',
        name: '文具・ギフト',
        summary: '日本の文具とギフト雑貨。',
      },
    ],
  },
  {
    id: 'server-parts',
    nav: 'サーバー',
    category: 'Infrastructure',
    title: 'BeyondBrain Server Parts',
    description:
      'サーバー用メモリ、エンタープライズSSD・HDD、サーバー用CPU、ネットワーク部品の法人向け卸売。',
    site: {
      label: '在庫一覧を見る',
      domain: 'serverparts.beyondxbrain.com',
      href: 'https://www.serverparts.beyondxbrain.com/',
    },
    items: [
      {
        id: 'ddr5',
        name: 'DDR5メモリ',
        summary: 'サーバー用のDDR5メモリ。型番と参考単価は在庫一覧で確認できます。',
        facts: ['RDIMM', 'UDIMM', 'SO-DIMM'],
      },
      {
        id: 'ddr4',
        name: 'DDR4メモリ',
        summary: 'サーバー用のDDR4メモリ。型番と参考単価は在庫一覧で確認できます。',
        facts: ['RDIMM', 'LRDIMM', 'UDIMM', 'SO-DIMM'],
      },
      {
        id: 'ssd',
        name: 'エンタープライズSSD',
        summary: 'データセンター向けのSSD。型番と参考単価は在庫一覧で確認できます。',
        facts: ['NVMe', 'SAS', 'SATA'],
      },
      {
        id: 'hdd',
        name: 'エンタープライズHDD',
        summary: '大容量のサーバー用HDD。型番と参考単価は在庫一覧で確認できます。',
        facts: ['SAS', 'SATA'],
      },
      {
        id: 'cpu',
        name: 'サーバー用CPU',
        summary: 'サーバー・ワークステーション用のCPU。型番と参考単価は在庫一覧で確認できます。',
        facts: ['AMD EPYC', 'Intel Xeon'],
      },
      {
        id: 'network',
        name: 'ネットワーク',
        summary: 'ネットワークカードなどの通信部品。',
      },
    ],
  },
  {
    id: 'fa-parts',
    nav: 'FA部品',
    category: 'Factory automation',
    title: 'BeyondBrain FA Parts',
    description: '日本のFA（工場自動化）部品の余剰在庫を、海外へ供給します。',
    note: '取扱メーカー例：Mitsubishi、Omron、Yaskawa、FANUC など。各社の正規代理店ではありません。',
    items: [
      {
        id: 'servo-motor',
        name: 'サーボモーター',
        summary: '位置決めや搬送の軸を動かすACサーボモーター。',
      },
      {
        id: 'servo-amp',
        name: 'サーボアンプ',
        summary: 'サーボモーターを駆動し、制御するアンプ。',
      },
      {
        id: 'plc',
        name: 'PLC',
        summary: '設備の動きを制御するPLC本体と、入出力・通信ユニット。',
      },
      {
        id: 'inverter',
        name: 'インバータ',
        summary: 'モーターの回転数を変える可変速ドライブ。',
      },
      {
        id: 'hmi',
        name: 'HMI（表示器）',
        summary: '設備の状態を表示し、操作するタッチパネル。',
      },
      {
        id: 'power-io',
        name: '電源・I/Oユニット',
        summary: '制御盤に組み込む電源と、入出力ターミナル。',
      },
    ],
  },
  {
    id: 'games',
    nav: 'ゲーム',
    category: 'Software',
    title: 'Game Centre',
    description: '自社でつくったゲームとアプリ。',
    site: {
      label: 'タイトルを見る',
      domain: 'gamecentre.beyondxbrain.com',
      href: 'https://gamecentre.beyondxbrain.com/',
    },
    items: [
      {
        id: 'kamihiki',
        name: 'KAMIHIKI',
        kind: '攻城バトルRPG',
        summary:
          '攻城戦は自動で進む。決めるのは、連れて行く4体と、札を切るタイミング。',
        status: 'ベータ配信中',
      },
      {
        id: 'teiji',
        name: '定時退社バトロワ',
        kind: 'オフィス・カードゲーム',
        summary:
          '定時に帰りたい社員たちの脱落戦。最後まで席に残らなかった一人が勝つ、56枚のカードゲーム。',
        facts: ['3〜6人'],
        status: 'テストプレイ中',
      },
      {
        id: 'tabemo',
        name: 'タベモ',
        kind: 'グルメSNS',
        summary:
          '点数をつけるのをやめて、二軒を並べて「どっちが上か」を答えるだけでランキングができるグルメSNS。',
        status: '配信中',
      },
      {
        id: 'shigosen',
        name: '子午線',
        kind: 'パーソナル Life OS',
        summary: '自分の記録から読みが立ち上がる、パーソナル Life OS。',
        status: '開発中',
      },
    ],
  },
  {
    id: 'japan-entry',
    nav: '日本進出',
    category: 'Market entry',
    title: '海外企業の日本進出支援',
    description: '日本での需要検証、営業・拠点の立ち上げ、運営。',
    status: '準備中',
    items: [
      {
        id: 'noren',
        name: '日本進出支援',
        summary:
          '日本に進出する海外企業のために、需要の検証から営業・拠点の立ち上げ、運営までを支える準備を進めています。',
        facts: ['需要検証', '営業・拠点の立ち上げ', '運営'],
        status: '準備中',
      },
    ],
  },
]

export const stationOrder: StationId[] = ['home', ...lines.map((line) => line.id)]

export const about = {
  title: 'AIの能力を、現場の成果へ。',
  principle:
    'AIの能力は、すでに十分に高い。足りないのは、それが現場で使われることです。',
  body: [
    '私たちは東京から、日本と海外の現場をつないでいます。FA・産業用ロボットの部品、そして日本の製品を、海外の取引先へ。扱うのは、現場で使われているものだけです。',
    'これから、反対の方向にも橋をかけます。日本に進出する海外企業のために、需要の検証から営業・拠点の立ち上げ、運営までを支える準備を進めています。',
  ],
  capabilities: [
    {
      label: 'AI systems & DX',
      title: '現場で動くAI',
      description:
        'AIシステム開発・DXコンサルティングから、外国人材の採用・定着支援まで。',
    },
    {
      label: 'Cross-border operations',
      title: '日本から世界へ',
      description: 'FA・産業用ロボット部品と日本製品を、海外の取引先へ供給。',
    },
    {
      label: 'Japan market entry',
      title: '世界から日本へ',
      description:
        '需要検証、営業・拠点の立ち上げ、運営までを支える日本進出支援。準備中。',
    },
  ],
}

export const companyIntro = '東京を拠点とする、少人数のチームです。'

export const contact = {
  title: '現場を変えたいなら、ここから。',
  text: '事業のご相談、協業、私たちと働きたい方は、ご連絡ください。',
}

export const companyProfile = [
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

export const legalLinks = [
  { label: '利用規約', href: 'https://www.beyondxbrain.com/terms' },
  { label: 'プライバシーポリシー', href: 'https://www.beyondxbrain.com/privacy' },
  {
    label: '特定商取引法に基づく表記',
    href: 'https://www.beyondxbrain.com/legal',
  },
  { label: 'セキュリティ方針', href: 'https://www.beyondxbrain.com/security' },
]

export function findLine(id: StationId): Line | undefined {
  return lines.find((line) => line.id === id)
}

export function findItem(itemKey: string): { line: Line; item: ShowItem } | undefined {
  const [lineId, itemId] = itemKey.split('/')
  const line = lines.find((entry) => entry.id === lineId)
  const item = line?.items.find((entry) => entry.id === itemId)
  return line && item ? { line, item } : undefined
}

export const itemKey = (line: Line, item: ShowItem) => `${line.id}/${item.id}`
