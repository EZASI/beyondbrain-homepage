import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const DURATION = 24
const FORTUNE_TIME_ANGLE = ((22 * 60 + 59) / 1440) * Math.PI * 2

const PALETTE = {
  background: 0x050b0f,
  fog: 0x071116,
  chrome: 0xa8b9b9,
  darkChrome: 0x16262b,
  cyan: 0x6fffe1,
  ice: 0xb9fff4,
  warm: 0xffedc7,
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => {
  const x = clamp01(value)
  return x * x * (3 - 2 * x)
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

type PulsePath = {
  curve: THREE.CatmullRomCurve3
  offset: number
}

type SceneMetrics = {
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  pixelRatio: number
  fps: number
}

declare global {
  interface Window {
    __SCENE_READY__?: boolean
    __seek?: (time: number) => void
    __SCENE_METRICS__?: () => SceneMetrics
  }
}

export class NeuralScene {
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly root = new THREE.Group()
  private readonly brainRoot = new THREE.Group()
  private readonly ringsRoot = new THREE.Group()
  private readonly fortuneGroup = new THREE.Group()
  private readonly leftHemisphere: THREE.Group
  private readonly rightHemisphere: THREE.Group
  private readonly random = seededRandom(202310)
  private readonly abortController = new AbortController()
  private readonly resizeObserver: ResizeObserver
  private readonly dummy = new THREE.Object3D()
  private readonly tempPoint = new THREE.Vector3()
  private readonly reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private readonly captureMode: boolean
  private readonly pulsePaths: PulsePath[] = []
  private readonly pmrem: THREE.PMREMGenerator
  private readonly environmentTexture: THREE.Texture
  private readonly coreMaterial: THREE.ShaderMaterial
  private readonly coreGlow: THREE.Sprite
  private readonly pulseMesh: THREE.InstancedMesh
  private readonly farParticles: THREE.Points
  private readonly nearParticles: THREE.Points
  private readonly onReady: () => void

  private manualTime: number | null = null
  private frameId = 0
  private startTime = performance.now()
  private previousFrame = this.startTime
  private frameEma = 16.7
  private frameCount = 0
  private qualityReduced = false
  private disposed = false
  private visible = !document.hidden
  private scrollSuspended = false
  private reducedMotion = this.reducedQuery.matches
  private mobile = false
  private progress = 0
  private targetProgress = 0
  private pointerX = 0
  private pointerY = 0
  private targetPointerX = 0
  private targetPointerY = 0
  private viewRotation = 0
  private targetViewRotation = 0
  private viewIndex = 0
  private pixelRatio = 1

  constructor(mount: HTMLDivElement, canvas: HTMLCanvasElement, onReady: () => void) {
    this.onReady = onReady
    const params = new URLSearchParams(window.location.search)
    this.captureMode = params.has('capture') || params.has('t')

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(PALETTE.background, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 90)
    this.camera.position.set(0, 1.65, 7.8)
    this.camera.lookAt(0, -0.12, 0)
    this.scene.fog = new THREE.Fog(PALETTE.fog, 9, 25)

    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.environmentTexture = this.pmrem.fromScene(room, 0.04).texture
    this.scene.environment = this.environmentTexture
    this.scene.environmentIntensity = 0.9

    this.buildLights()
    this.buildGround()
    this.scene.add(this.root)
    this.root.add(this.brainRoot, this.ringsRoot)

    this.leftHemisphere = this.createLobe(-1)
    this.rightHemisphere = this.createLobe(1)
    this.brainRoot.add(this.leftHemisphere, this.rightHemisphere)

    const core = this.buildCore()
    this.coreMaterial = core.material
    this.coreGlow = core.glow
    this.brainRoot.add(core.mesh, core.wire, core.glow)
    this.buildFortuneSignature()
    this.buildOrbits()
    this.buildPlatform()

    this.pulseMesh = this.buildPulses()
    this.brainRoot.add(this.pulseMesh)
    this.farParticles = this.buildParticleField(420, false)
    this.nearParticles = this.buildParticleField(120, true)
    this.scene.add(this.farParticles, this.nearParticles)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(mount)
    this.bindEvents()
    this.bindVerificationHooks()
    this.resize()

    const initialTime = params.has('t') ? Number(params.get('t')) || 0 : 0
    if (this.captureMode) this.manualTime = initialTime
    this.renderAt(initialTime)
    this.onReady()
    window.__SCENE_READY__ = true

    if (!this.captureMode && !this.reducedMotion) this.startAnimation()
  }

  private buildLights() {
    const key = new THREE.DirectionalLight(PALETTE.warm, 3.2)
    key.position.set(-3.5, 6, 5)
    const hemisphere = new THREE.HemisphereLight(0xbceeff, 0x071014, 1.55)
    const fill = new THREE.DirectionalLight(0x69dffc, 2.1)
    fill.position.set(4, 2.5, -4)
    const bounce = new THREE.DirectionalLight(0x4d8c89, 0.55)
    bounce.position.set(0, -4, 2)
    const coreLight = new THREE.PointLight(PALETTE.cyan, 11, 7, 2)
    coreLight.position.set(0, 0.2, 1.2)
    this.scene.add(key, hemisphere, fill, bounce, coreLight)
  }

  private createChromeMaterial(color: number, roughness = 0.2) {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.92,
      roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.65,
    })
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        float bbRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        outgoingLight += vec3(0.08, 0.38, 0.36) * bbRim * 0.5;
        #include <opaque_fragment>
        `,
      )
    }
    material.customProgramCacheKey = () => 'beyondbrain-chrome-rim-v1'
    return material
  }

  private brainPoint(side: number, theta: number, phi: number, inflate = 1) {
    const sinPhi = Math.sin(phi)
    let localX = 0.84 * sinPhi * Math.cos(theta) * inflate
    const localY = 0.96 * Math.cos(phi) * inflate
    const localZ = 0.86 * sinPhi * Math.sin(theta) * inflate
    if (localX * side < 0) localX *= 0.35
    const centerX = side * 0.34
    return new THREE.Vector3(centerX + localX, localY, localZ)
  }

  private createShell(side: number) {
    const geometry = new THREE.SphereGeometry(1, 48, 32)
    const positions = geometry.attributes.position
    const unit = new THREE.Vector3()
    for (let index = 0; index < positions.count; index += 1) {
      unit.fromBufferAttribute(positions, index).normalize()
      const theta = Math.atan2(unit.z, unit.x)
      const phi = Math.acos(THREE.MathUtils.clamp(unit.y, -1, 1))
      const mapped = this.brainPoint(side, theta, phi, 0.985)
      positions.setXYZ(index, mapped.x, mapped.y, mapped.z)
    }
    geometry.computeVertexNormals()
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x18343a,
      metalness: 0.7,
      roughness: 0.28,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      envMapIntensity: 1.2,
      clearcoat: 0.8,
    })
    return new THREE.Mesh(geometry, material)
  }

  private createLobe(side: number) {
    const group = new THREE.Group()
    group.add(this.createShell(side))

    const chromeGeometries: THREE.BufferGeometry[] = []
    const accentGeometries: THREE.BufferGeometry[] = []

    for (let band = 0; band < 12; band += 1) {
      const phiBase = 0.24 + (band / 11) * (Math.PI - 0.48)
      const points: THREE.Vector3[] = []
      for (let step = 0; step < 72; step += 1) {
        const theta = (step / 72) * Math.PI * 2
        const phi =
          phiBase +
          Math.sin(theta * 4 + band * 1.73 + side) * 0.095 +
          Math.sin(theta * 9 - band * 0.61) * 0.038
        const twistedTheta = theta + Math.sin(theta * 6 + band) * 0.065
        points.push(this.brainPoint(side, twistedTheta, phi, 1.035))
      }
      const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal')
      const accent = band % 5 === 2
      const geometry = new THREE.TubeGeometry(curve, 80, accent ? 0.012 : 0.023, 5, true)
      ;(accent ? accentGeometries : chromeGeometries).push(geometry)
      if (accent) this.pulsePaths.push({ curve, offset: this.random() })
    }

    for (let band = 0; band < 7; band += 1) {
      const thetaBase = (band / 7) * Math.PI * 2 + side * 0.13
      const points: THREE.Vector3[] = []
      for (let step = 0; step <= 56; step += 1) {
        const phi = 0.17 + (step / 56) * (Math.PI - 0.34)
        const theta =
          thetaBase +
          Math.sin(phi * 5 + band * 1.41) * 0.2 +
          Math.sin(phi * 10 - band) * 0.065
        points.push(this.brainPoint(side, theta, phi, 1.045))
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
      const accent = band % 6 === 2
      const geometry = new THREE.TubeGeometry(curve, 64, accent ? 0.012 : 0.02, 5, false)
      ;(accent ? accentGeometries : chromeGeometries).push(geometry)
      if (accent) this.pulsePaths.push({ curve, offset: this.random() })
    }

    const chromeGeometry = mergeGeometries(chromeGeometries)
    const accentGeometry = mergeGeometries(accentGeometries)
    chromeGeometries.forEach((geometry) => geometry.dispose())
    accentGeometries.forEach((geometry) => geometry.dispose())

    if (chromeGeometry) {
      group.add(new THREE.Mesh(chromeGeometry, this.createChromeMaterial(PALETTE.chrome)))
    }
    if (accentGeometry) {
      const accentMaterial = new THREE.MeshStandardMaterial({
        color: PALETTE.cyan,
        emissive: PALETTE.cyan,
        emissiveIntensity: 2.4,
        metalness: 0.35,
        roughness: 0.24,
        toneMapped: false,
      })
      group.add(new THREE.Mesh(accentGeometry, accentMaterial))
    }

    const nodeCount = 42
    const nodeGeometry = new THREE.IcosahedronGeometry(0.019, 1)
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x76d7c8,
      toneMapped: true,
    })
    const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount)
    for (let index = 0; index < nodeCount; index += 1) {
      const theta = this.random() * Math.PI * 2
      const phi = 0.2 + this.random() * (Math.PI - 0.4)
      this.dummy.position.copy(this.brainPoint(side, theta, phi, 1.07))
      this.dummy.rotation.set(this.random(), this.random(), this.random())
      this.dummy.scale.setScalar(0.45 + this.random() * 0.65)
      this.dummy.updateMatrix()
      nodes.setMatrixAt(index, this.dummy.matrix)
    }
    group.add(nodes)
    return group
  }

  private createRadialTexture(inner: string, middle: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
      gradient.addColorStop(0, inner)
      gradient.addColorStop(0.22, middle)
      gradient.addColorStop(1, 'rgba(5, 11, 15, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 128, 128)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private buildCore() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPhase: { value: 0 },
      },
      vertexShader: `
        uniform float uPhase;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;
        void main() {
          float ripple = sin(position.y * 15.0 + uPhase * 2.0) * 0.012;
          ripple += sin(position.x * 18.0 - uPhase) * 0.008;
          vec3 displaced = position + normal * ripple;
          vec4 world = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = world.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vLocalPosition = position;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uPhase;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), 2.4);
          float scan = pow(0.5 + 0.5 * sin(vLocalPosition.y * 25.0 + uPhase * 2.0), 9.0);
          vec3 deep = vec3(0.015, 0.12, 0.14);
          vec3 cyan = vec3(0.32, 1.0, 0.82);
          vec3 color = mix(deep, cyan, clamp(fresnel * 0.9 + scan * 0.22 + 0.12, 0.0, 1.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 4), material)
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.53, 2),
      new THREE.MeshBasicMaterial({
        color: PALETTE.cyan,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createRadialTexture('rgba(170, 255, 239, 0.95)', 'rgba(69, 238, 212, 0.32)'),
        color: PALETTE.cyan,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    glow.scale.setScalar(2.2)
    return { mesh, wire, glow, material }
  }

  private buildFortuneSignature() {
    const fortuneRandom = seededRandom(199511142259)
    const gold = new THREE.MeshStandardMaterial({
      color: 0xc9a24b,
      emissive: 0x6f4a10,
      emissiveIntensity: 0.85,
      metalness: 0.9,
      roughness: 0.22,
    })
    const count = 8
    const seeds = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.032, 0),
      gold,
      count,
    )
    const birthTimeAngle = ((22 * 60 + 59) / 1440) * Math.PI * 2
    for (let index = 0; index < count; index += 1) {
      const angle = birthTimeAngle + (index / count) * Math.PI * 2
      const radius = 0.58 + fortuneRandom() * 0.13
      this.dummy.position.set(
        Math.cos(angle) * radius,
        (fortuneRandom() - 0.5) * 0.5,
        Math.sin(angle) * radius * 0.7,
      )
      this.dummy.rotation.set(fortuneRandom() * 2, angle, fortuneRandom() * 2)
      this.dummy.scale.setScalar(0.6 + fortuneRandom() * 0.55)
      this.dummy.updateMatrix()
      seeds.setMatrixAt(index, this.dummy.matrix)
    }
    const hiddenRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 6, 32), gold)
    hiddenRing.rotation.set(1.1, 0.3, 0.4)
    this.fortuneGroup.add(seeds, hiddenRing)
    this.fortuneGroup.rotation.z = (((11 + 14) % 31) / 31) * Math.PI
    this.brainRoot.add(this.fortuneGroup)
  }

  private buildOrbits() {
    const chrome = this.createChromeMaterial(0x8fa9aa, 0.26)
    const luminous = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })

    const orbitA = new THREE.Group()
    orbitA.add(new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.014, 6, 180), chrome))
    orbitA.add(new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.006, 4, 180), luminous))
    orbitA.rotation.set(1.08, 0.15, 0.24)

    const tickCount = 64
    const ticks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.012, 0.09, 0.012),
      luminous,
      tickCount,
    )
    for (let index = 0; index < tickCount; index += 1) {
      const angle = (index / tickCount) * Math.PI * 2
      this.dummy.position.set(Math.cos(angle) * 1.82, Math.sin(angle) * 1.82, 0)
      this.dummy.rotation.set(0, 0, angle)
      this.dummy.scale.set(1, index % 4 === 0 ? 1.65 : 0.6, 1)
      this.dummy.updateMatrix()
      ticks.setMatrixAt(index, this.dummy.matrix)
    }
    orbitA.add(ticks)

    const orbitB = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.01, 5, 160), chrome)
    orbitB.rotation.set(0.25, 1.18, -0.3)
    const faint = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const orbitC = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.006, 4, 160), faint)
    orbitC.rotation.set(0.8, -0.75, 0.5)
    this.ringsRoot.add(orbitA, orbitB, orbitC)
  }

  private buildPlatform() {
    const platform = new THREE.Group()
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.28, 0.1, 64),
      this.createChromeMaterial(PALETTE.darkChrome, 0.32),
    )
    base.position.y = -1.53
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 1.08, 0.035, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0d2025,
        metalness: 0.82,
        roughness: 0.35,
      }),
    )
    top.position.y = -1.46

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.012, 5, 128), ringMaterial)
    ring.rotation.x = Math.PI / 2
    ring.position.y = -1.43
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.006, 4, 128),
      ringMaterial,
    )
    innerRing.rotation.x = Math.PI / 2
    innerRing.position.y = -1.415

    const kumikoMaterial = ringMaterial.clone()
    kumikoMaterial.opacity = 0.18
    const kumikoSpokes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.01, 0.008, 1.8),
      kumikoMaterial,
      6,
    )
    for (let index = 0; index < 6; index += 1) {
      this.dummy.position.set(0, -1.405, 0)
      this.dummy.rotation.set(0, (index / 6) * Math.PI, 0)
      this.dummy.scale.set(1, 1, 1)
      this.dummy.updateMatrix()
      kumikoSpokes.setMatrixAt(index, this.dummy.matrix)
    }

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.78, 6),
      ringMaterial,
    )
    beam.position.y = -1.04

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 4.6),
      new THREE.MeshBasicMaterial({
        map: this.createRadialTexture('rgba(2, 10, 12, 0.78)', 'rgba(3, 16, 18, 0.34)'),
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.595
    platform.add(base, top, ring, innerRing, kumikoSpokes, beam, shadow)
    this.root.add(platform)
  }

  private buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldPosition = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPosition;
          float kumikoLine(vec2 point, float angle) {
            vec2 direction = vec2(cos(angle), sin(angle));
            float coordinate = dot(point, direction);
            float width = fwidth(coordinate);
            float grid = abs(fract(coordinate - 0.5) - 0.5) / max(width, 0.0001);
            return 1.0 - min(grid, 1.0);
          }
          void main() {
            vec2 coord = vWorldPosition.xz * 0.55;
            float line = max(
              kumikoLine(coord, 0.0),
              max(kumikoLine(coord, 1.0471976), kumikoLine(coord, 2.0943951))
            );
            float distanceFromCenter = length(vWorldPosition.xz);
            float fade = 1.0 - smoothstep(3.0, 18.0, distanceFromCenter);
            float alpha = line * fade * 0.105;
            gl_FragColor = vec4(0.28, 0.66, 0.65, alpha);
          }
        `,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.62
    this.scene.add(ground)
  }

  private buildPulses() {
    const material = new THREE.MeshBasicMaterial({
      color: PALETTE.ice,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.032, 8, 6),
      material,
      this.pulsePaths.length,
    )
    mesh.frustumCulled = false
    return mesh
  }

  private buildParticleField(count: number, near: boolean) {
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const spread = near ? 5 : 16
      positions[index * 3] = (this.random() - 0.5) * spread * 2
      positions[index * 3 + 1] = near ? this.random() * 5 - 1.5 : this.random() * 10 - 2
      positions[index * 3 + 2] = near ? this.random() * 6 - 1 : -4 - this.random() * 18
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: near ? PALETTE.cyan : 0x7aa8ad,
      size: near ? 0.055 : 0.075,
      map: this.createRadialTexture('rgba(220, 255, 250, 1)', 'rgba(111, 255, 225, 0.35)'),
      transparent: true,
      opacity: near ? 0.34 : 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    })
    return new THREE.Points(geometry, material)
  }

  private bindEvents() {
    const signal = this.abortController.signal
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener(
        'pointermove',
        (event) => {
          this.targetPointerX = (event.clientX / window.innerWidth - 0.5) * 2
          this.targetPointerY = (event.clientY / window.innerHeight - 0.5) * 2
        },
        { passive: true, signal },
      )
    }

    document.addEventListener(
      'visibilitychange',
      () => {
        this.visible = !document.hidden
        if (!this.visible && this.frameId) {
          cancelAnimationFrame(this.frameId)
          this.frameId = 0
        } else if (this.visible && !this.captureMode && !this.reducedMotion) {
          this.startAnimation()
        }
      },
      { signal },
    )

    this.reducedQuery.addEventListener(
      'change',
      (event) => {
        this.reducedMotion = event.matches
        if (this.reducedMotion && this.frameId) {
          cancelAnimationFrame(this.frameId)
          this.frameId = 0
          this.renderAt(this.manualTime ?? 0)
        } else if (!this.reducedMotion && this.visible && !this.captureMode) {
          this.startAnimation()
        }
      },
      { signal },
    )
  }

  private bindVerificationHooks() {
    window.__SCENE_READY__ = false
    window.__seek = (time: number) => {
      this.manualTime = time
      if (this.frameId) cancelAnimationFrame(this.frameId)
      this.frameId = 0
      this.progress = this.targetProgress
      this.viewRotation = this.targetViewRotation
      this.pointerX = this.targetPointerX
      this.pointerY = this.targetPointerY
      this.renderAt(time)
    }
    window.__SCENE_METRICS__ = () => ({
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      pixelRatio: this.pixelRatio,
      fps: Math.round(1000 / this.frameEma),
    })
  }

  private resize() {
    const mount = this.renderer.domElement.parentElement
    const width = mount?.clientWidth || window.innerWidth
    const height = mount?.clientHeight || window.innerHeight
    this.mobile = width < 820
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.5)
    if (this.qualityReduced) this.pixelRatio = Math.min(this.pixelRatio, 1)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.fov = this.mobile ? 43 : 36
    this.camera.position.set(0, this.mobile ? 1.85 : 1.65, this.mobile ? 8.6 : 7.8)
    this.camera.lookAt(0, -0.12, 0)
    this.camera.updateProjectionMatrix()
    if (!this.frameId) this.renderAt(this.manualTime ?? 0)
  }

  setScrollSuspension(suspended: boolean) {
    this.scrollSuspended = suspended
    if (suspended && this.frameId) {
      cancelAnimationFrame(this.frameId)
      this.frameId = 0
    } else if (!suspended && this.visible && !this.captureMode && !this.reducedMotion) {
      this.previousFrame = performance.now()
      this.startAnimation()
    }
  }

  setProgress(progress: number) {
    this.targetProgress = clamp01(progress)
    if (this.reducedMotion || this.captureMode || this.manualTime !== null) {
      this.progress = this.targetProgress
      this.renderAt(this.manualTime ?? 0)
    }
  }

  cycleView() {
    this.viewIndex = (this.viewIndex + 1) % 4
    this.targetViewRotation += Math.PI / 2
    if (this.reducedMotion || this.captureMode || this.manualTime !== null) {
      this.viewRotation = this.targetViewRotation
      this.renderAt(this.manualTime ?? 0)
    }
    return this.viewIndex
  }

  private startAnimation() {
    if (
      this.frameId ||
      this.disposed ||
      !this.visible ||
      this.scrollSuspended ||
      this.manualTime !== null
    ) {
      return
    }
    this.previousFrame = performance.now()
    const loop = (now: number) => {
      this.frameId = 0
      if (this.disposed || !this.visible || this.scrollSuspended || this.manualTime !== null) return
      const delta = Math.min(100, Math.max(1, now - this.previousFrame))
      this.previousFrame = now
      this.renderAt((now - this.startTime) / 1000)
      this.adaptQuality(delta)
      this.frameId = requestAnimationFrame(loop)
    }
    this.frameId = requestAnimationFrame(loop)
  }

  private adaptQuality(delta: number) {
    this.frameEma = this.frameEma * 0.95 + delta * 0.05
    this.frameCount += 1
    if (
      !this.captureMode &&
      !this.qualityReduced &&
      this.frameCount > 120 &&
      this.frameEma > 30
    ) {
      this.qualityReduced = true
      this.resize()
    }
  }

  private renderAt(time: number) {
    if (this.disposed) return
    const cycle = (((time % DURATION) + DURATION) % DURATION) / DURATION
    const phase = cycle * Math.PI * 2
    const immediate = this.captureMode || this.reducedMotion || this.manualTime !== null
    const mix = immediate ? 1 : 0.075
    this.progress += (this.targetProgress - this.progress) * mix
    this.pointerX += (this.targetPointerX - this.pointerX) * mix
    this.pointerY += (this.targetPointerY - this.pointerY) * mix
    this.viewRotation += (this.targetViewRotation - this.viewRotation) * mix

    const eased = smoothstep(this.progress)
    this.root.position.x = this.mobile ? 0 : THREE.MathUtils.lerp(1.85, -1.85, eased)
    this.root.position.y =
      (this.mobile ? 1.36 : 0.04) + Math.sin(eased * Math.PI) * (this.mobile ? 0.08 : 0.16)
    this.root.scale.setScalar(this.mobile ? 0.66 : 1.08)

    this.brainRoot.rotation.y = phase + eased * 1.15 + this.viewRotation + this.pointerX * 0.2
    this.brainRoot.rotation.x = -0.08 + this.pointerY * 0.1 + Math.sin(phase) * 0.025
    this.brainRoot.rotation.z = Math.sin(phase) * 0.025 + (eased - 0.5) * 0.08
    this.leftHemisphere.position.x = -eased * 0.08
    this.rightHemisphere.position.x = eased * 0.08

    this.ringsRoot.rotation.y = -phase + this.viewRotation * 0.5 + eased * 0.8
    this.ringsRoot.rotation.x = Math.sin(phase) * 0.08
    this.ringsRoot.rotation.z = eased * 0.35
    this.coreMaterial.uniforms.uPhase.value = phase
    this.coreGlow.scale.setScalar(2.2 + Math.sin(phase * 2) * 0.14)
    this.fortuneGroup.rotation.y = -phase + FORTUNE_TIME_ANGLE
    this.fortuneGroup.rotation.x = Math.sin(phase) * 0.12
    this.fortuneGroup.position.y = Math.sin(phase * 2) * 0.025

    this.pulsePaths.forEach((path, index) => {
      const position = (cycle + path.offset) % 1
      path.curve.getPointAt(position, this.tempPoint)
      this.dummy.position.copy(this.tempPoint)
      this.dummy.rotation.set(0, 0, 0)
      this.dummy.scale.setScalar(0.72 + Math.sin((cycle + path.offset) * Math.PI * 4) * 0.22)
      this.dummy.updateMatrix()
      this.pulseMesh.setMatrixAt(index, this.dummy.matrix)
    })
    this.pulseMesh.instanceMatrix.needsUpdate = true

    this.farParticles.rotation.y = Math.sin(phase) * 0.05
    this.nearParticles.rotation.y = phase
    this.nearParticles.rotation.x = Math.sin(phase) * 0.02
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.frameId) cancelAnimationFrame(this.frameId)
    this.frameId = 0
    this.abortController.abort()
    this.resizeObserver.disconnect()
    window.__SCENE_READY__ = false
    window.__seek = undefined
    window.__SCENE_METRICS__ = undefined

    this.scene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry
        material?: THREE.Material | THREE.Material[]
      }
      renderable.geometry?.dispose()
      const materials = Array.isArray(renderable.material)
        ? renderable.material
        : renderable.material
          ? [renderable.material]
          : []
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose()
        })
        material.dispose()
      })
    })
    this.environmentTexture.dispose()
    this.pmrem.dispose()
    this.renderer.dispose()
    this.scene.clear()
  }
}
