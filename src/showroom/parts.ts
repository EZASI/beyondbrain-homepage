import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Placement of a part: translate, then yaw (ry) applied after pitch (rx) and roll (rz). */
export type Xf = {
  x?: number
  y?: number
  z?: number
  rx?: number
  ry?: number
  rz?: number
  s?: number | [number, number, number]
}

const tmpPosition = new THREE.Vector3()
const tmpQuaternion = new THREE.Quaternion()
const tmpEuler = new THREE.Euler()
const tmpScale = new THREE.Vector3()

function matrixOf(xf: Xf) {
  tmpPosition.set(xf.x ?? 0, xf.y ?? 0, xf.z ?? 0)
  tmpEuler.set(xf.rx ?? 0, xf.ry ?? 0, xf.rz ?? 0, 'YXZ')
  tmpQuaternion.setFromEuler(tmpEuler)
  if (Array.isArray(xf.s)) tmpScale.set(xf.s[0], xf.s[1], xf.s[2])
  else tmpScale.setScalar(xf.s ?? 1)
  return new THREE.Matrix4().compose(tmpPosition, tmpQuaternion, tmpScale)
}

/**
 * Collects primitive geometry per material and merges it into one mesh per
 * material, so a detailed prop costs a handful of draw calls.
 */
export class Parts {
  private readonly buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  private current = new THREE.Matrix4()

  add(geometry: THREE.BufferGeometry, material: THREE.Material, xf: Xf = {}) {
    let prepared = geometry
    if (geometry.index) {
      prepared = geometry.toNonIndexed()
      geometry.dispose()
    }
    for (const name of Object.keys(prepared.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') {
        prepared.deleteAttribute(name)
      }
    }
    if (!prepared.getAttribute('normal')) prepared.computeVertexNormals()
    if (!prepared.getAttribute('uv')) {
      const count = prepared.getAttribute('position').count
      prepared.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(count * 2), 2),
      )
    }
    prepared.applyMatrix4(matrixOf(xf).premultiply(this.current))

    const bucket = this.buckets.get(material)
    if (bucket) bucket.push(prepared)
    else this.buckets.set(material, [prepared])
    return this
  }

  /** Runs `build` with every part placed relative to `xf`. */
  group(xf: Xf, build: () => void) {
    const previous = this.current
    this.current = matrixOf(xf).premultiply(previous)
    build()
    this.current = previous
    return this
  }

  box(w: number, h: number, d: number, material: THREE.Material, xf?: Xf) {
    return this.add(new THREE.BoxGeometry(w, h, d), material, xf)
  }

  rbox(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    xf?: Xf,
    radius = 0.012,
    segments = 2,
  ) {
    return this.add(new RoundedBoxGeometry(w, h, d, segments, radius), material, xf)
  }

  cyl(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: THREE.Material,
    xf?: Xf,
    segments = 28,
    openEnded = false,
  ) {
    return this.add(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, openEnded),
      material,
      xf,
    )
  }

  /**
   * Revolves a profile of [radius, height] pairs around the vertical axis.
   * `smooth` runs a curve through the points, for thrown shapes such as pots and bowls.
   */
  lathe(
    profile: [number, number][],
    material: THREE.Material,
    xf?: Xf,
    segments = 40,
    smooth = false,
  ) {
    const corners = profile.map(([radius, height]) => new THREE.Vector2(radius, height))
    const points = smooth ? new THREE.SplineCurve(corners).getPoints(corners.length * 5) : corners
    for (const point of points) point.x = Math.max(point.x, 0)
    return this.add(new THREE.LatheGeometry(points, segments), material, xf)
  }

  sphere(radius: number, material: THREE.Material, xf?: Xf) {
    return this.add(new THREE.SphereGeometry(radius, 20, 14), material, xf)
  }

  torus(radius: number, tube: number, material: THREE.Material, xf?: Xf) {
    return this.add(new THREE.TorusGeometry(radius, tube, 10, 28), material, xf)
  }

  build() {
    const group = new THREE.Group()
    for (const [material, geometries] of this.buckets) {
      const merged =
        geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
      if (!merged) continue
      if (geometries.length > 1) geometries.forEach((geometry) => geometry.dispose())
      const mesh = new THREE.Mesh(merged, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    this.buckets.clear()
    return group
  }
}

export function roundedRectShape(width: number, height: number, radius: number) {
  const x = -width / 2
  const y = -height / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

/** A flat rounded rectangle facing +Z whose UVs span the whole rectangle. */
export function roundedPlane(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(roundedRectShape(width, height, radius), 8)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(
      index,
      position.getX(index) / width + 0.5,
      position.getY(index) / height + 0.5,
    )
  }
  return geometry
}

/** A rounded slab (phone body, card) with softened edges, centred on the origin. */
export function roundedSlab(width: number, height: number, depth: number, radius: number) {
  const bevel = Math.min(depth * 0.3, 0.006)
  const geometry = new THREE.ExtrudeGeometry(
    roundedRectShape(width - bevel * 2, height - bevel * 2, Math.max(radius - bevel, 0.001)),
    {
      depth: depth - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 10,
    },
  )
  geometry.translate(0, 0, -(depth - bevel * 2) / 2)
  return geometry
}
