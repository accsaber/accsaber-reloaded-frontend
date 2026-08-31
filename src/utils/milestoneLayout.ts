import type { MilestoneSetResponse, PrerequisiteLinkResponse } from '@/types/api/milestones'
import type { MilestoneDisplay } from '@/types/display'
import { boundsOf, squareProjection, type ContentRect, type NodeLayout } from '@/utils/stageLayout'
import {
  frameFor,
  resolveFrameTier,
  type MilestoneFrameTier,
  type MilestoneNodeState,
} from '@/utils/milestoneTiers'

export const MILESTONE_UNIT = 4.6
const NODE_RADIUS_UNITS = 7.4
const REGION_PAD_UNITS = 11
const REGION_GAP_UNITS = 12
const REGION_HEADER_UNITS = 22
const CARD_WIDTH_UNITS = 56
export const CARD_HEAD_UNITS = 36
const CARD_FOOT_UNITS = 6
export const PIP_COLUMNS = 6
export const PIP_SIZE_UNITS = 4.4
export const PIP_GAP_UNITS = 1.9
const GROUP_GAP_UNITS = 24
export const GROUP_LABEL_UNITS = 13

function cardPipRows(total: number): number {
  return Math.max(1, Math.ceil(total / PIP_COLUMNS))
}

function cardHeightUnits(total: number): number {
  return (
    CARD_HEAD_UNITS + cardPipRows(total) * (PIP_SIZE_UNITS + PIP_GAP_UNITS) + CARD_FOOT_UNITS
  )
}

const BAND_TOLERANCE = 7
const COLUMN_PITCH = 28
const ROW_PITCH = 28

export interface MilestonePip {
  tier: MilestoneFrameTier
  completed: boolean
}

export interface MilestoneRegion {
  setId: string
  set: MilestoneSetResponse
  rect: ContentRect
  headerY: number
  collapsed: boolean
  total: number
  completed: number
  pips: MilestonePip[]
}

export interface MilestoneNode extends NodeLayout {
  milestone: MilestoneDisplay
  radius: number
  state: MilestoneNodeState
  glyphSize: number
  hasReward: boolean
}

export interface MilestoneEdge {
  id: string
  d: string
  satisfied: boolean
  blocker: boolean
}

export interface MilestoneGroupBand {
  id: string
  name: string | null
  rect: ContentRect
}

export interface MilestoneMap {
  regions: MilestoneRegion[]
  nodes: MilestoneNode[]
  edges: MilestoneEdge[]
  groups: MilestoneGroupBand[]
  bounds: ContentRect
  focusedRect: ContentRect | null
}

export interface MilestoneSetGroup {
  id: string
  name: string | null
  setIds: string[]
}

export interface MilestoneMapInput {
  milestones: MilestoneDisplay[]
  sets: MilestoneSetResponse[]
  groups: MilestoneSetGroup[]
  prerequisites: PrerequisiteLinkResponse[]
  loggedIn: boolean
  focusedSetId: string | null
}

function bandIndex(values: number[]): Map<number, number> {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const out = new Map<number, number>()
  let index = 0
  let anchor = sorted[0]
  for (const value of sorted) {
    if (value - anchor > BAND_TOLERANCE) {
      index++
      anchor = value
    }
    out.set(value, index)
  }
  return out
}

function snapPositions(items: MilestoneDisplay[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  if (items.length === 0) return out

  const columns = bandIndex(items.map((m) => m.positionX))
  const rows = bandIndex(items.map((m) => m.positionY))

  const spread = columns.size > 1 || rows.size > 1
  items.forEach((m, i) => {
    if (!spread) {
      out.set(m.id, { x: (i % 4) * COLUMN_PITCH, y: Math.floor(i / 4) * ROW_PITCH })
      return
    }
    out.set(m.id, {
      x: (columns.get(m.positionX) ?? 0) * COLUMN_PITCH,
      y: (rows.get(m.positionY) ?? 0) * ROW_PITCH,
    })
  })
  return out
}

function stateFor(
  milestone: MilestoneDisplay,
  loggedIn: boolean,
  blocked: boolean,
): MilestoneNodeState {
  if (milestone.isCompleted) return 'completed'
  if (blocked) return 'locked'
  if (!loggedIn) return 'available'
  return (milestone.normalizedProgress ?? 0) > 0 ? 'progress' : 'available'
}

function blockedIds(prerequisites: PrerequisiteLinkResponse[], completed: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const p of prerequisites) {
    if (!p.blocker) continue
    if (!completed.has(p.prerequisiteMilestoneId)) out.add(p.milestoneId)
  }
  return out
}

function routeEdge(from: NodeLayout, to: NodeLayout, radius: number): string {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  if (Math.abs(dy) < 1) return `M${from.cx.toFixed(1)} ${from.cy.toFixed(1)}H${to.cx.toFixed(1)}`
  if (Math.abs(dx) < 1) return `M${from.cx.toFixed(1)} ${from.cy.toFixed(1)}V${to.cy.toFixed(1)}`

  const midX = from.cx + dx / 2
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(dy) / 2)
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  return [
    `M${from.cx.toFixed(1)} ${from.cy.toFixed(1)}`,
    `H${(midX - r * sx).toFixed(1)}`,
    `Q${midX.toFixed(1)} ${from.cy.toFixed(1)} ${midX.toFixed(1)} ${(from.cy + r * sy).toFixed(1)}`,
    `V${(to.cy - r * sy).toFixed(1)}`,
    `Q${midX.toFixed(1)} ${to.cy.toFixed(1)} ${(midX + r * sx).toFixed(1)} ${to.cy.toFixed(1)}`,
    `H${to.cx.toFixed(1)}`,
  ].join(' ')
}

function nodeRadius(tier: string, unit: number): number {
  return frameFor(resolveFrameTier(tier)).sizeScale * NODE_RADIUS_UNITS * unit
}

function pipsFor(items: MilestoneDisplay[]): MilestonePip[] {
  return items.map((m) => ({
    tier: resolveFrameTier(m.tier),
    completed: !!m.isCompleted,
  }))
}

interface BuildContext {
  unit: number
  loggedIn: boolean
  blocked: Set<string>
}

function groupBySet(milestones: MilestoneDisplay[]): Map<string, MilestoneDisplay[]> {
  const out = new Map<string, MilestoneDisplay[]>()
  for (const m of milestones) {
    const list = out.get(m.setId)
    if (list) list.push(m)
    else out.set(m.setId, [m])
  }
  return out
}

function collapsedRegion(
  set: MilestoneSetResponse,
  items: MilestoneDisplay[],
  cursorX: number,
  unit: number,
): MilestoneRegion {
  return {
    setId: set.id,
    set,
    rect: {
      x: cursorX,
      y: 0,
      width: CARD_WIDTH_UNITS * unit,
      height: cardHeightUnits(items.length) * unit,
    },
    headerY: REGION_PAD_UNITS * unit * 0.6,
    collapsed: true,
    total: items.length,
    completed: items.filter((m) => m.isCompleted).length,
    pips: pipsFor(items),
  }
}

function focusedNodes(
  items: MilestoneDisplay[],
  cursorX: number,
  ctx: BuildContext,
): { nodes: MilestoneNode[]; rect: ContentRect } {
  const { unit } = ctx
  const positions = snapPositions(items)
  const placed = items.map((m) => {
    const p = positions.get(m.id)!
    return { milestone: m, ...squareProjection.toContent(p.x, p.y, unit) }
  })
  const b = boundsOf(placed.map((n) => ({ id: n.milestone.id, cx: n.cx, cy: n.cy })))
  const maxRadius = items.reduce((acc, m) => Math.max(acc, nodeRadius(m.tier, unit)), 0)

  const pad = REGION_PAD_UNITS * unit + maxRadius
  const originX = cursorX + pad - b.minX
  const originY = pad + REGION_HEADER_UNITS * unit - b.minY

  const nodes = placed.map(({ milestone, cx, cy }) => {
    const frame = frameFor(resolveFrameTier(milestone.tier))
    const radius = frame.sizeScale * NODE_RADIUS_UNITS * unit
    return {
      id: milestone.id,
      cx: originX + cx,
      cy: originY + cy,
      milestone,
      radius,
      glyphSize: radius * 2 * frame.glyphScale,
      state: stateFor(milestone, ctx.loggedIn, ctx.blocked.has(milestone.id)),
      hasReward: milestone.rewards.length > 0,
    }
  })

  return {
    nodes,
    rect: {
      x: cursorX,
      y: 0,
      width: b.width + pad * 2,
      height: b.height + pad * 2 + REGION_HEADER_UNITS * unit,
    },
  }
}

function buildEdges(
  prerequisites: PrerequisiteLinkResponse[],
  nodeById: Map<string, MilestoneNode>,
  completed: Set<string>,
  unit: number,
): MilestoneEdge[] {
  const radius = unit * 4
  const out: MilestoneEdge[] = []
  for (const p of prerequisites) {
    const to = nodeById.get(p.milestoneId)
    const from = nodeById.get(p.prerequisiteMilestoneId)
    if (!to || !from) continue
    out.push({
      id: p.id,
      d: routeEdge(from, to, radius),
      satisfied: completed.has(p.prerequisiteMilestoneId),
      blocker: p.blocker,
    })
  }
  return out
}

interface LayoutPass {
  regions: MilestoneRegion[]
  nodes: MilestoneNode[]
  groups: MilestoneGroupBand[]
  focusedRect: ContentRect | null
  width: number
  height: number
}

interface Band {
  regions: MilestoneRegion[]
  nodes: MilestoneNode[]
  focusedRect: ContentRect | null
  width: number
  height: number
}

interface BandEntry {
  setId: string
  set: MilestoneSetResponse
  items: MilestoneDisplay[]
}

function bandEntries(
  setIds: string[],
  bySet: Map<string, MilestoneDisplay[]>,
  setById: Map<string, MilestoneSetResponse>,
): BandEntry[] {
  const out: BandEntry[] = []
  for (const setId of setIds) {
    const set = setById.get(setId)
    const items = bySet.get(setId)
    if (set && items && items.length > 0) out.push({ setId, set, items })
  }
  return out
}

function layoutBand(
  entries: BandEntry[],
  focusedSetId: string | null,
  ctx: BuildContext,
): Band {
  const height = entries.reduce(
    (acc, e) => Math.max(acc, cardHeightUnits(e.items.length) * ctx.unit),
    0,
  )
  const regions: MilestoneRegion[] = []
  const nodes: MilestoneNode[] = []
  let focusedRect: ContentRect | null = null
  let cursorX = 0

  for (const entry of entries) {
    if (entry.setId !== focusedSetId) {
      const region = collapsedRegion(entry.set, entry.items, cursorX, ctx.unit)
      region.rect.y = (height - region.rect.height) / 2
      regions.push(region)
      cursorX += region.rect.width + REGION_GAP_UNITS * ctx.unit
      continue
    }

    const focused = focusedNodes(entry.items, cursorX, ctx)
    nodes.push(...focused.nodes)
    focusedRect = focused.rect
    regions.push({
      setId: entry.setId,
      set: entry.set,
      rect: focused.rect,
      headerY: REGION_PAD_UNITS * ctx.unit * 0.6,
      collapsed: false,
      total: entry.items.length,
      completed: entry.items.filter((m) => m.isCompleted).length,
      pips: [],
    })
    cursorX += focused.rect.width + REGION_GAP_UNITS * ctx.unit
  }

  const width = regions.length > 0 ? cursorX - REGION_GAP_UNITS * ctx.unit : 0
  const spanned = Math.max(height, focusedRect ? focusedRect.height : 0)
  return { regions, nodes, focusedRect, width, height: spanned }
}

function shiftBand(band: Band, dy: number): void {
  for (const r of band.regions) r.rect.y += dy
  for (const n of band.nodes) n.cy += dy
}

function layoutRegions(input: MilestoneMapInput, ctx: BuildContext): LayoutPass {
  const bySet = groupBySet(input.milestones)
  const setById = new Map(input.sets.map((s) => [s.id, s]))
  const regions: MilestoneRegion[] = []
  const nodes: MilestoneNode[] = []
  const groups: MilestoneGroupBand[] = []
  let focusedRect: ContentRect | null = null
  let width = 0
  let bottom = 0
  let cursorY = 0

  for (const group of input.groups) {
    const entries = bandEntries(group.setIds, bySet, setById)
    if (entries.length === 0) continue

    const band = layoutBand(entries, input.focusedSetId, ctx)
    const labelSpace = group.name ? GROUP_LABEL_UNITS * ctx.unit : 0
    shiftBand(band, cursorY + labelSpace)

    groups.push({
      id: group.id,
      name: group.name,
      rect: { x: 0, y: cursorY, width: band.width, height: labelSpace + band.height },
    })


    regions.push(...band.regions)
    nodes.push(...band.nodes)
    if (band.focusedRect) focusedRect = band.focusedRect
    width = Math.max(width, band.width)
    cursorY += labelSpace + band.height + GROUP_GAP_UNITS * ctx.unit
    bottom = Math.max(bottom, cursorY - GROUP_GAP_UNITS * ctx.unit)
  }

  regions.sort((a, b) => Number(a.collapsed === false) - Number(b.collapsed === false))

  return { regions, nodes, groups, focusedRect, width, height: bottom }
}

export function buildMilestoneMap(input: MilestoneMapInput): MilestoneMap {
  const unit = MILESTONE_UNIT
  const completed = new Set(input.milestones.filter((m) => m.isCompleted).map((m) => m.id))
  const ctx: BuildContext = {
    unit,
    loggedIn: input.loggedIn,
    blocked: blockedIds(input.prerequisites, completed),
  }

  const { regions, nodes, groups, focusedRect, width, height } = layoutRegions(input, ctx)
  const margin = 6 * unit

  return {
    regions,
    nodes,
    groups,
    edges: buildEdges(input.prerequisites, new Map(nodes.map((n) => [n.id, n])), completed, unit),
    focusedRect,
    bounds: {
      x: -margin,
      y: -margin,
      width: Math.max(width, 1) + margin * 2,
      height: Math.max(height, 1) + margin * 2,
    },
  }
}

export function nearestNodeInDirection(
  nodes: MilestoneNode[],
  from: MilestoneNode,
  dx: number,
  dy: number,
): MilestoneNode | null {
  let best: MilestoneNode | null = null
  let bestScore = Infinity
  for (const n of nodes) {
    if (n.id === from.id) continue
    const vx = n.cx - from.cx
    const vy = n.cy - from.cy
    const along = vx * dx + vy * dy
    if (along <= 0) continue
    const across = Math.abs(vx * dy - vy * dx)
    const score = along + across * 2.5
    if (score < bestScore) {
      bestScore = score
      best = n
    }
  }
  return best
}
