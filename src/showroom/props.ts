import * as THREE from 'three'
import { seeded, type Kit } from './kit'
import { Parts } from './parts'

/** A flat, pointed leaf lying along +x from its stalk. */
function leafBlade(length: number, width: number) {
  const geometry = new THREE.BufferGeometry()
  const belly = length * 0.38
  // prettier-ignore
  const position = new Float32Array([
    0, 0, 0,   belly, 0, width / 2,    length, 0, 0,
    0, 0, 0,   length, 0, 0,           belly, 0, -width / 2,
  ])
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Bamboo in a long planter, for a corner of the room. Stands on the floor at its
 * origin and faces +z; `seed` varies the canes so no two planters match.
 */
export function buildBamboo(kit: Kit, seed: number) {
  const { mat } = kit
  const random = seeded(seed)
  const box = { w: 0.78, h: 0.42, d: 0.34 }
  const p = new Parts()

  p.rbox(box.w, box.h, box.d, mat.planter, { y: box.h / 2 }, 0.012)
  p.box(box.w - 0.05, 0.03, box.d - 0.05, mat.pebble, { y: box.h - 0.008 })

  const canes = 7
  for (let cane = 0; cane < canes; cane += 1) {
    const height = 2.05 + random() * 0.85
    const radius = 0.012 + random() * 0.006
    const gap = 0.21 + random() * 0.07
    p.group(
      {
        x: (cane / (canes - 1) - 0.5) * (box.w - 0.2) + (random() - 0.5) * 0.05,
        y: box.h,
        z: (random() - 0.5) * (box.d - 0.18),
        rz: (random() - 0.5) * 0.09,
        rx: (random() - 0.5) * 0.07,
      },
      () => {
        p.cyl(radius * 0.5, radius, height, mat.culm, { y: height / 2 }, 8)
        for (let y = gap; y < height - 0.06; y += gap) {
          const girth = radius * (1.3 - 0.55 * (y / height))
          p.cyl(girth, girth, 0.011, mat.culmNode, { y }, 8)
          if (y < height * 0.36 || random() < 0.22) continue

          // A side branch with a fan of leaves at its tip.
          const reach = 0.13 + random() * 0.12
          const rise = 0.35 + random() * 0.5
          p.group({ y, ry: random() * Math.PI * 2 }, () => {
            p.cyl(0.0022, 0.0034, reach, mat.culmNode, {
              x: (Math.cos(rise) * reach) / 2,
              y: (Math.sin(rise) * reach) / 2,
              rz: rise - Math.PI / 2,
            }, 5)
            const leaves = 3 + Math.floor(random() * 3)
            for (let leaf = 0; leaf < leaves; leaf += 1) {
              const length = 0.15 + random() * 0.1
              p.add(
                leafBlade(length, length * 0.17),
                random() < 0.3 ? mat.leafPale : mat.leaf,
                {
                  x: Math.cos(rise) * reach,
                  y: Math.sin(rise) * reach,
                  ry: (leaf - (leaves - 1) / 2) * 0.62 + (random() - 0.5) * 0.3,
                  rz: -(0.25 + random() * 0.7),
                  rx: (random() - 0.5) * 0.9,
                },
              )
            }
          })
        }
      },
    )
  }
  return p.build()
}

/** A floor lantern: paper panels in a dark timber frame, lit from inside. */
export function buildLantern(kit: Kit) {
  const { mat } = kit
  const size = 0.38
  const height = 1.52
  const post = 0.028
  const foot = 0.09
  const reach = size / 2 - post / 2
  const p = new Parts()

  for (const x of [-reach, reach]) {
    for (const z of [-reach, reach]) {
      p.box(post, height, post, mat.woodDark, { x, y: height / 2, z })
    }
  }
  const rails = [foot, foot + (height - foot) * 0.35, foot + (height - foot) * 0.68, height - 0.011]
  for (let side = 0; side < 4; side += 1) {
    p.group({ ry: (side * Math.PI) / 2 }, () => {
      rails.forEach((y, index) => {
        const thick = index === 0 || index === rails.length - 1 ? 0.022 : 0.012
        p.box(size - post, thick, thick, mat.woodDark, { y, z: reach })
      })
      p.add(new THREE.PlaneGeometry(size - post * 1.4, height - foot), mat.washi, {
        y: foot + (height - foot) / 2,
        z: reach - 0.006,
      })
    })
  }
  p.box(size + 0.036, 0.018, size + 0.036, mat.woodDark, { y: height + 0.009 })
  return p.build()
}
