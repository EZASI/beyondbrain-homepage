import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { itemKey, lines, type LineId, type StationId } from './content'
import { buildFixture, type Fixture, type FixtureKind } from './fixtures'
import { buildItem } from './items'
import { COLORS, createKit, type Kit } from './kit'

/** The room is a regular octagon; five neighbouring walls each carry one business line. */
const ROOM_RADIUS = 6
const ROOM_HEIGHT = 4.8
const WALL_STEP = Math.PI / 4
const WALL_WIDTH = 2 * ROOM_RADIUS * Math.tan(WALL_STEP / 2)
const LOGO_WIDTH = 3.3
const LOGO_HEIGHT = LOGO_WIDTH * (360 / 2048)

const LIFT_DEPTH = 0.55
const LIFT_SCALE = 1.12
const VEIL_OPACITY = 0.93
/** Presented items are viewed from slightly above, like a product photograph. */
const FOCUS_PITCH = -0.17
const FOCUS_LAYER = 1

const FIXTURES: Record<LineId, FixtureKind> = {
  wholesale: 'cubby',
  'server-parts': 'rack',
  'fa-parts': 'panel',
  games: 'ledges',
  'japan-entry': 'doorway',
}

export type ShowroomEvents = {
  onReady: () => void
  onHover: (key: string | null) => void
  onPickItem: (key: string) => void
  onPickStation: (id: LineId) => void
  onBackground: () => void
  onMotion: (moving: boolean) => void
  onSwipe: (step: 1 | -1) => void
}

type Pose = { position: THREE.Vector3; yaw: number; pitch: number; fov: number }

type Ease = (t: number) => number

/** A clock-driven transition; advanced once per frame and finished on time even if frames are slow. */
type Motion = {
  start: number
  duration: number
  ease: Ease
  update: (value: number) => void
  done?: () => void
}

const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeInOutQuad: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeOutQuad: Ease = (t) => 1 - (1 - t) * (1 - t)

type ItemEntry = {
  key: string
  lineId: LineId
  pivot: THREE.Group
  model: THREE.Group
  home: THREE.Vector3
  size: THREE.Vector3
  centre: THREE.Vector3
  canLift: boolean
  lift: number
  hover: number
  motion: Motion | null
}

type Station = {
  id: LineId
  angle: number
  root: THREE.Group
  fixture: Fixture
  items: ItemEntry[]
}

declare global {
  interface Window {
    __SHOWROOM__?: ShowroomScene
  }
}

const radians = THREE.MathUtils.degToRad
const clamp = THREE.MathUtils.clamp

/** Unit vector pointing from the room centre toward the wall at `angle`. */
function toward(angle: number, target = new THREE.Vector3()) {
  return target.set(Math.sin(angle), 0, -Math.cos(angle))
}

/** Unit vector pointing to a visitor's right when they face the wall at `angle`. */
function rightOf(angle: number, target = new THREE.Vector3()) {
  return target.set(Math.cos(angle), 0, Math.sin(angle))
}

function shortestTurn(from: number, to: number) {
  const full = Math.PI * 2
  return ((((to - from) % full) + full + Math.PI) % full) - Math.PI
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose()
  })
}

export class ShowroomScene {
  private readonly mount: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly events: ShowroomEvents
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60)
  private readonly veilScene = new THREE.Scene()
  private readonly veilCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly veilMaterial = new THREE.MeshBasicMaterial({
    color: 0xeef3f1,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 1.15)
  private readonly environment: THREE.Texture
  private readonly kit: Kit
  private readonly room = new THREE.Group()
  private readonly wallLogo: THREE.Mesh
  private readonly stationsRoot = new THREE.Group()
  private readonly stations = new Map<LineId, Station>()
  private readonly entries = new Map<string, ItemEntry>()
  private readonly lifted = new Set<ItemEntry>()
  private readonly tags = new Map<string, HTMLElement>()
  private readonly raycaster = new THREE.Raycaster()
  private readonly abort = new AbortController()
  private readonly resizeObserver: ResizeObserver
  private readonly reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private readonly finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

  private width = 1
  private height = 1
  private portrait = false
  private station: StationId = 'home'
  private focusKey: string | null = null
  private hoverKey: string | null = null

  private from: Pose
  private to: Pose
  private progress = 1
  private readonly motions = new Set<Motion>()
  private moveMotion: Motion | null = null
  private veilMotion: Motion | null = null
  private veil = 0
  private moving = false

  private readonly pointer = new THREE.Vector2()
  private readonly drift = new THREE.Vector2()
  private pointerInside = false
  private press: { x: number; y: number; time: number } | null = null

  private frameId = 0
  private wakeFrames = 4
  private shadowDirty = true
  private lightYaw = Number.NaN
  private disposed = false
  private readonly startedAt = performance.now()

  private readonly tmpA = new THREE.Vector3()
  private readonly tmpB = new THREE.Vector3()
  private readonly tmpC = new THREE.Vector3()

  constructor(mount: HTMLElement, canvas: HTMLCanvasElement, events: ShowroomEvents) {
    this.mount = mount
    this.canvas = canvas
    this.events = events

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(COLORS.wall, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 0.96
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false

    this.kit = createKit(this.renderer.capabilities.getMaxAnisotropy())

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const studio = new RoomEnvironment()
    this.environment = pmrem.fromScene(studio, 0.04).texture
    pmrem.dispose()
    disposeTree(studio)
    this.scene.environment = this.environment
    this.scene.environmentIntensity = 0.5

    this.buildLights()
    this.buildRoom()
    this.wallLogo = this.buildWallLogo()
    this.scene.add(this.room, this.stationsRoot)
    this.veilScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.veilMaterial))

    this.measure()
    this.buildStations()
    this.from = this.stationPose('home')
    this.to = this.from
    this.camera.rotation.order = 'YXZ'

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(mount)
    this.bindEvents()
    this.resize()

    if (import.meta.env.DEV) window.__SHOWROOM__ = this
    this.frameId = requestAnimationFrame(this.frame)
    this.events.onReady()
  }

  /* ── Public API ──────────────────────────────────────────────────── */

  /** Walks the camera to a wall (or back to the overview). */
  goTo(id: StationId, immediate = false) {
    if (id === this.station && this.focusKey === null && !immediate) return
    this.station = id
    if (this.focusKey !== null) this.releaseFocus()
    this.travel(this.stationPose(id), immediate ? 0 : undefined)
  }

  /** Brings one item forward and ghosts the rest of the room, or releases it with `null`. */
  focus(key: string | null) {
    if (key === this.focusKey) return
    const entry = key ? this.entries.get(key) : undefined
    if (!entry) {
      if (this.focusKey === null) return
      this.releaseFocus()
      this.travel(this.stationPose(this.station), this.duration(0.9))
      return
    }
    const previous = this.focusKey ? this.entries.get(this.focusKey) : undefined
    if (previous) this.setLift(previous, 0)
    this.focusKey = entry.key
    this.station = entry.lineId
    this.setLift(entry, 1)
    this.setVeil(1)
    this.setHover(null)
    this.travel(this.focusPose(entry), this.duration(previous ? 0.75 : 1))
  }

  /** Registers the label element that should follow an item on screen. */
  setTag(key: string, element: HTMLElement | null) {
    if (element) this.tags.set(key, element)
    else this.tags.delete(key)
    this.wake()
  }

  /** Plays the one-off arrival move into the room. */
  enter() {
    if (this.reducedQuery.matches || this.station !== 'home') return
    const target = this.stationPose('home')
    const start: Pose = {
      ...target,
      position: target.position.clone().add(new THREE.Vector3(0, 0.45, 2.2)),
      fov: target.fov + 5,
    }
    this.from = start
    this.to = start
    this.progress = 1
    this.travel(target, 2.2, easeOutQuad)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.abort.abort()
    this.resizeObserver.disconnect()
    this.motions.clear()
    this.clearStations()
    disposeTree(this.room)
    disposeTree(this.veilScene)
    this.veilMaterial.dispose()
    this.keyLight.shadow.dispose()
    this.environment.dispose()
    this.kit.dispose()
    this.renderer.dispose()
    if (window.__SHOWROOM__ === this) delete window.__SHOWROOM__
  }

  /* ── Building ────────────────────────────────────────────────────── */

  private buildLights() {
    const sky = new THREE.HemisphereLight(0xffffff, 0xdbe4e2, 0.85)
    sky.layers.enableAll()

    const key = this.keyLight
    key.layers.enableAll()
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -7.5
    key.shadow.camera.right = 7.5
    key.shadow.camera.top = 5.5
    key.shadow.camera.bottom = -5.5
    key.shadow.camera.near = 1
    key.shadow.camera.far = 26
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.018
    key.shadow.radius = 3.2
    key.shadow.intensity = 0.82
    this.scene.add(sky, key, key.target)
  }

  private buildRoom() {
    const { mat } = this.kit
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mat.floor)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mat.ceiling)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = ROOM_HEIGHT
    this.room.add(floor, ceiling)

    const wall = new THREE.PlaneGeometry(WALL_WIDTH + 0.02, ROOM_HEIGHT)
    const skirting = new THREE.BoxGeometry(WALL_WIDTH + 0.02, 0.09, 0.02)
    for (let index = 0; index < 8; index += 1) {
      const angle = index * WALL_STEP
      const panel = new THREE.Group()
      panel.position.copy(toward(angle)).multiplyScalar(ROOM_RADIUS)
      panel.rotation.y = -angle
      const surface = new THREE.Mesh(wall, mat.wall)
      surface.position.y = ROOM_HEIGHT / 2
      surface.receiveShadow = true
      const base = new THREE.Mesh(skirting, mat.skirting)
      base.position.set(0, 0.045, 0.01)
      panel.add(surface, base)
      this.room.add(panel)
    }

  }

  /** The brand lettering on the centre wall, above that wall's display. */
  private buildWallLogo() {
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(LOGO_WIDTH, LOGO_HEIGHT),
      this.kit.mat.wallLogo,
    )
    logo.position.copy(toward(0)).multiplyScalar(ROOM_RADIUS - 0.006)
    logo.receiveShadow = true
    this.room.add(logo)
    return logo
  }

  private clearStations() {
    this.stations.forEach((station) => {
      this.stationsRoot.remove(station.root)
      disposeTree(station.root)
    })
    this.stations.clear()
    this.entries.forEach((entry) => this.stop(entry.motion))
    this.entries.clear()
    this.lifted.clear()
  }

  private buildStations() {
    this.clearStations()
    const middle = (lines.length - 1) / 2
    lines.forEach((line, index) => {
      const kind = FIXTURES[line.id]
      const count = line.items.length
      const cols = count >= 6 ? (this.portrait ? 2 : 3) : 2
      const rows = Math.ceil(count / cols)
      const fixture = buildFixture(kind, cols, rows, this.kit)
      const angle = (index - middle) * WALL_STEP

      const root = new THREE.Group()
      root.position.copy(toward(angle)).multiplyScalar(ROOM_RADIUS)
      root.rotation.y = -angle
      root.add(fixture.group)

      const station: Station = { id: line.id, angle, root, fixture, items: [] }
      line.items.forEach((item, itemIndex) => {
        const key = itemKey(line, item)
        const model = buildItem(key, this.kit)
        const bounds = new THREE.Box3().setFromObject(model)
        const pivot = new THREE.Group()
        const home = fixture.cells[itemIndex] ?? fixture.cells[0]
        pivot.position.copy(home)
        pivot.add(model)
        pivot.userData.key = key
        root.add(pivot)
        const entry: ItemEntry = {
          key,
          lineId: line.id,
          pivot,
          model,
          home: home.clone(),
          size: bounds.getSize(new THREE.Vector3()),
          centre: bounds.getCenter(new THREE.Vector3()),
          canLift: kind !== 'doorway',
          lift: 0,
          hover: 0,
          motion: null,
        }
        station.items.push(entry)
        this.entries.set(key, entry)
      })

      // Unseen backing plate, so a click anywhere on a display counts as that wall.
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(fixture.width + 0.3, fixture.height + 0.3),
        this.kit.mat.wall,
      )
      plate.position.set(0, fixture.bottom + fixture.height / 2, 0.012)
      plate.visible = false
      root.add(plate)

      root.userData.station = line.id
      this.stationsRoot.add(root)
      this.stations.set(line.id, station)
    })

    const centre = this.stations.get(lines[Math.round(middle)].id)
    const top = centre ? centre.fixture.bottom + centre.fixture.height : 2.6
    this.wallLogo.position.y = Math.max(3.86, top + 0.72 + LOGO_HEIGHT / 2)
    this.shadowDirty = true
  }

  /* ── Camera ──────────────────────────────────────────────────────── */

  private stationPose(id: StationId): Pose {
    const aspect = this.width / this.height
    if (id === 'home') return this.homePose()
    const station = this.stations.get(id)
    if (!station) return this.homePose()

    const fov = this.portrait ? 52 : 48
    const halfH = Math.tan(radians(fov) / 2)
    const halfW = halfH * aspect
    const { width, height, bottom } = station.fixture
    const fitH = this.portrait ? 0.54 : 0.47
    const fitW = this.portrait ? 0.92 : 0.5
    const distance = clamp(
      Math.max(height / 2 / (halfH * fitH), width / 2 / (halfW * fitW)),
      3,
      10.5,
    )
    const screenY = this.portrait ? 0.4 : 0.44
    const position = toward(station.angle).multiplyScalar(ROOM_RADIUS - distance)
    position.y = bottom + height / 2 - (0.5 - screenY) * 2 * distance * halfH
    return { position, yaw: -station.angle, pitch: 0, fov }
  }

  /** The overview: wide enough for three walls on a desk, the centre wall alone on a phone. */
  private homePose(): Pose {
    if (!this.portrait) {
      return { position: new THREE.Vector3(0, 1.5, 3.3), yaw: 0, pitch: 0, fov: 56 }
    }
    const fov = 60
    const halfH = Math.tan(radians(fov) / 2)
    const centre = this.stations.get(lines[Math.round((lines.length - 1) / 2)].id)
    const bottom = centre ? centre.fixture.bottom : 0.7
    const top = this.wallLogo.position.y + LOGO_HEIGHT / 2
    // Display and lettering together fill the upper part of the screen; the floor carries the copy.
    const distance = clamp((top - bottom) / (2 * halfH * 0.42), 4, 10.5)
    const position = new THREE.Vector3(0, 0, -(ROOM_RADIUS - distance))
    position.y = (top + bottom) / 2 - (0.5 - 0.335) * 2 * distance * halfH
    return { position, yaw: 0, pitch: 0, fov }
  }

  private focusPose(entry: ItemEntry): Pose {
    const station = this.stations.get(entry.lineId)
    const base = this.stationPose(entry.lineId)
    if (!station) return base

    const aspect = this.width / this.height
    const halfH = Math.tan(radians(base.fov) / 2)
    const halfW = halfH * aspect
    const scale = entry.canLift ? LIFT_SCALE : 1
    const itemW = Math.max(entry.size.x, entry.size.z * 0.9) * scale
    const itemH = entry.size.y * scale
    const fitH = this.portrait ? 0.29 : 0.48
    const fitW = this.portrait ? 0.66 : 0.32
    const distance = clamp(
      Math.max(itemH / 2 / (halfH * fitH), itemW / 2 / (halfW * fitW)),
      0.8,
      9,
    )
    const screenX = this.portrait ? 0.5 : 0.33
    const screenY = this.portrait ? 0.31 : 0.47

    const centre = this.tmpA
      .copy(entry.centre)
      .multiplyScalar(scale)
      .add(entry.home)
    if (entry.canLift) centre.z += LIFT_DEPTH
    station.root.localToWorld(centre)

    const pitch = entry.canLift ? FOCUS_PITCH : 0
    const yaw = -station.angle
    const view = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
    const forward = this.tmpB.set(0, 0, -1).applyQuaternion(view)
    const up = this.tmpC.set(0, 1, 0).applyQuaternion(view)
    const position = centre
      .clone()
      .addScaledVector(forward, -distance)
      .addScaledVector(up, -(0.5 - screenY) * 2 * distance * halfH)
      .addScaledVector(rightOf(station.angle), (0.5 - screenX) * 2 * distance * halfW)
    return { position, yaw, pitch, fov: base.fov }
  }

  private currentPose(): Pose {
    const t = this.progress
    return {
      position: this.from.position.clone().lerp(this.to.position, t),
      yaw: this.from.yaw + (this.to.yaw - this.from.yaw) * t,
      pitch: this.from.pitch + (this.to.pitch - this.from.pitch) * t,
      fov: this.from.fov + (this.to.fov - this.from.fov) * t,
    }
  }

  private duration(seconds: number) {
    return this.reducedQuery.matches ? 0 : seconds
  }

  private animate(
    seconds: number,
    ease: Ease,
    update: (value: number) => void,
    done?: () => void,
  ) {
    const motion: Motion = {
      start: performance.now(),
      duration: seconds * 1000,
      ease,
      update,
      done,
    }
    this.motions.add(motion)
    this.wake()
    return motion
  }

  private stop(motion: Motion | null) {
    if (motion) this.motions.delete(motion)
  }

  private advanceMotions(now: number) {
    if (this.motions.size === 0) return
    for (const motion of [...this.motions]) {
      const t = clamp((now - motion.start) / motion.duration, 0, 1)
      motion.update(motion.ease(t))
      if (t >= 1 && this.motions.delete(motion)) motion.done?.()
    }
    this.wake()
  }

  private travel(target: Pose, seconds?: number, ease: Ease = easeInOutCubic) {
    const start = this.currentPose()
    const turn = shortestTurn(start.yaw, target.yaw)
    const time =
      seconds ?? this.duration(0.95 + Math.min(Math.abs(turn) / (Math.PI / 2), 2) * 0.4)
    this.stop(this.moveMotion)
    this.from = start
    this.to = { ...target, yaw: start.yaw + turn }

    if (time <= 0) {
      this.progress = 1
      this.moving = false
      this.events.onMotion(false)
      this.wake()
      return
    }
    this.progress = 0
    this.setMoving(true)
    this.moveMotion = this.animate(
      time,
      ease,
      (value) => {
        this.progress = value
      },
      () => {
        this.progress = 1
        this.setMoving(false)
      },
    )
  }

  private setMoving(moving: boolean) {
    if (moving === this.moving) return
    this.moving = moving
    this.events.onMotion(moving)
  }

  /* ── Focus ───────────────────────────────────────────────────────── */

  private releaseFocus() {
    const entry = this.focusKey ? this.entries.get(this.focusKey) : undefined
    this.focusKey = null
    if (entry) this.setLift(entry, 0)
    this.setVeil(0)
  }

  private setLift(entry: ItemEntry, value: number) {
    this.stop(entry.motion)
    const time = this.duration(value > 0 ? 0.9 : 0.6)
    if (value > 0) {
      this.lifted.add(entry)
      entry.pivot.traverse((object) => object.layers.enable(FOCUS_LAYER))
    }
    const settle = () => {
      entry.lift = value
      if (value === 0) {
        this.lifted.delete(entry)
        entry.pivot.traverse((object) => object.layers.disable(FOCUS_LAYER))
        entry.model.rotation.set(0, 0, 0)
      }
      this.wake()
    }
    if (time <= 0) {
      settle()
      return
    }
    const from = entry.lift
    entry.motion = this.animate(
      time,
      easeInOutCubic,
      (t) => {
        entry.lift = from + (value - from) * t
      },
      settle,
    )
  }

  private setVeil(value: number) {
    this.stop(this.veilMotion)
    const time = this.duration(value > 0 ? 0.8 : 0.6)
    if (time <= 0) {
      this.veil = value
      this.wake()
      return
    }
    const from = this.veil
    this.veilMotion = this.animate(time, easeInOutQuad, (t) => {
      this.veil = from + (value - from) * t
    })
  }

  private setHover(key: string | null) {
    if (key === this.hoverKey) return
    this.hoverKey = key
    this.canvas.style.cursor = key ? 'pointer' : ''
    this.events.onHover(key)
    this.wake()
  }

  /* ── Input ───────────────────────────────────────────────────────── */

  private bindEvents() {
    const { signal } = this.abort
    const canvas = this.canvas

    canvas.addEventListener(
      'pointermove',
      (event) => {
        const rect = canvas.getBoundingClientRect()
        this.pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
        this.pointerInside = true
        if (event.pointerType === 'mouse' && !this.moving) this.updateHover()
        this.wake()
      },
      { signal },
    )
    canvas.addEventListener(
      'pointerleave',
      () => {
        this.pointerInside = false
        this.setHover(null)
        this.wake()
      },
      { signal },
    )
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        this.press = { x: event.clientX, y: event.clientY, time: performance.now() }
      },
      { signal },
    )
    canvas.addEventListener(
      'pointerup',
      (event) => {
        const press = this.press
        this.press = null
        if (!press) return
        const dx = event.clientX - press.x
        const dy = event.clientY - press.y
        const held = performance.now() - press.time
        if (Math.hypot(dx, dy) < 10 && held < 600) {
          const rect = canvas.getBoundingClientRect()
          this.pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          )
          this.click()
        } else if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          this.events.onSwipe(dx < 0 ? 1 : -1)
        }
      },
      { signal },
    )
    canvas.addEventListener('pointercancel', () => (this.press = null), { signal })

    const onContextLost = (event: Event) => event.preventDefault()
    canvas.addEventListener('webglcontextlost', onContextLost, { signal })
    canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.shadowDirty = true
        this.wake()
      },
      { signal },
    )
    document.addEventListener('visibilitychange', () => this.wake(), { signal })
  }

  /** What is under the pointer: an item on this wall, or another wall's display. */
  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.stationsRoot.children, true)[0]
    if (!hit) return null
    let key: string | undefined
    let stationId: LineId | undefined
    for (let node: THREE.Object3D | null = hit.object; node; node = node.parent) {
      if (!key && typeof node.userData.key === 'string') key = node.userData.key
      if (typeof node.userData.station === 'string') {
        stationId = node.userData.station as LineId
        break
      }
    }
    return stationId ? { stationId, key } : null
  }

  private updateHover() {
    if (this.focusKey !== null) {
      this.setHover(null)
      return
    }
    const target = this.pick()
    this.setHover(target && target.stationId === this.station ? (target.key ?? null) : null)
    if (target && target.stationId !== this.station) this.canvas.style.cursor = 'pointer'
  }

  private click() {
    if (this.focusKey !== null) {
      this.events.onBackground()
      return
    }
    const target = this.pick()
    if (!target) {
      this.events.onBackground()
      return
    }
    if (target.stationId !== this.station) this.events.onPickStation(target.stationId)
    else if (target.key) this.events.onPickItem(target.key)
  }

  /* ── Frame ───────────────────────────────────────────────────────── */

  private wake(frames = 3) {
    this.wakeFrames = Math.max(this.wakeFrames, frames)
  }

  private measure() {
    this.width = Math.max(this.mount.clientWidth, 1)
    this.height = Math.max(this.mount.clientHeight, 1)
    const portrait = this.width / this.height < 0.82
    const changed = portrait !== this.portrait
    this.portrait = portrait
    return changed
  }

  private resize() {
    if (this.disposed) return
    const layoutChanged = this.measure()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height

    if (layoutChanged) {
      const focus = this.focusKey
      this.buildStations()
      this.focusKey = null
      this.veil = 0
      if (focus) this.events.onBackground()
    }
    if (!this.moving) {
      const entry = this.focusKey ? this.entries.get(this.focusKey) : undefined
      const pose = entry ? this.focusPose(entry) : this.stationPose(this.station)
      this.from = pose
      this.to = pose
      this.progress = 1
    } else {
      const entry = this.focusKey ? this.entries.get(this.focusKey) : undefined
      const pose = entry ? this.focusPose(entry) : this.stationPose(this.station)
      this.to = { ...pose, yaw: this.to.yaw }
    }
    this.wake(4)
  }

  private updateLight(yaw: number) {
    if (Math.abs(yaw - this.lightYaw) < 0.0005) return
    this.lightYaw = yaw
    const angle = -yaw
    const forward = toward(angle, this.tmpA)
    const right = rightOf(angle, this.tmpB)
    const target = this.keyLight.target.position.copy(forward).multiplyScalar(ROOM_RADIUS)
    target.y = 1.9
    this.keyLight.position
      .copy(target)
      .addScaledVector(forward, -8.5)
      .addScaledVector(right, -3.4)
    this.keyLight.position.y = 8
    this.keyLight.target.updateMatrixWorld()
    this.shadowDirty = true
  }

  private applyItems(time: number) {
    const sway = this.reducedQuery.matches ? 0 : Math.sin(time * 0.55) * 0.42
    this.entries.forEach((entry) => {
      const hoverTarget = entry.key === this.hoverKey ? 1 : 0
      if (Math.abs(hoverTarget - entry.hover) > 0.002) {
        entry.hover += (hoverTarget - entry.hover) * 0.18
        this.wake()
      } else {
        entry.hover = hoverTarget
      }
      const lift = entry.canLift ? entry.lift : 0
      entry.pivot.position.copy(entry.home)
      entry.pivot.position.z += lift * LIFT_DEPTH + entry.hover * 0.03
      entry.pivot.scale.setScalar(1 + lift * (LIFT_SCALE - 1) + entry.hover * 0.035)
      if (lift > 0) entry.model.rotation.y = sway * lift
    })
  }

  private placeTags() {
    if (this.tags.size === 0) return
    const station = this.station === 'home' ? undefined : this.stations.get(this.station)
    this.tags.forEach((element, key) => {
      const entry = this.entries.get(key)
      if (!entry || !station || entry.lineId !== station.id) {
        element.style.visibility = 'hidden'
        return
      }
      const anchor = this.tmpA.copy(entry.home)
      anchor.y -= entry.canLift ? 0.03 : 0.16
      anchor.z += entry.canLift ? 0.2 : 0.02
      station.root.localToWorld(anchor)
      anchor.project(this.camera)
      const x = (anchor.x * 0.5 + 0.5) * this.width
      const y = (-anchor.y * 0.5 + 0.5) * this.height
      element.style.visibility = anchor.z < 1 ? 'visible' : 'hidden'
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`
    })
  }

  private draw() {
    const renderer = this.renderer
    if (this.shadowDirty) {
      renderer.shadowMap.needsUpdate = true
      this.shadowDirty = false
    }
    if (this.veil < 0.002 && this.lifted.size === 0) {
      renderer.render(this.scene, this.camera)
      return
    }
    // Room without the presented item, then a wash of wall colour, then the item on top.
    this.lifted.forEach((entry) => (entry.pivot.visible = false))
    renderer.render(this.scene, this.camera)
    renderer.autoClear = false
    this.veilMaterial.opacity = this.veil * VEIL_OPACITY
    renderer.render(this.veilScene, this.veilCamera)
    renderer.clearDepth()
    this.lifted.forEach((entry) => (entry.pivot.visible = true))
    this.camera.layers.set(FOCUS_LAYER)
    renderer.render(this.scene, this.camera)
    this.camera.layers.set(0)
    renderer.autoClear = true
  }

  private readonly frame = () => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.frame)
    if (document.hidden) return

    const now = performance.now()
    const time = (now - this.startedAt) / 1000
    this.advanceMotions(now)
    const parallax = this.finePointer.matches && !this.reducedQuery.matches
    const targetX = parallax && this.pointerInside ? this.pointer.x : 0
    const targetY = parallax && this.pointerInside ? this.pointer.y : 0
    if (Math.abs(targetX - this.drift.x) + Math.abs(targetY - this.drift.y) > 0.0015) {
      this.drift.x += (targetX - this.drift.x) * 0.06
      this.drift.y += (targetY - this.drift.y) * 0.06
      this.wake()
    }
    if (this.lifted.size > 0 && !this.reducedQuery.matches) this.wake()
    if (this.wakeFrames <= 0) return
    this.wakeFrames -= 1

    const pose = this.currentPose()
    const strength = this.focusKey ? 0.35 : 1
    const right = rightOf(-pose.yaw, this.tmpC)
    this.camera.position
      .copy(pose.position)
      .addScaledVector(right, this.drift.x * 0.09 * strength)
    this.camera.position.y += this.drift.y * 0.05 * strength
    this.camera.rotation.set(
      pose.pitch + this.drift.y * 0.008 * strength,
      pose.yaw - this.drift.x * 0.014 * strength,
      0,
    )
    if (Math.abs(this.camera.fov - pose.fov) > 0.001) this.camera.fov = pose.fov
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()

    this.updateLight(pose.yaw)
    this.applyItems(time)
    this.draw()
    this.placeTags()
  }
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}
