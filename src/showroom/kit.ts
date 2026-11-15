import * as THREE from 'three'
import { BRAND_MARK_PATH } from './brandMark'

/** Colours shared by the 3D room and the interface (see showroom.css). */
export const COLORS = {
  wall: 0xe4ebe9,
  floor: 0xc5cecc,
  ceiling: 0xf1f5f4,
  ink: 0x0a1b20,
  mint: 0x5cf4d7,
  panel: 0x0d2b35,
}

const LATIN = 'Manrope, "Helvetica Neue", sans-serif'
const GOTHIC = '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", sans-serif'
const MINCHO = '"Shippori Mincho", "Yu Mincho", serif'

type Draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => void

function canvasTexture(width: number, height: number, draw: Draw, anisotropy: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function spaced(ctx: CanvasRenderingContext2D, spacing: string) {
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing
  }
}

function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const pattern = [3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 3, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2]
  const total = pattern.reduce((sum, value) => sum + value, 0)
  let cursor = x
  pattern.forEach((value, index) => {
    const span = (value / total) * width
    if (index % 2 === 0) ctx.fillRect(cursor, y, span, height)
    cursor += span
  })
}

const drawWallLogo: Draw = (ctx, width, height) => {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0a1b20'
  const markSize = height * 0.86
  ctx.save()
  ctx.translate(height * 0.07, (height - markSize) / 2)
  ctx.scale(markSize / 546, markSize / 546)
  ctx.translate(17, 0)
  ctx.fill(new Path2D(BRAND_MARK_PATH), 'evenodd')
  ctx.restore()
  ctx.font = `750 ${height * 0.62}px ${LATIN}`
  ctx.textBaseline = 'middle'
  spaced(ctx, `${-height * 0.014}px`)
  ctx.fillText('BeyondBrain', height * 1.12, height * 0.53)
}

const drawPerforation: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#0d2b35'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#061a21'
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, width * 0.13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(164, 252, 232, 0.10)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(width / 2, height / 2 + 1, width * 0.15, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
}

const drawSegments: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#04141a'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#5cf4d7'
  ctx.font = `700 ${height * 0.72}px ${LATIN}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  spaced(ctx, '6px')
  ctx.fillText('50.00', width / 2, height * 0.54)
}

const drawHmi: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#06222b'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#0b3440'
  ctx.fillRect(0, 0, width, 46)
  ctx.fillStyle = '#d9e6e4'
  ctx.font = `700 20px ${LATIN}`
  ctx.textBaseline = 'middle'
  ctx.fillText('LINE 02', 20, 24)
  ctx.fillStyle = '#5cf4d7'
  roundRect(ctx, width - 96, 11, 76, 24, 12)
  ctx.fill()
  ctx.fillStyle = '#04141a'
  ctx.font = `800 14px ${LATIN}`
  ctx.textAlign = 'center'
  ctx.fillText('RUN', width - 58, 24)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#f1f9f7'
  ctx.font = `800 62px ${LATIN}`
  ctx.fillText('1,280', 20, 104)
  ctx.fillStyle = '#7fa3a3'
  ctx.font = `600 18px ${LATIN}`
  ctx.fillText('rpm', 196, 116)

  const bars = [0.42, 0.66, 0.5, 0.82, 0.74, 0.92, 0.6]
  bars.forEach((value, index) => {
    const barHeight = value * 96
    ctx.fillStyle = index === 5 ? '#5cf4d7' : '#1f6f74'
    roundRect(ctx, 22 + index * 34, 252 - barHeight, 22, barHeight, 4)
    ctx.fill()
  })

  const cx = width - 116
  const cy = 150
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#123f49'
  ctx.beginPath()
  ctx.arc(cx, cy, 62, 0.8 * Math.PI, 2.2 * Math.PI)
  ctx.stroke()
  ctx.strokeStyle = '#5cf4d7'
  ctx.beginPath()
  ctx.arc(cx, cy, 62, 0.8 * Math.PI, 1.75 * Math.PI)
  ctx.stroke()
  ctx.fillStyle = '#f1f9f7'
  ctx.font = `800 30px ${LATIN}`
  ctx.textAlign = 'center'
  ctx.fillText('68%', cx, cy + 2)

  const buttons: [string, string, string][] = [
    ['START', '#5cf4d7', '#04141a'],
    ['STOP', '#123f49', '#d9e6e4'],
    ['RESET', '#123f49', '#d9e6e4'],
  ]
  buttons.forEach(([label, background, color], index) => {
    ctx.fillStyle = background
    roundRect(ctx, 268 + index * 78, 268, 68, 34, 8)
    ctx.fill()
    ctx.fillStyle = color
    ctx.font = `800 13px ${LATIN}`
    ctx.fillText(label, 302 + index * 78, 286)
  })
}

const drawDriveLabel =
  (heading: string, capacity: string, detail: string): Draw =>
  (ctx, width, height) => {
    ctx.fillStyle = '#f6f7f4'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#0a1b20'
    ctx.fillRect(0, 0, width, height * 0.2)
    ctx.fillStyle = '#f6f7f4'
    ctx.font = `800 ${height * 0.085}px ${LATIN}`
    ctx.textBaseline = 'middle'
    ctx.fillText(heading, width * 0.07, height * 0.105)
    ctx.fillStyle = '#5cf4d7'
    ctx.fillRect(width * 0.82, height * 0.06, width * 0.11, height * 0.08)
    ctx.fillStyle = '#0a1b20'
    ctx.font = `800 ${height * 0.2}px ${LATIN}`
    ctx.fillText(capacity, width * 0.07, height * 0.38)
    ctx.font = `600 ${height * 0.07}px ${LATIN}`
    ctx.fillStyle = '#4b5b61'
    ctx.fillText(detail, width * 0.07, height * 0.54)
    ctx.fillStyle = '#c9d0cf'
    for (let row = 0; row < 3; row += 1) {
      ctx.fillRect(width * 0.07, height * (0.63 + row * 0.045), width * (0.5 - row * 0.09), height * 0.018)
    }
    ctx.fillStyle = '#0a1b20'
    barcode(ctx, width * 0.07, height * 0.8, width * 0.58, height * 0.13)
  }

const drawMemoryLabel =
  (text: string): Draw =>
  (ctx, width, height) => {
    ctx.fillStyle = '#f6f7f4'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#0a1b20'
    ctx.font = `800 ${height * 0.3}px ${LATIN}`
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width * 0.05, height * 0.3)
    barcode(ctx, width * 0.05, height * 0.56, width * 0.6, height * 0.3)
    ctx.fillStyle = '#5cf4d7'
    ctx.fillRect(width * 0.74, height * 0.56, width * 0.2, height * 0.3)
  }

const drawKamihiki: Draw = (ctx, width, height) => {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#0d1838')
  sky.addColorStop(0.5, '#4b2d5f')
  sky.addColorStop(0.78, '#d9714a')
  sky.addColorStop(1, '#f0b074')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255, 236, 200, 0.9)'
  ctx.beginPath()
  ctx.arc(width * 0.76, height * 0.3, 44, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#0a0f1f'
  const wallTop = height * 0.5
  ctx.fillRect(0, wallTop, width, height * 0.22)
  for (let index = 0; index < 9; index += 1) {
    ctx.fillRect(index * 64 - 6, wallTop - 30, 38, 32)
  }
  ctx.fillRect(width * 0.3, wallTop - 190, width * 0.4, 200)
  for (let index = 0; index < 4; index += 1) {
    ctx.fillRect(width * 0.3 + index * 60 - 4, wallTop - 222, 36, 34)
  }
  ctx.beginPath()
  ctx.moveTo(width * 0.24, wallTop - 190)
  ctx.lineTo(width * 0.5, wallTop - 262)
  ctx.lineTo(width * 0.76, wallTop - 190)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e9a86a'
  roundRect(ctx, width * 0.43, wallTop + 70, width * 0.14, 190, 36)
  ctx.fill()
  ctx.fillStyle = '#0a0f1f'
  ctx.fillRect(0, height * 0.7, width, height * 0.3)

  const cards = ['#5cf4d7', '#f0b074', '#efe8d8', '#8fb6ff']
  cards.forEach((color, index) => {
    const x = 34 + index * 122
    const y = height * 0.76
    ctx.fillStyle = color
    roundRect(ctx, x, y, 104, 150, 14)
    ctx.fill()
    ctx.fillStyle = '#0a0f1f'
    ctx.beginPath()
    if (index === 0) ctx.arc(x + 52, y + 66, 26, 0, Math.PI * 2)
    if (index === 1) {
      ctx.moveTo(x + 52, y + 36)
      ctx.lineTo(x + 82, y + 94)
      ctx.lineTo(x + 22, y + 94)
    }
    if (index === 2) {
      ctx.moveTo(x + 52, y + 34)
      ctx.lineTo(x + 80, y + 66)
      ctx.lineTo(x + 52, y + 98)
      ctx.lineTo(x + 24, y + 66)
    }
    if (index === 3) ctx.rect(x + 28, y + 42, 48, 48)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(x + 22, y + 116, 60, 10)
  })

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 62px ${LATIN}`
  spaced(ctx, '7px')
  ctx.fillText('KAMIHIKI', width / 2, height * 0.115)
  spaced(ctx, '2px')
  ctx.font = `700 26px ${GOTHIC}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  ctx.fillText('攻城バトルRPG', width / 2, height * 0.165)
}

const drawTabemo: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#fbf6ec'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#0a1b20'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 82px ${GOTHIC}`
  ctx.fillText('タベモ', width / 2, height * 0.13)
  ctx.font = `700 28px ${GOTHIC}`
  ctx.fillStyle = '#4b5b61'
  ctx.fillText('どっちが上？', width / 2, height * 0.2)

  const plates: [number, string, string][] = [
    [width * 0.27, '#d4763a', '#f0b074'],
    [width * 0.73, '#7d9b45', '#c4d59a'],
  ]
  plates.forEach(([x, food, garnish]) => {
    const y = height * 0.4
    ctx.fillStyle = '#e4dccb'
    ctx.beginPath()
    ctx.arc(x, y, 112, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, 98, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = food
    ctx.beginPath()
    ctx.arc(x - 8, y + 6, 58, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = garnish
    ctx.beginPath()
    ctx.arc(x + 30, y - 26, 24, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#0a1b20'
  ctx.beginPath()
  ctx.arc(width / 2, height * 0.4, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fbf6ec'
  ctx.font = `800 22px ${LATIN}`
  ctx.fillText('VS', width / 2, height * 0.402)

  const ranks = [0.74, 0.58, 0.44]
  ranks.forEach((value, index) => {
    const y = height * (0.6 + index * 0.09)
    ctx.fillStyle = '#0a1b20'
    ctx.font = `800 34px ${LATIN}`
    ctx.fillText(String(index + 1), 62, y)
    ctx.fillStyle = index === 0 ? '#d4763a' : '#e4dccb'
    roundRect(ctx, 104, y - 26, (width - 150) * value, 52, 26)
    ctx.fill()
  })
  ctx.fillStyle = '#e4dccb'
  ctx.fillRect(0, height * 0.9, width, 2)
  ;[0.25, 0.5, 0.75].forEach((x, index) => {
    ctx.fillStyle = index === 1 ? '#d4763a' : '#c9c1b0'
    ctx.beginPath()
    ctx.arc(width * x, height * 0.945, 15, 0, Math.PI * 2)
    ctx.fill()
  })
}

const drawShigosen: Draw = (ctx, width, height) => {
  const night = ctx.createLinearGradient(0, 0, 0, height)
  night.addColorStop(0, '#04131b')
  night.addColorStop(1, '#0c3340')
  ctx.fillStyle = night
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const cy = height * 0.56
  const radius = width * 0.62
  ctx.strokeStyle = 'rgba(164, 252, 232, 0.2)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
  ;[0.34, 0.68].forEach((scale) => {
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius * scale, radius, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius, radius * scale, 0, 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.strokeStyle = '#5cf4d7'
  ctx.lineWidth = 5
  ctx.shadowColor = '#5cf4d7'
  ctx.shadowBlur = 26
  ctx.beginPath()
  ctx.moveTo(cx, cy - radius)
  ctx.lineTo(cx, cy + radius)
  ctx.stroke()
  ctx.fillStyle = '#f1f9f7'
  ctx.beginPath()
  ctx.arc(cx, cy - radius * 0.28, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.fillStyle = '#f1f9f7'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 92px ${MINCHO}`
  ctx.fillText('子午線', cx, height * 0.13)
  ctx.font = `600 26px ${LATIN}`
  ctx.fillStyle = 'rgba(241, 249, 247, 0.7)'
  spaced(ctx, '3px')
  ctx.fillText('Life OS', cx, height * 0.195)
  spaced(ctx, '0px')
}

const drawCardBox: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#f1ead9'
  ctx.fillRect(0, 0, width, height)
  const cx = width / 2
  const cy = height * 0.36
  ctx.strokeStyle = '#0a1b20'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.arc(cx, cy, 168, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 6
  for (let tick = 0; tick < 12; tick += 1) {
    const angle = (tick / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.sin(angle) * 132, cy - Math.cos(angle) * 132)
    ctx.lineTo(cx + Math.sin(angle) * 150, cy - Math.cos(angle) * 150)
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy + 84)
  ctx.stroke()
  ctx.lineWidth = 10
  ctx.strokeStyle = '#d4763a'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - 118)
  ctx.stroke()
  ctx.fillStyle = '#0a1b20'
  ctx.beginPath()
  ctx.arc(cx, cy, 14, 0, Math.PI * 2)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 84px ${GOTHIC}`
  ctx.fillText('定時退社', cx, height * 0.68)
  ctx.fillText('バトロワ', cx, height * 0.79)
  ctx.fillStyle = '#d4763a'
  ctx.fillRect(0, height * 0.88, width, height * 0.12)
  ctx.fillStyle = '#fbf6ec'
  ctx.font = `700 30px ${GOTHIC}`
  ctx.fillText('オフィス・カードゲーム', cx, height * 0.942)
}

const drawCardFace: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#fbf8f0'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#0a1b20'
  ctx.lineWidth = 8
  roundRect(ctx, 16, 16, width - 32, height - 32, 18)
  ctx.stroke()
  ctx.fillStyle = '#d4763a'
  ctx.font = `800 50px ${LATIN}`
  ctx.textBaseline = 'middle'
  ctx.fillText('18', 36, 66)
  ctx.fillStyle = '#0a1b20'
  ctx.textAlign = 'center'
  ctx.font = `700 76px ${GOTHIC}`
  ctx.fillText('定時', width / 2, height * 0.52)
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(width / 2, height * 0.78, 34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(width / 2, height * 0.78 - 20)
  ctx.lineTo(width / 2, height * 0.78 + 16)
  ctx.stroke()
}

const drawNoren: Draw = (ctx, width, height) => {
  ctx.fillStyle = '#213f66'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  for (let line = 0; line < height; line += 6) ctx.fillRect(0, line, width, 2)
  ctx.fillStyle = '#efe8d8'
  const markSize = height * 0.5
  ctx.save()
  ctx.translate((width - markSize) / 2, height * 0.24)
  ctx.scale(markSize / 546, markSize / 546)
  ctx.translate(17, 0)
  ctx.fill(new Path2D(BRAND_MARK_PATH), 'evenodd')
  ctx.restore()
}

const drawDoorway: Draw = (ctx, width, height) => {
  const glow = ctx.createLinearGradient(0, 0, 0, height)
  glow.addColorStop(0, '#0a1114')
  glow.addColorStop(0.55, '#1c2422')
  glow.addColorStop(1, '#b08a52')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  const pool = ctx.createRadialGradient(width / 2, height, 10, width / 2, height, width * 0.9)
  pool.addColorStop(0, 'rgba(255, 221, 160, 0.75)')
  pool.addColorStop(1, 'rgba(255, 221, 160, 0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, width, height)
}

const standard = (parameters: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(parameters)

const screen = (map: THREE.Texture) =>
  standard({
    color: 0x05080a,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: 0.92,
    roughness: 0.18,
    metalness: 0,
  })

const printed = (map: THREE.Texture, roughness = 0.6) => standard({ map, roughness })

export type Kit = ReturnType<typeof createKit>

/** Every material and canvas texture the room uses. Call after web fonts load. */
export function createKit(anisotropy: number) {
  const texture = (width: number, height: number, draw: Draw) =>
    canvasTexture(width, height, draw, anisotropy)

  const perforation = texture(64, 64, drawPerforation)
  perforation.wrapS = THREE.RepeatWrapping
  perforation.wrapT = THREE.RepeatWrapping

  const textures = {
    wallLogo: texture(2048, 360, drawWallLogo),
    perforation,
    segments: texture(160, 64, drawSegments),
    hmi: texture(512, 320, drawHmi),
    ssdLabel: texture(400, 480, drawDriveLabel('NVMe SSD', '3.84TB', 'U.2  PCIe 4.0')),
    hddLabel: texture(400, 480, drawDriveLabel('Enterprise HDD', '16TB', 'SAS 12Gb/s  7200rpm')),
    ddr5Label: texture(360, 110, drawMemoryLabel('64GB DDR5 RDIMM')),
    ddr4Label: texture(360, 110, drawMemoryLabel('32GB DDR4 RDIMM')),
    kamihiki: texture(540, 1170, drawKamihiki),
    tabemo: texture(540, 1170, drawTabemo),
    shigosen: texture(540, 1170, drawShigosen),
    cardBox: texture(600, 800, drawCardBox),
    cardFace: texture(300, 440, drawCardFace),
    noren: texture(1024, 640, drawNoren),
    doorway: texture(256, 512, drawDoorway),
  }

  const mat = {
    wall: standard({ color: COLORS.wall, roughness: 0.96 }),
    floor: standard({ color: COLORS.floor, roughness: 0.82 }),
    ceiling: new THREE.MeshBasicMaterial({ color: COLORS.ceiling, toneMapped: false }),
    skirting: standard({ color: 0xdbe3e1, roughness: 0.8 }),
    wallLogo: standard({
      map: textures.wallLogo,
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
    }),

    panel: standard({ map: textures.perforation, roughness: 0.55, metalness: 0.35 }),
    panelEdge: standard({ color: 0x143945, roughness: 0.45, metalness: 0.5 }),
    wire: standard({ color: 0x15181a, roughness: 0.45, metalness: 0.65 }),
    hinoki: standard({ color: 0xe2cda6, roughness: 0.72 }),
    hinokiBack: standard({ color: 0xd0b98f, roughness: 0.8 }),
    ledge: standard({ color: 0xf6f7f5, roughness: 0.5 }),
    woodDark: standard({ color: 0x3a2a20, roughness: 0.62 }),
    bamboo: standard({ color: 0xcfb47c, roughness: 0.6, side: THREE.DoubleSide }),

    ivory: standard({ color: 0xe8e5db, roughness: 0.55 }),
    paintGrey: standard({ color: 0xc4cbc9, roughness: 0.5, metalness: 0.15 }),
    darkPlastic: standard({ color: 0x23292b, roughness: 0.5 }),
    black: standard({ color: 0x111315, roughness: 0.42 }),
    alu: standard({ color: 0xd2d7d6, roughness: 0.32, metalness: 0.9 }),
    steel: standard({ color: 0xa3acae, roughness: 0.26, metalness: 1 }),
    blade: standard({ color: 0xdfe4e6, roughness: 0.18, metalness: 1 }),
    steelDark: standard({ color: 0x2b3134, roughness: 0.45, metalness: 0.7 }),
    terminal: standard({ color: 0x2f9063, roughness: 0.5 }),
    pcb: standard({ color: 0x1d6d49, roughness: 0.45, metalness: 0.1 }),
    pcbDark: standard({ color: 0x12241d, roughness: 0.42, metalness: 0.1 }),
    gold: standard({ color: 0xdcb65e, roughness: 0.3, metalness: 1 }),
    chip: standard({ color: 0x0e1011, roughness: 0.36 }),
    label: standard({ color: 0xf5f6f3, roughness: 0.7 }),
    mint: standard({ color: COLORS.mint, roughness: 0.4 }),
    led: standard({
      color: 0x0a2b25,
      emissive: COLORS.mint,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    }),

    porcelain: standard({ color: 0xf4f1ea, roughness: 0.2 }),
    porcelainOpen: standard({ color: 0xf4f1ea, roughness: 0.2, side: THREE.DoubleSide }),
    celadon: standard({ color: 0xa5c9bc, roughness: 0.2 }),
    raku: standard({ color: 0x1b1c1d, roughness: 0.42, side: THREE.DoubleSide }),
    indigo: standard({ color: 0x27476f, roughness: 0.95 }),
    indigoGloss: standard({ color: 0x1e3a5f, roughness: 0.26 }),
    kinari: standard({ color: 0xf0e9da, roughness: 0.96 }),
    clothGrey: standard({ color: 0xb7c3cb, roughness: 0.96 }),
    persimmon: standard({ color: 0xd4763a, roughness: 0.5 }),
    matcha: standard({ color: 0x86a346, roughness: 0.36 }),
    matchaTin: standard({ color: 0x50702f, roughness: 0.38, metalness: 0.35 }),
    paper: standard({ color: 0xf7f4ec, roughness: 0.85 }),

    phone: standard({ color: 0x14181a, roughness: 0.34, metalness: 0.55 }),
    boxSide: standard({ color: 0x0a1b20, roughness: 0.6 }),

    hmiScreen: screen(textures.hmi),
    segments: screen(textures.segments),
    kamihiki: screen(textures.kamihiki),
    tabemo: screen(textures.tabemo),
    shigosen: screen(textures.shigosen),
    ssdLabel: printed(textures.ssdLabel),
    hddLabel: printed(textures.hddLabel),
    ddr5Label: printed(textures.ddr5Label),
    ddr4Label: printed(textures.ddr4Label),
    cardBox: printed(textures.cardBox, 0.5),
    cardFace: printed(textures.cardFace, 0.5),
    noren: standard({ map: textures.noren, roughness: 0.95, side: THREE.DoubleSide }),
    doorway: standard({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: textures.doorway,
      emissiveIntensity: 0.9,
      roughness: 1,
    }),
  }

  return {
    mat,
    textures,
    dispose() {
      Object.values(mat).forEach((material) => material.dispose())
      Object.values(textures).forEach((map) => map.dispose())
    },
  }
}
