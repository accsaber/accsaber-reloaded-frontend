import { updatePlayerCampaignBarrier, updatePlayerCampaignDifficulty } from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type { CampaignPrerequisiteResponse } from '@/types/api/campaigns'
import {
  CONNECTION_COLOR_RE,
  MAX_PREREQUISITES_PER_NODE,
  prereqIds,
  toPrerequisiteInputs,
} from '@/utils/campaignLayout'
import { computed, ref, watch, type ComputedRef } from 'vue'
import type { CampaignDocument } from './useCampaignDocument'
import type { CampaignVertices } from './useCampaignVertices'

export type CampaignEdge = { fromId: string; toId: string }

interface ConnectionsContext {
  doc: CampaignDocument
  vertices: CampaignVertices
  editable: ComputedRef<boolean>
}

export function useCampaignConnections(ctx: ConnectionsContext) {
  const { campaign, actionError, replaceRow, mergeDifficulty } = ctx.doc
  const { barrierById, difficultyById, isBarrierId } = ctx.vertices
  const { editable } = ctx

  const selectedEdge = ref<CampaignEdge | null>(null)

  function vertexPrereqs(id: string): CampaignPrerequisiteResponse[] | null {
    const v = barrierById.value.get(id) ?? difficultyById.value.get(id)
    return v ? (v.prerequisites ?? []) : null
  }

  function nodeLabel(id: string): string {
    const b = barrierById.value.get(id)
    if (b) return b.checkpointLabel || 'gate'
    return difficultyById.value.get(id)?.songName || 'node'
  }

  const selectedEdgePrereq = computed<CampaignPrerequisiteResponse | null>(() => {
    const edge = selectedEdge.value
    if (!edge) return null
    const prereqs = vertexPrereqs(edge.toId)
    return prereqs?.find((p) => p.comesFromCampaignDifficultyId === edge.fromId) ?? null
  })

  const selectedEdgeEndpoints = computed<{ from: string; to: string } | null>(() => {
    const edge = selectedEdge.value
    if (!edge) return null
    return { from: nodeLabel(edge.fromId), to: nodeLabel(edge.toId) }
  })

  const formConnection = ref({ color: '' })
  const connectionColorError = ref<string | null>(null)

  watch(
    selectedEdgePrereq,
    (p) => {
      formConnection.value = { color: p?.color ?? '' }
      connectionColorError.value = null
    },
    { immediate: true },
  )

  watch(campaign, () => {
    if (selectedEdge.value && !selectedEdgePrereq.value) selectedEdge.value = null
  })

  const hasConnections = computed(() => {
    const c = campaign.value
    if (!c) return false
    return (
      c.difficulties.some((d) => (d.prerequisites?.length ?? 0) > 0) ||
      c.barriers.some((b) => (b.prerequisites?.length ?? 0) > 0)
    )
  })

  function setPrereqsLocal(toId: string, entries: CampaignPrerequisiteResponse[]) {
    replaceRow(isBarrierId(toId) ? 'barriers' : 'difficulties', toId, (r) => ({
      ...r,
      prerequisites: entries,
    }))
  }

  async function persistPrereqs(
    toId: string,
    next: CampaignPrerequisiteResponse[],
    prev: CampaignPrerequisiteResponse[],
  ) {
    if (!campaign.value) return
    const barrier = isBarrierId(toId)
    setPrereqsLocal(toId, next)
    try {
      actionError.value = null
      const payload = { prerequisites: toPrerequisiteInputs(next) }
      if (barrier) {
        const updated = await updatePlayerCampaignBarrier(toId, payload)
        replaceRow('barriers', toId, () => updated)
      } else {
        mergeDifficulty(await updatePlayerCampaignDifficulty(toId, payload))
      }
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to update prerequisites').message
      setPrereqsLocal(toId, prev)
    }
  }

  function commitConnectionColor() {
    const edge = selectedEdge.value
    const current = selectedEdgePrereq.value
    if (!editable.value || !edge || !current) return
    const value = formConnection.value.color.trim()
    formConnection.value.color = value
    if (!CONNECTION_COLOR_RE.test(value)) {
      connectionColorError.value =
        'Use a hex value (with or without #) or a named color, max 32 characters.'
      return
    }
    connectionColorError.value = null
    if (value === (current.color ?? '')) return
    const prev = vertexPrereqs(edge.toId)
    if (!prev) return
    const next = prev.map((p) =>
      p.comesFromCampaignDifficultyId === edge.fromId ? { ...p, color: value || null } : p,
    )
    void persistPrereqs(edge.toId, next, prev)
  }

  function resetConnectionColor() {
    formConnection.value.color = ''
    commitConnectionColor()
  }

  function wouldCreateCycle(fromId: string, toId: string): boolean {
    if (fromId === toId) return true
    const c = campaign.value
    if (!c) return false
    const successors = new Map<string, string[]>()
    const addEdges = (id: string, prereqs: CampaignPrerequisiteResponse[] | undefined) => {
      for (const pid of prereqIds(prereqs)) {
        const list = successors.get(pid) ?? []
        list.push(id)
        successors.set(pid, list)
      }
    }
    for (const d of c.difficulties) addEdges(d.id, d.prerequisites)
    for (const b of c.barriers) addEdges(b.id, b.prerequisites)
    const visited = new Set<string>()
    const stack: string[] = [toId]
    while (stack.length > 0) {
      const id = stack.pop() as string
      if (visited.has(id)) continue
      visited.add(id)
      if (id === fromId) return true
      for (const next of successors.get(id) ?? []) stack.push(next)
    }
    return false
  }

  async function handleConnect(payload: CampaignEdge) {
    const prev = vertexPrereqs(payload.toId)
    if (prev == null) return
    if (prev.some((p) => p.comesFromCampaignDifficultyId === payload.fromId)) return
    if (prev.length >= MAX_PREREQUISITES_PER_NODE) {
      actionError.value = `"${nodeLabel(payload.toId)}" already has the maximum of ${MAX_PREREQUISITES_PER_NODE} incoming connections.`
      return
    }
    if (wouldCreateCycle(payload.fromId, payload.toId)) {
      actionError.value = `Can't connect "${nodeLabel(payload.fromId)}" → "${nodeLabel(payload.toId)}". The reverse path already exists, which would create a cycle.`
      return
    }
    await persistPrereqs(
      payload.toId,
      [...prev, { comesFromCampaignDifficultyId: payload.fromId, color: null }],
      prev,
    )
  }

  async function handleDisconnect(payload: CampaignEdge) {
    const prev = vertexPrereqs(payload.toId)
    if (prev == null) return
    if (!prev.some((p) => p.comesFromCampaignDifficultyId === payload.fromId)) return
    if (
      selectedEdge.value?.fromId === payload.fromId &&
      selectedEdge.value?.toId === payload.toId
    ) {
      selectedEdge.value = null
    }
    await persistPrereqs(
      payload.toId,
      prev.filter((p) => p.comesFromCampaignDifficultyId !== payload.fromId),
      prev,
    )
  }

  return {
    selectedEdge,
    selectedEdgeEndpoints,
    formConnection,
    connectionColorError,
    commitConnectionColor,
    resetConnectionColor,
    hasConnections,
    vertexPrereqs,
    handleConnect,
    handleDisconnect,
  }
}

export type CampaignConnections = ReturnType<typeof useCampaignConnections>
