import * as THREE from 'three'
import type { Kit } from './kit'
import { Parts, roundedPlane, roundedSlab } from './parts'

/**
 * Display props, one per showroom item. Each is built around its own origin:
 * bottom centre of the footprint, +z toward the visitor, sized to fit a shelf
 * cell roughly 0.62 wide, 0.6 tall and 0.36 deep.
 */

const PI = Math.PI

type Mat = Kit['mat']
type Build = (p: Parts, m: Mat) => void

/** A small black easel: base plate, back strut, and a tilted surface for `content`. */
function easel(p: Parts, m: Mat, width: number, tilt: number, content: () => void) {
  p.rbox(width, 0.02, 0.13, m.black, { y: 0.01, z: -0.01 }, 0.006)
  p.box(0.03, 0.2, 0.012, m.black, { y: 0.1, z: -0.055, rx: 0.32 })
  p.group({ y: 0.02, z: 0.03, rx: -tilt }, content)
}

/* ── Factory automation ─────────────────────────────────────────────── */

const servoMotor: Build = (p, m) => {
  const axis = 0.165
  p.group({ ry: -0.3, s: 0.92 }, () => {
    for (const x of [-0.1, 0.06]) {
      p.rbox(0.05, 0.066, 0.2, m.steelDark, { x, y: 0.033 }, 0.006)
    }
    p.rbox(0.27, 0.2, 0.2, m.paintGrey, { x: -0.02, y: axis }, 0.028, 3)
    for (let line = 0; line < 4; line += 1) {
      const offset = -0.054 + line * 0.036
      p.box(0.2, 0.005, 0.003, m.steelDark, { x: -0.02, y: axis + offset, z: 0.1005 })
      p.box(0.2, 0.003, 0.005, m.steelDark, { x: -0.02, y: axis + 0.1005, z: offset })
    }
    p.box(0.1, 0.055, 0.002, m.label, { x: 0.03, y: axis + 0.012, z: 0.103 })

    p.cyl(0.088, 0.088, 0.1, m.black, { x: -0.205, y: axis, rz: PI / 2 }, 36)
    p.cyl(0.091, 0.091, 0.014, m.mint, { x: -0.166, y: axis, rz: PI / 2 }, 36)

    p.rbox(0.03, 0.245, 0.245, m.alu, { x: 0.13, y: axis }, 0.014)
    p.cyl(0.07, 0.07, 0.016, m.alu, { x: 0.153, y: axis, rz: PI / 2 }, 36)
    p.cyl(0.027, 0.027, 0.1, m.steel, { x: 0.205, y: axis, rz: PI / 2 }, 24)
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.cyl(0.012, 0.012, 0.004, m.steelDark, {
          x: 0.146,
          y: axis + sy * 0.095,
          z: sz * 0.095,
          rz: PI / 2,
        }, 12)
      }
    }

    p.rbox(0.075, 0.05, 0.075, m.black, { x: -0.07, y: axis + 0.12 }, 0.01)
    p.cyl(0.024, 0.024, 0.045, m.alu, { x: -0.07, y: axis + 0.165 }, 20)
  })
}

function amplifier(p: Parts, m: Mat, x: number, w: number, h: number, d: number) {
  const front = d / 2
  p.rbox(w, h, d, m.darkPlastic, { x, y: h / 2 }, 0.012)
  p.rbox(w * 0.86, h * 0.9, 0.012, m.ivory, { x, y: h / 2, z: front + 0.003 }, 0.006)
  p.box(w * 0.56, 0.04, 0.004, m.segments, { x, y: h * 0.86, z: front + 0.0105 })
  for (let key = 0; key < 4; key += 1) {
    p.box(0.016, 0.012, 0.006, m.darkPlastic, {
      x: x - w * 0.27 + key * w * 0.18,
      y: h * 0.77,
      z: front + 0.011,
    })
  }
  for (let block = 0; block < 3; block += 1) {
    p.rbox(w * 0.6, h * 0.11, 0.03, block === 2 ? m.terminal : m.black, {
      x: x + w * 0.04,
      y: h * (0.6 - block * 0.17),
      z: front + 0.02,
    }, 0.004)
  }
  p.box(0.012, 0.012, 0.004, m.led, { x: x - w * 0.3, y: h * 0.93, z: front + 0.0105 })
  for (let fin = 0; fin < 7; fin += 1) {
    p.box(0.014, h * 0.84, 0.005, m.alu, {
      x: x - w / 2 - 0.006,
      y: h / 2,
      z: -d / 2 + 0.03 + (fin * (d - 0.06)) / 6,
    })
  }
  for (let vent = 0; vent < 5; vent += 1) {
    p.box(w * 0.7, 0.002, 0.012, m.black, { x, y: h + 0.0005, z: -d * 0.32 + vent * d * 0.16 })
  }
}

const servoAmp: Build = (p, m) => {
  p.group({ ry: 0.22 }, () => {
    amplifier(p, m, -0.105, 0.16, 0.44, 0.26)
    amplifier(p, m, 0.1, 0.12, 0.36, 0.24)
  })
}

const plc: Build = (p, m) => {
  p.group({ ry: -0.16 }, () => {
    p.rbox(0.6, 0.02, 0.2, m.steelDark, { y: 0.01 }, 0.006)
    p.box(0.58, 0.04, 0.012, m.alu, { y: 0.19, z: -0.094 })
    const widths = [0.09, 0.09, 0.062, 0.062, 0.062, 0.062, 0.062]
    const gap = 0.004
    const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
    const height = 0.3
    const depth = 0.18
    const base = 0.02
    const front = depth / 2
    let cursor = -total / 2
    widths.forEach((width, index) => {
      const x = cursor + width / 2
      cursor += width + gap
      p.rbox(width, height, depth, m.ivory, { x, y: base + height / 2 }, 0.008)
      if (index === 0) {
        p.rbox(width * 0.74, 0.07, 0.022, m.terminal, { x, y: base + 0.06, z: front + 0.008 }, 0.004)
        p.box(width * 0.5, 0.05, 0.003, m.label, { x, y: base + 0.2, z: front + 0.0015 })
        p.box(0.012, 0.012, 0.004, m.led, { x: x - width * 0.22, y: base + 0.265, z: front + 0.002 })
      } else if (index === 1) {
        p.box(width * 0.7, 0.045, 0.004, m.segments, { x, y: base + 0.235, z: front + 0.002 })
        p.rbox(width * 0.6, 0.1, 0.012, m.darkPlastic, { x, y: base + 0.12, z: front + 0.005 }, 0.004)
        p.rbox(0.03, 0.022, 0.02, m.alu, { x, y: base + 0.04, z: front + 0.006 }, 0.003)
      } else {
        for (let row = 0; row < 4; row += 1) {
          for (let col = 0; col < 2; col += 1) {
            p.box(0.011, 0.011, 0.004, (row + col + index) % 3 === 0 ? m.led : m.darkPlastic, {
              x: x - 0.012 + col * 0.024,
              y: base + 0.265 - row * 0.02,
              z: front + 0.002,
            })
          }
        }
        p.rbox(width * 0.8, 0.16, 0.014, m.darkPlastic, { x, y: base + 0.095, z: front + 0.006 }, 0.005)
      }
    })
  })
}

const inverter: Build = (p, m) => {
  p.group({ ry: 0.2 }, () => {
    p.rbox(0.27, 0.42, 0.24, m.ivory, { y: 0.21 }, 0.016, 3)
    p.rbox(0.25, 0.17, 0.012, m.darkPlastic, { y: 0.1, z: 0.123 }, 0.006)
    p.rbox(0.16, 0.14, 0.022, m.black, { x: -0.03, y: 0.3, z: 0.127 }, 0.008)
    p.box(0.1, 0.04, 0.004, m.segments, { x: -0.03, y: 0.335, z: 0.139 })
    p.cyl(0.024, 0.024, 0.022, m.alu, { x: -0.07, y: 0.272, z: 0.146, rx: PI / 2 }, 24)
    for (let key = 0; key < 3; key += 1) {
      p.rbox(0.022, 0.016, 0.008, key === 0 ? m.mint : m.paintGrey, {
        x: -0.025 + key * 0.03,
        y: 0.272,
        z: 0.14,
      }, 0.003)
    }
    p.box(0.045, 0.03, 0.003, m.persimmon, { x: 0.092, y: 0.33, z: 0.1205 })
    for (let vent = 0; vent < 6; vent += 1) {
      p.box(0.2, 0.002, 0.012, m.darkPlastic, { y: 0.4205, z: -0.08 + vent * 0.03 })
    }
    for (let slot = 0; slot < 5; slot += 1) {
      p.box(0.012, 0.03, 0.003, m.black, { x: 0.05 + slot * 0.02, y: 0.385, z: 0.1205 })
    }
  })
}

const hmi: Build = (p, m) => {
  p.group({ ry: -0.18 }, () => {
    p.rbox(0.36, 0.024, 0.2, m.steelDark, { y: 0.012 }, 0.008)
    p.box(0.05, 0.26, 0.02, m.steelDark, { y: 0.13, z: -0.07, rx: 0.36 })
    p.group({ y: 0.03, z: 0.03, rx: -0.24 }, () => {
      p.rbox(0.54, 0.37, 0.05, m.darkPlastic, { y: 0.185 }, 0.016, 3)
      p.box(0.46, 0.2875, 0.004, m.hmiScreen, { y: 0.195, z: 0.0255 })
      p.box(0.014, 0.008, 0.004, m.led, { x: 0.23, y: 0.028, z: 0.0255 })
    })
  })
}

const powerIo: Build = (p, m) => {
  p.group({ ry: 0.24 }, () => {
    const x = -0.13
    p.rbox(0.2, 0.3, 0.2, m.alu, { x, y: 0.15 }, 0.008)
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        p.box(0.022, 0.006, 0.003, m.steelDark, {
          x: x - 0.06 + col * 0.03,
          y: 0.275 - row * 0.016,
          z: 0.1005,
        })
      }
    }
    p.box(0.12, 0.075, 0.003, m.label, { x, y: 0.155, z: 0.1005 })
    p.rbox(0.18, 0.055, 0.035, m.black, { x, y: 0.05, z: 0.105 }, 0.004)
    for (let screw = 0; screw < 6; screw += 1) {
      p.cyl(0.009, 0.009, 0.006, m.steel, {
        x: x - 0.07 + screw * 0.028,
        y: 0.05,
        z: 0.124,
        rx: PI / 2,
      }, 12)
    }
    p.box(0.012, 0.012, 0.004, m.led, { x: x + 0.075, y: 0.1, z: 0.1005 })

    const tx = 0.15
    p.rbox(0.25, 0.1, 0.15, m.ivory, { x: tx, y: 0.05 }, 0.008)
    p.rbox(0.23, 0.02, 0.1, m.terminal, { x: tx, y: 0.108 }, 0.004)
    for (let row = 0; row < 2; row += 1) {
      for (let screw = 0; screw < 8; screw += 1) {
        p.cyl(0.008, 0.008, 0.008, m.steel, {
          x: tx - 0.098 + screw * 0.028,
          y: 0.12,
          z: -0.022 + row * 0.044,
        }, 10)
      }
    }
    for (let lamp = 0; lamp < 8; lamp += 1) {
      p.box(0.01, 0.008, 0.003, lamp % 3 === 0 ? m.led : m.darkPlastic, {
        x: tx - 0.098 + lamp * 0.028,
        y: 0.075,
        z: 0.0765,
      })
    }
  })
}

/* ── Server parts ───────────────────────────────────────────────────── */

function memoryModule(
  p: Parts,
  m: Mat,
  board: THREE.Material,
  label: THREE.Material,
  shielded: boolean,
) {
  const length = 0.46
  const height = 0.115
  p.box(length, height, 0.006, board, { y: height / 2 + 0.004 })
  p.box(length * 0.92, 0.016, 0.008, m.gold, { y: 0.012 })
  if (shielded) {
    p.rbox(length * 0.985, height * 0.7, 0.02, m.black, { y: height * 0.64 }, 0.005)
    p.box(length * 0.985, 0.008, 0.021, m.mint, { y: height * 0.36 })
    p.box(0.15, 0.046, 0.002, label, { x: -0.1, y: height * 0.68, z: 0.0105 })
    return
  }
  for (let chip = 0; chip < 9; chip += 1) {
    const x = -length / 2 + 0.042 + chip * 0.047
    if (chip === 4) {
      p.box(0.028, 0.028, 0.004, m.chip, { x, y: 0.07, z: 0.005 })
      continue
    }
    p.box(0.034, 0.05, 0.004, m.chip, { x, y: 0.07, z: 0.005 })
    p.box(0.034, 0.05, 0.004, m.chip, { x, y: 0.07, z: -0.005 })
  }
  p.box(0.15, 0.046, 0.001, label, { x: 0.105, y: 0.072, z: 0.0078 })
}

const memoryRack =
  (board: keyof Mat, label: keyof Mat, shielded: boolean): Build =>
  (p, m) => {
    const step = 0.085
    p.rbox(0.52, 0.03, 0.32, m.black, { y: 0.015 }, 0.008)
    for (let slot = 0; slot < 3; slot += 1) {
      const z = 0.09 - slot * step
      if (slot > 0) {
        p.box(0.46, slot * step, 0.06, m.black, { y: 0.03 + (slot * step) / 2, z: z - 0.02 })
      }
      p.group({ y: 0.03 + slot * step, z, rx: -0.34, ry: 0.3, s: 1.14 }, () =>
        memoryModule(p, m, m[board], m[label], shielded),
      )
    }
  }

function driveBody(p: Parts, m: Mat, body: THREE.Material, w: number, h: number, t: number) {
  p.rbox(w, h, t, body, { y: h / 2 }, 0.008)
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      p.cyl(0.008, 0.008, 0.004, m.steel, {
        x: sx * (w / 2 - 0.02),
        y: h / 2 + sy * (h / 2 - 0.02),
        z: t / 2,
        rx: PI / 2,
      }, 10)
    }
  }
}

const ssd: Build = (p, m) => {
  const drive = (body: THREE.Material) => {
    driveBody(p, m, body, 0.25, 0.36, 0.05)
    p.box(0.19, 0.228, 0.002, m.ssdLabel, { y: 0.19, z: 0.026 })
  }
  p.group({ x: -0.13, z: -0.03, ry: 0.3 }, () => easel(p, m, 0.2, 0.16, () => drive(m.alu)))
  p.group({ x: 0.14, z: 0.06, ry: -0.24 }, () =>
    easel(p, m, 0.2, 0.16, () => drive(m.steelDark)),
  )
}

const hdd: Build = (p, m) => {
  p.group({ x: -0.14, z: -0.03, ry: 0.3 }, () =>
    easel(p, m, 0.2, 0.16, () => {
      driveBody(p, m, m.alu, 0.26, 0.37, 0.068)
      p.rbox(0.225, 0.3, 0.006, m.steel, { y: 0.2, z: 0.035 }, 0.003)
      p.box(0.17, 0.204, 0.002, m.hddLabel, { y: 0.235, z: 0.039 })
      p.cyl(0.05, 0.05, 0.006, m.alu, { y: 0.075, z: 0.036, rx: PI / 2 }, 28)
    }),
  )
  p.group({ x: 0.15, z: 0.06, ry: -0.26 }, () =>
    easel(p, m, 0.2, 0.16, () => {
      driveBody(p, m, m.alu, 0.26, 0.37, 0.068)
      p.box(0.21, 0.2, 0.005, m.pcb, { y: 0.24, z: 0.036 })
      p.box(0.06, 0.06, 0.005, m.chip, { x: -0.03, y: 0.27, z: 0.041 })
      p.box(0.04, 0.03, 0.005, m.chip, { x: 0.05, y: 0.2, z: 0.041 })
      p.box(0.12, 0.016, 0.012, m.black, { x: 0.02, y: 0.012, z: 0.02 })
      p.cyl(0.046, 0.046, 0.006, m.steelDark, { y: 0.085, z: 0.036, rx: PI / 2 }, 28)
    }),
  )
}

function processor(p: Parts, m: Mat, w: number, h: number) {
  p.box(w, h, 0.008, m.pcb, { y: h / 2 })
  p.rbox(w * 0.82, h * 0.76, 0.022, m.alu, { y: h / 2, z: 0.014 }, 0.008)
  p.box(0.018, 0.018, 0.002, m.gold, { x: -w / 2 + 0.018, y: 0.018, z: 0.0051 })
  for (let pad = 0; pad < 6; pad += 1) {
    p.box(0.012, 0.008, 0.004, m.gold, { x: -w * 0.3 + pad * w * 0.12, y: h - 0.012, z: 0.006 })
  }
}

const cpu: Build = (p, m) => {
  p.group({ x: -0.08, z: -0.04, ry: 0.22 }, () => {
    p.rbox(0.3, 0.02, 0.16, m.black, { y: 0.01 }, 0.006)
    p.box(0.03, 0.2, 0.012, m.black, { y: 0.1, z: -0.07, rx: 0.5 })
    p.group({ y: 0.02, z: 0.04, rx: -0.5 }, () => {
      p.rbox(0.34, 0.3, 0.016, m.black, { y: 0.15 }, 0.006)
      p.group({ y: 0.035, z: 0.012 }, () => processor(p, m, 0.28, 0.23))
    })
  })
  p.group({ x: 0.2, z: 0.09, ry: -0.3 }, () => {
    p.rbox(0.2, 0.014, 0.2, m.black, { y: 0.007 }, 0.005)
    p.group({ y: 0.016, z: 0.075, rx: -PI / 2 }, () => processor(p, m, 0.16, 0.15))
  })
}

const network: Build = (p, m) => {
  p.group({ ry: 0.2 }, () => {
    easel(p, m, 0.4, 0.2, () => {
      p.box(0.44, 0.19, 0.006, m.pcbDark, { x: 0.02, y: 0.125 })
      p.box(0.24, 0.028, 0.007, m.gold, { x: 0.06, y: 0.016 })
      p.box(0.006, 0.27, 0.05, m.alu, { x: -0.203, y: 0.135, z: 0.022 })
      p.box(0.03, 0.012, 0.05, m.alu, { x: -0.19, y: 0.268, z: 0.022 })
      for (let port = 0; port < 2; port += 1) {
        p.rbox(0.11, 0.04, 0.042, m.alu, { x: -0.145, y: 0.085 + port * 0.07, z: 0.024 }, 0.004)
      }
      p.box(0.13, 0.11, 0.008, m.steelDark, { x: 0.05, y: 0.12, z: 0.007 })
      for (let fin = 0; fin < 9; fin += 1) {
        p.box(0.005, 0.11, 0.03, m.steelDark, { x: -0.01 + fin * 0.015, y: 0.12, z: 0.024 })
      }
      p.box(0.04, 0.04, 0.004, m.chip, { x: 0.17, y: 0.16, z: 0.005 })
      p.box(0.03, 0.02, 0.004, m.chip, { x: 0.18, y: 0.09, z: 0.005 })
      for (let cap = 0; cap < 4; cap += 1) {
        p.cyl(0.008, 0.008, 0.016, m.alu, {
          x: 0.14 + cap * 0.022,
          y: 0.2,
          z: 0.011,
          rx: PI / 2,
        }, 12)
      }
      p.box(0.012, 0.008, 0.003, m.led, { x: -0.07, y: 0.2, z: 0.0045 })
    })
  })
}

/* ── Wholesale ──────────────────────────────────────────────────────── */

const beauty: Build = (p, m) => {
  p.group({ x: -0.17, z: -0.03 }, () => {
    p.lathe(
      [[0, 0], [0.052, 0], [0.058, 0.012], [0.058, 0.2], [0.05, 0.235], [0.024, 0.252], [0.024, 0.275], [0, 0.275]],
      m.porcelain,
    )
    p.cyl(0.0586, 0.0586, 0.085, m.celadon, { y: 0.11 }, 40, true)
    p.cyl(0.028, 0.028, 0.03, m.label, { y: 0.29 }, 24)
    p.cyl(0.008, 0.008, 0.04, m.label, { y: 0.325 }, 12)
    p.rbox(0.075, 0.02, 0.032, m.label, { x: 0.02, y: 0.35 }, 0.008)
  })
  p.group({ x: 0.02, z: 0.06, ry: -0.2 }, () => {
    p.cyl(0.03, 0.03, 0.04, m.label, { y: 0.02 }, 24)
    p.cyl(0.05, 0.03, 0.2, m.persimmon, { y: 0.14, s: [1, 1, 0.5] }, 32)
    p.box(0.102, 0.014, 0.008, m.persimmon, { y: 0.245 })
    p.box(0.056, 0.07, 0.002, m.label, { y: 0.15, z: 0.0215 })
  })
  p.group({ x: 0.19, z: -0.01 }, () => {
    p.cyl(0.062, 0.058, 0.055, m.porcelain, { y: 0.0275 }, 36)
    p.cyl(0.065, 0.065, 0.03, m.gold, { y: 0.07 }, 36)
  })
}

const towels: Build = (p, m) => {
  const cloths = [m.kinari, m.indigo, m.kinari, m.clothGrey]
  cloths.forEach((cloth, index) => {
    p.rbox(0.42 - index * 0.012, 0.066, 0.27, cloth, {
      y: 0.034 + index * 0.066,
      ry: (index % 2 ? 1 : -1) * 0.03,
    }, 0.03, 3)
  })
  const top = cloths.length * 0.066
  p.cyl(0.062, 0.062, 0.24, m.indigo, { x: -0.075, y: top + 0.06, rx: PI / 2 }, 32)
  p.cyl(0.062, 0.062, 0.24, m.kinari, { x: 0.075, y: top + 0.06, rx: PI / 2 }, 32)
}

function knife(p: Parts, m: Mat, length: number) {
  const outline = new THREE.Shape()
  outline.moveTo(0, 0)
  outline.quadraticCurveTo(length * 0.62, -0.004, length, 0.046)
  outline.lineTo(0, 0.062)
  outline.closePath()
  const blade = new THREE.ExtrudeGeometry(outline, {
    depth: 0.004,
    bevelEnabled: false,
    curveSegments: 16,
  })
  blade.translate(0, 0, -0.002)
  p.add(blade, m.blade)
  p.box(0.03, 0.02, 0.004, m.blade, { x: -0.015, y: 0.045 })
  p.cyl(0.017, 0.017, 0.03, m.black, { x: -0.045, y: 0.045, rz: PI / 2 }, 8)
  p.cyl(0.019, 0.017, 0.15, m.hinoki, { x: -0.135, y: 0.045, rz: PI / 2 }, 8)
}

const blades: Build = (p, m) => {
  p.rbox(0.5, 0.026, 0.13, m.woodDark, { y: 0.013 }, 0.006)
  for (const x of [-0.2, 0.18]) {
    p.rbox(0.03, 0.36, 0.045, m.woodDark, { x, y: 0.2, z: -0.025, rx: -0.14 }, 0.006)
  }
  const rests: [number, number, number][] = [
    [0.23, 0.0, 0.3],
    [0.09, 0.018, 0.24],
  ]
  rests.forEach(([y, z, length]) => {
    for (const x of [-0.2, 0.18]) {
      p.cyl(0.006, 0.006, 0.06, m.bamboo, { x, y: y + 0.028, z: z + 0.012, rx: PI / 2 }, 10)
    }
    p.group({ x: -0.03, y, z: z + 0.022, rx: -0.14 }, () => knife(p, m, length))
  })
}

const ceramics: Build = (p, m) => {
  p.group({ x: -0.11, z: -0.03, ry: -0.85 }, () => {
    p.lathe(
      [[0, 0], [0.056, 0], [0.07, 0.01], [0.108, 0.045], [0.118, 0.085], [0.1, 0.13], [0.064, 0.15], [0.05, 0.152]],
      m.celadon,
      undefined,
      48,
      true,
    )
    p.lathe([[0.052, 0.152], [0.048, 0.16], [0.024, 0.168], [0, 0.17]], m.celadon, undefined, 40, true)
    p.sphere(0.016, m.celadon, { y: 0.183 })
    p.cyl(0.011, 0.02, 0.1, m.celadon, { x: 0.135, y: 0.115, rz: -1.05 }, 20)
    p.cyl(0.015, 0.013, 0.12, m.celadon, { y: 0.1, z: 0.15, rx: 1.25 }, 20)
  })
  const cups: [number, number][] = [
    [0.15, 0.07],
    [0.24, -0.05],
  ]
  cups.forEach(([x, z]) => {
    p.group({ x, z }, () => {
      p.lathe(
        [[0, 0], [0.028, 0], [0.033, 0.008], [0.042, 0.07], [0.043, 0.082], [0.039, 0.082], [0.038, 0.074]],
        m.porcelainOpen,
      )
      p.cyl(0.0375, 0.0375, 0.002, m.matcha, { y: 0.072 }, 28)
      p.cyl(0.0414, 0.0396, 0.012, m.indigoGloss, { y: 0.055 }, 32, true)
    })
  })
}

const matchaSet: Build = (p, m) => {
  p.group({ x: -0.18, z: -0.06 }, () => {
    p.cyl(0.066, 0.066, 0.16, m.matchaTin, { y: 0.08 }, 40)
    p.cyl(0.068, 0.068, 0.04, m.alu, { y: 0.18 }, 40)
    p.cyl(0.0666, 0.0666, 0.06, m.label, { y: 0.085 }, 40, true)
  })
  p.group({ x: 0.06, z: 0.01 }, () => {
    p.lathe(
      [[0, 0], [0.036, 0], [0.044, 0.012], [0.076, 0.038], [0.097, 0.08], [0.1, 0.1]],
      m.raku,
      undefined,
      48,
      true,
    )
    p.lathe([[0.1, 0.1], [0.094, 0.1], [0.09, 0.086]], m.raku)
    p.cyl(0.089, 0.089, 0.003, m.matcha, { y: 0.084 }, 40)
  })
  p.group({ x: 0.23, z: 0.11 }, () => {
    p.cyl(0.015, 0.015, 0.06, m.bamboo, { y: 0.03 }, 20)
    p.cyl(0.0165, 0.0165, 0.008, m.black, { y: 0.062 }, 20)
    p.lathe([[0.015, 0.064], [0.02, 0.078], [0.034, 0.11], [0.038, 0.13], [0.03, 0.142]], m.bamboo, undefined, 28)
  })
}

const stationery: Build = (p, m) => {
  const covers = [m.indigo, m.persimmon, m.kinari]
  covers.forEach((cover, index) => {
    p.group({ x: -0.11, y: 0.013 + index * 0.027, z: 0.03, ry: -0.12 + index * 0.1 }, () => {
      p.rbox(0.27, 0.025, 0.19, cover, {}, 0.005)
      p.box(0.006, 0.019, 0.184, m.paper, { x: 0.1335 })
      if (index === covers.length - 1) p.box(0.012, 0.027, 0.192, m.black, { x: 0.085 })
    })
  })
  p.group({ x: 0.2, z: -0.07 }, () => {
    p.lathe(
      [[0, 0], [0.045, 0], [0.05, 0.006], [0.052, 0.12], [0.047, 0.12], [0.045, 0.012], [0, 0.01]],
      m.porcelainOpen,
    )
    const pencils = [m.matchaTin, m.persimmon, m.indigoGloss, m.ivory]
    pencils.forEach((color, index) => {
      const angle = (index / pencils.length) * PI * 2 + 0.4
      p.cyl(0.0075, 0.0075, 0.2, color, {
        x: Math.cos(angle) * 0.02,
        y: 0.112,
        z: Math.sin(angle) * 0.02,
        rz: -Math.cos(angle) * 0.16,
        rx: Math.sin(angle) * 0.16,
      }, 6)
    })
  })
  const tape: [number, number][] = [[0.025, 0], [0.046, 0], [0.046, 0.024], [0.025, 0.024], [0.025, 0]]
  p.lathe(tape, m.mint, { x: 0.17, z: 0.1 }, 32)
  p.lathe(tape, m.persimmon, { x: 0.163, y: 0.024, z: 0.094 }, 32)
}

/* ── Games and apps ─────────────────────────────────────────────────── */

const phone =
  (display: keyof Mat): Build =>
  (p, m) => {
    p.rbox(0.2, 0.02, 0.13, m.label, { y: 0.01, z: -0.02 }, 0.006)
    p.box(0.03, 0.27, 0.012, m.label, { y: 0.135, z: -0.075, rx: 0.3 })
    p.group({ y: 0.022, z: 0.035, rx: -0.2 }, () => {
      p.add(roundedSlab(0.3, 0.63, 0.03, 0.042), m.phone, { y: 0.315 })
      p.add(roundedPlane(0.278, 0.608, 0.032), m[display], { y: 0.315, z: 0.0156 })
    })
  }

const cardGame: Build = (p, m) => {
  p.group({ x: -0.08, z: -0.04, ry: 0.2, rx: -0.12 }, () => {
    p.rbox(0.31, 0.41, 0.085, m.boxSide, { y: 0.205 }, 0.008)
    p.box(0.3, 0.4, 0.002, m.cardBox, { y: 0.205, z: 0.0435 })
  })
  p.rbox(0.2, 0.03, 0.05, m.label, { x: 0.16, y: 0.015, z: 0.1 }, 0.006)
  for (let card = 0; card < 5; card += 1) {
    const spread = card - 2
    p.group({ x: 0.16, y: 0.02, z: 0.1 + card * 0.003, rx: -0.26, rz: -spread * 0.17 }, () => {
      p.box(0.125, 0.183, 0.003, m.cardFace, { y: 0.11 })
    })
  }
}

/* ── Japan entry ────────────────────────────────────────────────────── */

const noren: Build = (p, m) => {
  const panel = { w: 0.485, h: 1.0 }
  for (let index = 0; index < 3; index += 1) {
    const cloth = new THREE.PlaneGeometry(panel.w, panel.h, 8, 4)
    const position = cloth.getAttribute('position')
    const uv = cloth.getAttribute('uv')
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const x = position.getX(vertex)
      const y = position.getY(vertex)
      const sway = (0.5 - y / panel.h) * 0.04
      position.setZ(vertex, Math.sin((x / panel.w) * PI * 1.6 + index * 1.3) * sway)
      uv.setX(vertex, (index + uv.getX(vertex)) / 3)
    }
    cloth.computeVertexNormals()
    p.add(cloth, m.noren, { x: (index - 1) * 0.5, y: panel.h / 2, z: 0.02 })
  }
  p.cyl(0.015, 0.015, 1.68, m.bamboo, { y: panel.h + 0.02, z: 0.02, rz: PI / 2 }, 14)
}

const builders: Record<string, Build> = {
  'fa-parts/servo-motor': servoMotor,
  'fa-parts/servo-amp': servoAmp,
  'fa-parts/plc': plc,
  'fa-parts/inverter': inverter,
  'fa-parts/hmi': hmi,
  'fa-parts/power-io': powerIo,
  'server-parts/ddr5': memoryRack('pcbDark', 'ddr5Label', true),
  'server-parts/ddr4': memoryRack('pcb', 'ddr4Label', false),
  'server-parts/ssd': ssd,
  'server-parts/hdd': hdd,
  'server-parts/cpu': cpu,
  'server-parts/network': network,
  'wholesale/beauty': beauty,
  'wholesale/towels': towels,
  'wholesale/blades': blades,
  'wholesale/ceramics': ceramics,
  'wholesale/matcha': matchaSet,
  'wholesale/stationery': stationery,
  'games/kamihiki': phone('kamihiki'),
  'games/teiji': cardGame,
  'games/tabemo': phone('tabemo'),
  'games/shigosen': phone('shigosen'),
  'japan-entry/noren': noren,
}

export function buildItem(key: string, kit: Kit) {
  const parts = new Parts()
  const build = builders[key]
  if (build) build(parts, kit.mat)
  else parts.rbox(0.3, 0.3, 0.3, kit.mat.paintGrey, { y: 0.15 }, 0.03)
  return parts.build()
}
