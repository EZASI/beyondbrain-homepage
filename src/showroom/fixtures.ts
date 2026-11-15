import * as THREE from 'three'
import type { Kit } from './kit'
import { Parts } from './parts'

export type FixtureKind = 'cubby' | 'rack' | 'panel' | 'ledges' | 'doorway'

export type Fixture = {
  group: THREE.Group
  /** Where each item stands, in the fixture's own space (x right, y up, z into the room). */
  cells: THREE.Vector3[]
  width: number
  height: number
  bottom: number
}

/** Hinoki cubby shelf: one open box per item. */
function cubby(cols: number, rows: number, kit: Kit): Fixture {
  const { mat } = kit
  const cell = { w: 0.94, h: 0.84 }
  const board = 0.034
  const depth = 0.4
  const width = cols * cell.w + board
  const height = rows * cell.h + board
  const bottom = 0.72
  const p = new Parts()

  p.box(width - 0.012, height - 0.012, 0.012, mat.hinokiBack, {
    y: bottom + height / 2,
    z: 0.008,
  })
  for (let row = 0; row <= rows; row += 1) {
    p.rbox(width, board, depth, mat.hinoki, {
      y: bottom + board / 2 + row * cell.h,
      z: depth / 2 + 0.002,
    }, 0.004)
  }
  for (let col = 0; col <= cols; col += 1) {
    p.rbox(board, height, depth, mat.hinoki, {
      x: -width / 2 + board / 2 + col * cell.w,
      y: bottom + height / 2,
      z: depth / 2 + 0.002,
    }, 0.004)
  }

  const cells: THREE.Vector3[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push(
        new THREE.Vector3(
          -width / 2 + board / 2 + (col + 0.5) * cell.w,
          bottom + board + (rows - 1 - row) * cell.h,
          depth / 2 + 0.02,
        ),
      )
    }
  }
  return { group: p.build(), cells, width, height, bottom }
}

/** Black wire shelving, open so that items shadow the wall behind. */
function rack(cols: number, rows: number, kit: Kit): Fixture {
  const { mat } = kit
  const cell = { w: 0.92, h: 0.84 }
  const depth = 0.44
  const back = 0.03
  const width = cols * cell.w + 0.08
  const height = rows * cell.h + 0.02
  const bottom = 0.66
  const p = new Parts()

  for (const x of [-width / 2, width / 2]) {
    for (const z of [back, back + depth]) {
      p.box(0.022, height + 0.1, 0.022, mat.wire, { x, y: bottom + height / 2, z })
    }
  }

  const cells: THREE.Vector3[] = []
  const wires = Math.round(width / 0.046)
  for (let row = 0; row < rows; row += 1) {
    const y = bottom + 0.05 + (rows - 1 - row) * cell.h
    for (const z of [back, back + depth]) {
      p.box(width, 0.016, 0.016, mat.wire, { y, z })
      p.box(width, 0.01, 0.01, mat.wire, { y: y + 0.034, z })
    }
    for (const x of [-width / 2, width / 2]) {
      p.box(0.016, 0.016, depth, mat.wire, { x, y, z: back + depth / 2 })
    }
    for (const z of [back + depth * 0.33, back + depth * 0.66]) {
      p.box(width, 0.008, 0.008, mat.wire, { y: y - 0.004, z })
    }
    for (let wire = 1; wire < wires; wire += 1) {
      p.box(0.006, 0.006, depth, mat.wire, {
        x: -width / 2 + (wire * width) / wires,
        y: y + 0.006,
        z: back + depth / 2,
      })
    }
    for (let col = 0; col < cols; col += 1) {
      cells.push(
        new THREE.Vector3((col - (cols - 1) / 2) * cell.w, y + 0.01, back + depth / 2),
      )
    }
  }
  return { group: p.build(), cells, width, height, bottom }
}

/** Perforated steel panel in the brand's ink colour, with one ledge per item. */
function panel(cols: number, rows: number, kit: Kit): Fixture {
  const { mat, textures } = kit
  const cell = { w: 0.94, h: 0.86 }
  const width = cols * cell.w + 0.14
  const height = rows * cell.h + 0.1
  const bottom = 0.72
  const face = 0.045
  const p = new Parts()

  textures.perforation.repeat.set(Math.round(width / 0.05), Math.round(height / 0.05))
  p.rbox(width, height, face, mat.panel, { y: bottom + height / 2, z: face / 2 }, 0.012)

  const cells: THREE.Vector3[] = []
  for (let row = 0; row < rows; row += 1) {
    const y = bottom + 0.12 + (rows - 1 - row) * cell.h
    for (let col = 0; col < cols; col += 1) {
      const x = (col - (cols - 1) / 2) * cell.w
      p.rbox(cell.w * 0.82, 0.02, 0.42, mat.panelEdge, { x, y, z: face + 0.21 }, 0.006)
      for (const side of [-1, 1]) {
        p.box(0.012, 0.075, 0.3, mat.panelEdge, {
          x: x + side * cell.w * 0.3,
          y: y - 0.045,
          z: face + 0.15,
        })
      }
      cells.push(new THREE.Vector3(x, y + 0.01, face + 0.21))
    }
  }
  return { group: p.build(), cells, width, height, bottom }
}

/** Two white picture ledges for upright devices and boxes. */
function ledges(cols: number, rows: number, kit: Kit): Fixture {
  const { mat } = kit
  const cell = { w: 1.02, h: 1.02 }
  const width = cols * cell.w
  const bottom = 0.8
  const p = new Parts()

  const cells: THREE.Vector3[] = []
  for (let row = 0; row < rows; row += 1) {
    const y = bottom + 0.06 + (rows - 1 - row) * cell.h
    p.rbox(width, 0.036, 0.32, mat.ledge, { y: y - 0.018, z: 0.16 }, 0.008)
    p.box(width, 0.028, 0.012, mat.ledge, { y: y + 0.01, z: 0.314 })
    for (let col = 0; col < cols; col += 1) {
      cells.push(new THREE.Vector3((col - (cols - 1) / 2) * cell.w, y, 0.15))
    }
  }
  return {
    group: p.build(),
    cells,
    width,
    height: (rows - 1) * cell.h + 0.82,
    bottom,
  }
}

/** A doorway with a lit room beyond it; the noren that hangs here is the item. */
function doorway(kit: Kit): Fixture {
  const { mat } = kit
  const opening = { w: 1.56, h: 2.36 }
  const p = new Parts()

  p.add(new THREE.PlaneGeometry(opening.w, opening.h), mat.doorway, {
    y: opening.h / 2,
    z: 0.004,
  })
  for (const side of [-1, 1]) {
    p.rbox(0.1, opening.h + 0.06, 0.13, mat.woodDark, {
      x: side * (opening.w / 2 + 0.05),
      y: (opening.h + 0.06) / 2,
      z: 0.065,
    }, 0.008)
  }
  p.rbox(opening.w + 0.4, 0.12, 0.15, mat.woodDark, {
    y: opening.h + 0.06,
    z: 0.075,
  }, 0.008)
  p.rbox(opening.w + 0.2, 0.036, 0.18, mat.woodDark, { y: 0.018, z: 0.09 }, 0.006)

  return {
    group: p.build(),
    cells: [new THREE.Vector3(0, opening.h - 1.1, 0.11)],
    width: opening.w + 0.4,
    height: opening.h + 0.12,
    bottom: 0,
  }
}

export function buildFixture(kind: FixtureKind, cols: number, rows: number, kit: Kit) {
  switch (kind) {
    case 'cubby':
      return cubby(cols, rows, kit)
    case 'rack':
      return rack(cols, rows, kit)
    case 'panel':
      return panel(cols, rows, kit)
    case 'ledges':
      return ledges(cols, rows, kit)
    case 'doorway':
      return doorway(kit)
  }
}
