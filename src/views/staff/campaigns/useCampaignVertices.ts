import {
  movePlayerCampaignElements,
  updatePlayerCampaignBarrier,
  updatePlayerCampaignDifficulty,
  updatePlayerCampaignText,
} from '@/api/campaigns'
import { ApiError, parseApiError } from '@/api/client'
import type {
  CampaignBarrierResponse,
  CampaignDifficultyResponse,
  CampaignTextResponse,
} from '@/types/api/campaigns'
import type { BackgroundFrame } from '@/utils/campaignLayout'
import { clamp } from '@/utils/math'
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, ref, type ComputedRef } from 'vue'
import type { CampaignDocument } from './useCampaignDocument'

const GRID_LOCK_STORAGE_KEY = 'campaign-editor:grid-lock'
const OCCUPIED_CELL_STATUSES = new Set([409, 422])

type Cell = { x: number; y: number }

interface VerticesContext {
  doc: CampaignDocument
  selectedId: ComputedRef<string | null>
  isPendingText: (id: string) => boolean
}

export function useCampaignVertices(ctx: VerticesContext) {
  const { campaign, actionError } = ctx.doc
  const { selectedId, isPendingText } = ctx

  const difficultyById = computed(
    () => new Map((campaign.value?.difficulties ?? []).map((d) => [d.id, d])),
  )

  const barrierById = computed(() => {
    const map = new Map<string, CampaignBarrierResponse>()
    for (const b of campaign.value?.barriers ?? []) map.set(b.id, b)
    return map
  })

  const textById = computed(() => {
    const map = new Map<string, CampaignTextResponse>()
    for (const t of campaign.value?.texts ?? []) map.set(t.id, t)
    return map
  })

  function isBarrierId(id: string): boolean {
    return barrierById.value.has(id)
  }

  function isTextId(id: string): boolean {
    return textById.value.has(id)
  }

  const selectedDifficulty = computed<CampaignDifficultyResponse | null>(() =>
    selectedId.value ? (difficultyById.value.get(selectedId.value) ?? null) : null,
  )

  const selectedBarrier = computed<CampaignBarrierResponse | null>(() =>
    selectedId.value ? (barrierById.value.get(selectedId.value) ?? null) : null,
  )

  const selectedText = computed<CampaignTextResponse | null>(() =>
    selectedId.value ? (textById.value.get(selectedId.value) ?? null) : null,
  )

  const gridLock = ref(readStoredString(GRID_LOCK_STORAGE_KEY) !== '0')

  function toggleGridLock() {
    gridLock.value = !gridLock.value
    writeStoredString(GRID_LOCK_STORAGE_KEY, gridLock.value ? '1' : '0')
  }

  const canvasFrame = ref<BackgroundFrame | null>(null)

  let viewCenterProvider: (() => Cell | null) | null = null

  function setViewCenterProvider(fn: (() => Cell | null) | null) {
    viewCenterProvider = fn
  }

  function vertexPosition(id: string): Cell | null {
    const v = barrierById.value.get(id) ?? textById.value.get(id) ?? difficultyById.value.get(id)
    return v ? { x: v.positionX, y: v.positionY } : null
  }

  function setVertexPositionsLocal(positions: Map<string, Cell>) {
    if (!campaign.value) return
    const place = <T extends { id: string; positionX: number; positionY: number }>(rows: T[]) => {
      let hit = false
      const next = rows.map((r) => {
        const p = positions.get(r.id)
        if (!p) return r
        hit = true
        return { ...r, positionX: p.x, positionY: p.y }
      })
      return hit ? next : rows
    }
    campaign.value = {
      ...campaign.value,
      difficulties: place(campaign.value.difficulties),
      barriers: place(campaign.value.barriers),
      texts: place(campaign.value.texts),
    }
  }

  function setVertexPositionLocal(id: string, x: number, y: number) {
    setVertexPositionsLocal(new Map([[id, { x, y }]]))
  }

  function patchVertexPosition(id: string, positionX: number, positionY: number) {
    const patch = { positionX, positionY }
    if (isBarrierId(id)) return updatePlayerCampaignBarrier(id, patch)
    if (isTextId(id)) {
      if (isPendingText(id)) return Promise.resolve()
      return updatePlayerCampaignText(id, patch)
    }
    return updatePlayerCampaignDifficulty(id, patch)
  }

  function reportMoveError(err: unknown, fallback: string) {
    if (err instanceof ApiError && OCCUPIED_CELL_STATUSES.has(err.status)) {
      actionError.value =
        'Something is already there. Drop it on an empty spot, or turn the grid lock off to place freely.'
      return
    }
    actionError.value = parseApiError(err, fallback).message
  }

  async function handleMove(payload: { id: string; positionX: number; positionY: number }) {
    if (!campaign.value) return
    const prev = vertexPosition(payload.id)
    if (!prev) return
    if (prev.x === payload.positionX && prev.y === payload.positionY) return

    setVertexPositionLocal(payload.id, payload.positionX, payload.positionY)

    try {
      actionError.value = null
      await patchVertexPosition(payload.id, payload.positionX, payload.positionY)
    } catch (err) {
      reportMoveError(err, 'Failed to move node')
      setVertexPositionLocal(payload.id, prev.x, prev.y)
    }
  }

  async function handleMoveMany(
    payloads: Array<{ id: string; positionX: number; positionY: number }>,
  ) {
    if (!campaign.value || payloads.length === 0) return
    const prevById = new Map<string, Cell>()
    for (const p of payloads) {
      const prev = vertexPosition(p.id)
      if (prev) prevById.set(p.id, prev)
    }
    const moves = payloads.filter((p) => {
      const prev = prevById.get(p.id)
      return prev && (prev.x !== p.positionX || prev.y !== p.positionY)
    })
    if (moves.length === 0) return
    setVertexPositionsLocal(new Map(moves.map((m) => [m.id, { x: m.positionX, y: m.positionY }])))
    const persisted = moves.filter((m) => !isPendingText(m.id))
    if (persisted.length === 0) return
    try {
      actionError.value = null
      await movePlayerCampaignElements(campaign.value.id, persisted)
    } catch (err) {
      reportMoveError(err, 'Failed to move nodes')
      setVertexPositionsLocal(prevById)
    }
  }

  function occupancy(includeTexts: boolean) {
    const c = campaign.value
    const rows = [
      ...(c?.difficulties ?? []),
      ...(c?.barriers ?? []),
      ...(includeTexts ? (c?.texts ?? []) : []),
    ]
    const cells = new Set<string>()
    let maxY = -Infinity
    for (const r of rows) {
      cells.add(`${r.positionX},${r.positionY}`)
      if (r.positionY > maxY) maxY = r.positionY
    }
    return { cells, maxY }
  }

  function allocateCells(count: number): Cell[] {
    const { cells: occupied, maxY } = occupancy(true)
    let baseY = 0

    const cells: Cell[] = []
    const claim = (x: number, y: number) => {
      const key = `${x},${y}`
      if (occupied.has(key)) return
      occupied.add(key)
      cells.push({ x, y })
    }

    const origin = viewCenterProvider?.() ?? null
    if (origin) {
      claim(origin.x, origin.y)
      const maxRing = count + 10
      for (let r = 1; cells.length < count && r <= maxRing; r++) {
        for (let dx = -r; dx <= r && cells.length < count; dx++) {
          for (let dy = -r; dy <= r && cells.length < count; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
            claim(origin.x + dx, origin.y + dy)
          }
        }
      }
      if (cells.length >= count) return cells.slice(0, count)
    }

    if (occupied.size > 0) baseY = maxY + 2
    const perRow = clamp(count, 1, 6)
    for (let row = 0; cells.length < count && row < count + 4; row++) {
      for (let col = 0; col < perRow && cells.length < count; col++) {
        claim(col, baseY + row * 2)
      }
    }
    return cells
  }

  function findFreeCellNear(x: number, y: number): Cell {
    const occ = occupancy(false).cells
    if (!occ.has(`${x},${y}`)) return { x, y }
    for (let r = 1; r <= 8; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          if (!occ.has(`${x + dx},${y + dy}`)) return { x: x + dx, y: y + dy }
        }
      }
    }
    return { x, y }
  }

  return {
    difficultyById,
    barrierById,
    textById,
    isBarrierId,
    isTextId,
    selectedDifficulty,
    selectedBarrier,
    selectedText,
    gridLock,
    toggleGridLock,
    canvasFrame,
    setViewCenterProvider,
    vertexPosition,
    handleMove,
    handleMoveMany,
    allocateCells,
    findFreeCellNear,
  }
}

export type CampaignVertices = ReturnType<typeof useCampaignVertices>
