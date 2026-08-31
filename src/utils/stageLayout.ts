export const SQRT3 = Math.sqrt(3)

export interface ContentRect {
  x: number
  y: number
  width: number
  height: number
}

export interface NodeLayout {
  id: string
  cx: number
  cy: number
}

export interface GridPoint {
  positionX: number
  positionY: number
}

export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function roundToPrecision(value: number): number {
  return Math.round(value * 100) / 100
}

export function unionRect(a: ContentRect, b: ContentRect): ContentRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

export interface GridProjection {
  toContent(positionX: number, positionY: number, unit: number): { cx: number; cy: number }
  toGrid(cx: number, cy: number, unit: number, snap: boolean): GridPoint
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

function hexRowOffset(positionX: number, unit: number): number {
  const stagger = 1 - Math.abs(1 - mod(positionX, 2))
  return ((unit * SQRT3) / 2) * stagger
}

export const hexProjection: GridProjection = {
  toContent(positionX, positionY, unit) {
    return {
      cx: positionX * unit * 1.5,
      cy: positionY * unit * SQRT3 + hexRowOffset(positionX, unit),
    }
  },
  toGrid(cx, cy, unit, snap) {
    const rawX = cx / (unit * 1.5)
    const positionX = snap ? Math.round(rawX) : roundToPrecision(rawX)
    const rawY = (cy - hexRowOffset(positionX, unit)) / (unit * SQRT3)
    return { positionX, positionY: snap ? Math.round(rawY) : roundToPrecision(rawY) }
  },
}

export const squareProjection: GridProjection = {
  toContent(positionX, positionY, unit) {
    return { cx: positionX * unit, cy: positionY * unit }
  },
  toGrid(cx, cy, unit, snap) {
    const rawX = cx / unit
    const rawY = cy / unit
    return {
      positionX: snap ? Math.round(rawX) : roundToPrecision(rawX),
      positionY: snap ? Math.round(rawY) : roundToPrecision(rawY),
    }
  },
}

const EMPTY_BOUNDS: LayoutBounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
  width: 0,
  height: 0,
}

export function boundsOf(nodes: NodeLayout[]): LayoutBounds {
  if (nodes.length === 0) return { ...EMPTY_BOUNDS }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    if (n.cx < minX) minX = n.cx
    if (n.cy < minY) minY = n.cy
    if (n.cx > maxX) maxX = n.cx
    if (n.cy > maxY) maxY = n.cy
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function layoutNodes(
  points: ({ id: string } & GridPoint)[],
  unit: number,
  projection: GridProjection = hexProjection,
): { nodes: NodeLayout[]; bounds: LayoutBounds } {
  const nodes: NodeLayout[] = points.map((p) => ({
    id: p.id,
    ...projection.toContent(p.positionX, p.positionY, unit),
  }))
  return { nodes, bounds: boundsOf(nodes) }
}

export function findOverlaps(vertices: NodeLayout[], minDistance: number): Set<string> {
  const out = new Set<string>()
  const limit = minDistance * minDistance
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i].cx - vertices[j].cx
      const dy = vertices[i].cy - vertices[j].cy
      if (dx * dx + dy * dy < limit) {
        out.add(vertices[i].id)
        out.add(vertices[j].id)
      }
    }
  }
  return out
}

export interface LabelPlacement {
  x: number
  y: number
  anchor: 'middle' | 'start' | 'end'
  boxed?: boolean
}

interface LabelNodeInput {
  id: string
  cx: number
  cy: number
  size: number
  text: string
}

interface LabelBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

const AVG_CHAR_WIDTH = 0.56

function circleHitsBox(cx: number, cy: number, r: number, box: LabelBox): boolean {
  const nx = Math.max(box.x0, Math.min(cx, box.x1))
  const ny = Math.max(box.y0, Math.min(cy, box.y1))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

export function computeLabelPlacements(nodes: LabelNodeInput[]): Map<string, LabelPlacement> {
  const result = new Map<string, LabelPlacement>()
  const circles = nodes.map((n) => ({ id: n.id, cx: n.cx, cy: n.cy, r: n.size * 1.2 }))
  const placed: LabelBox[] = []

  const order = [...nodes].sort((a, b) => a.cy - b.cy || a.cx - b.cx)

  for (const n of order) {
    const fontSize = Math.max(n.size * 0.22, 9)
    const width = Math.max(n.text.length * fontSize * AVG_CHAR_WIDTH, fontSize)
    const halfW = width / 2
    const ascent = fontSize * 0.9
    const descent = fontSize * 0.18
    const pad = Math.max(3, fontSize * 0.3)
    const s = n.size
    const sideY = n.cy + fontSize * 0.32

    const vert = (y: number): { placement: LabelPlacement; box: LabelBox } => ({
      placement: { x: n.cx, y, anchor: 'middle' },
      box: { x0: n.cx - halfW, x1: n.cx + halfW, y0: y - ascent, y1: y + descent },
    })
    const right = (x: number): { placement: LabelPlacement; box: LabelBox } => ({
      placement: { x, y: sideY, anchor: 'start' },
      box: { x0: x, x1: x + width, y0: sideY - ascent, y1: sideY + descent },
    })
    const left = (x: number): { placement: LabelPlacement; box: LabelBox } => ({
      placement: { x, y: sideY, anchor: 'end' },
      box: { x0: x - width, x1: x, y0: sideY - ascent, y1: sideY + descent },
    })

    const candidates = [
      vert(n.cy + s * 1.55),
      vert(n.cy - s * 1.25),
      right(n.cx + s * 1.25),
      left(n.cx - s * 1.25),
      vert(n.cy + s * 2.75),
      vert(n.cy - s * 2.45),
      right(n.cx + s * 2.55),
      left(n.cx - s * 2.55),
    ]

    const isClear = (box: LabelBox): boolean => {
      const inflated = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad }
      for (const c of circles) {
        if (c.id === n.id) continue
        if (circleHitsBox(c.cx, c.cy, c.r, inflated)) return false
      }
      for (const box2 of placed) {
        if (boxesOverlap(inflated, box2)) return false
      }
      return true
    }

    const clear = candidates.find((cand) => isClear(cand.box))
    if (clear) {
      result.set(n.id, clear.placement)
      placed.push(clear.box)
    } else {
      result.set(n.id, { x: n.cx, y: sideY, anchor: 'middle', boxed: true })
      const bw = Math.min(halfW, s)
      placed.push({ x0: n.cx - bw, x1: n.cx + bw, y0: n.cy - fontSize, y1: n.cy + fontSize })
    }
  }

  return result
}
