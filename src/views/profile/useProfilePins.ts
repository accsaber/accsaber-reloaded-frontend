import type { PinnedScoreResponse, UserMilestoneProgressResponse } from '@/types/api/users'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

interface PinContext {
  userId: MaybeRefOrGetter<string>
  isSelfProfile: MaybeRefOrGetter<boolean>
  slotLimit: MaybeRefOrGetter<number>
}

function withPending(set: Set<string>, id: string, pending: boolean): Set<string> {
  const next = new Set(set)
  if (pending) next.add(id)
  else next.delete(id)
  return next
}

export function usePinnedScores({ userId, isSelfProfile, slotLimit }: PinContext) {
  const pinned = ref<PinnedScoreResponse[]>([])
  const loading = ref(false)
  const pending = ref<Set<string>>(new Set())

  const pinnedIds = computed(() => new Set(pinned.value.map((p) => p.score.id)))
  const canPinMore = computed(() => pinned.value.length < toValue(slotLimit))

  async function fetch() {
    const id = toValue(userId)
    loading.value = true
    let next: PinnedScoreResponse[] = []
    try {
      const { getUserPinnedScores } = await import('@/api/users')
      next = await getUserPinnedScores(id)
    } catch {
      next = []
    }
    if (id !== toValue(userId)) return
    pinned.value = next
    loading.value = false
  }

  function buildPayload(ids: string[], commentOverride?: { scoreId: string, comment: string | null }) {
    const existingCommentByScoreId = new Map(pinned.value.map((p) => [p.score.id, p.comment]))
    return ids.map((id, displayOrder) => {
      const comment = commentOverride?.scoreId === id
        ? commentOverride.comment
        : existingCommentByScoreId.get(id) ?? null
      return { scoreId: id, displayOrder, comment }
    })
  }

  async function toggle(scoreId: string) {
    if (!toValue(isSelfProfile) || pending.value.has(scoreId)) return
    const currentIds = pinned.value.map((p) => p.score.id)
    const isPinned = currentIds.includes(scoreId)
    const nextIds = isPinned ? currentIds.filter((id) => id !== scoreId) : [...currentIds, scoreId]
    if (nextIds.length > toValue(slotLimit)) return

    pending.value = withPending(pending.value, scoreId, true)
    try {
      const { updateMyProfile } = await import('@/api/users')
      await updateMyProfile({ pinnedScores: buildPayload(nextIds) })
      if (isPinned) pinned.value = pinned.value.filter((p) => p.score.id !== scoreId)
      else await fetch()
    } catch {
    } finally {
      pending.value = withPending(pending.value, scoreId, false)
    }
  }

  async function updateComment(payload: { scoreId: string, comment: string | null }) {
    if (!toValue(isSelfProfile)) return
    const currentIds = pinned.value.map((p) => p.score.id)
    if (!currentIds.includes(payload.scoreId)) return
    try {
      const { updateMyProfile } = await import('@/api/users')
      await updateMyProfile({ pinnedScores: buildPayload(currentIds, payload) })
      pinned.value = pinned.value.map((p) =>
        p.score.id === payload.scoreId ? { ...p, comment: payload.comment } : p,
      )
    } catch {
    }
  }

  function reset() {
    pinned.value = []
    pending.value = new Set()
  }

  return { pinned, loading, pending, pinnedIds, canPinMore, fetch, toggle, updateComment, reset }
}

export function usePinnedMilestones({ userId, isSelfProfile, slotLimit }: PinContext) {
  const pinned = ref<UserMilestoneProgressResponse[]>([])
  const loading = ref(false)
  const pinnedIds = ref<Set<string>>(new Set())
  const pending = ref<Set<string>>(new Set())

  const canPinMore = computed(() => pinnedIds.value.size < toValue(slotLimit))

  async function fetch() {
    const id = toValue(userId)
    loading.value = true
    let next: UserMilestoneProgressResponse[] = []
    try {
      const { getUserPinnedMilestones } = await import('@/api/users')
      next = await getUserPinnedMilestones(id)
    } catch {
      next = []
    }
    if (id !== toValue(userId)) return
    pinned.value = next
    pinnedIds.value = new Set(next.map((p) => p.milestoneId))
    loading.value = false
  }

  async function toggle(milestoneId: string) {
    if (!toValue(isSelfProfile) || pending.value.has(milestoneId)) return
    const currentIds = [...pinnedIds.value]
    const isPinned = currentIds.includes(milestoneId)
    const nextIds = isPinned ? currentIds.filter((id) => id !== milestoneId) : [...currentIds, milestoneId]
    if (nextIds.length > toValue(slotLimit)) return

    pinnedIds.value = new Set(nextIds)
    pending.value = withPending(pending.value, milestoneId, true)
    try {
      const { updateMyProfile } = await import('@/api/users')
      await updateMyProfile({
        pinnedMilestones: nextIds.map((id, displayOrder) => ({ milestoneId: id, displayOrder })),
      })
      if (isPinned) pinned.value = pinned.value.filter((p) => p.milestoneId !== milestoneId)
      else await fetch()
    } catch {
      pinnedIds.value = new Set(currentIds)
    } finally {
      pending.value = withPending(pending.value, milestoneId, false)
    }
  }

  function reset() {
    pinned.value = []
    pinnedIds.value = new Set()
    pending.value = new Set()
  }

  return { pinned, loading, pending, pinnedIds, canPinMore, fetch, toggle, reset }
}
