import type { MilestoneSetResponse, SetGroupResponse } from '@/types/api/milestones'
import type { ResolvedSetGroup } from '@/types/milestones'
import { computed, ref, type Ref } from 'vue'

export function useSetGroups(sets: Ref<MilestoneSetResponse[]>) {
  const setGroups = ref<SetGroupResponse[]>([])

  const setById = computed(() => new Map(sets.value.map((s) => [s.id, s])))

  const resolvedGroups = computed<ResolvedSetGroup[]>(() =>
    setGroups.value
      .map((group) => ({
        group,
        sets: (group.links ?? [])
          .map((link) => setById.value.get(link.setId))
          .filter((s): s is MilestoneSetResponse => s !== undefined),
      }))
      .filter((g) => g.sets.length > 0),
  )

  const groupedSetIds = computed(
    () => new Set(setGroups.value.flatMap((g) => (g.links ?? []).map((link) => link.setId))),
  )

  const standaloneSets = computed(() => sets.value.filter((s) => !groupedSetIds.value.has(s.id)))

  async function fetchGroups() {
    try {
      const { getSetGroups } = await import('@/api/milestones')
      setGroups.value = await getSetGroups()
    } catch {
      setGroups.value = []
    }
  }

  return { resolvedGroups, standaloneSets, fetchGroups }
}
