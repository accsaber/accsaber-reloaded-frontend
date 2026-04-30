import {
  createRelation as apiCreate,
  deleteRelation as apiDelete,
  getMyRelations,
} from '@/api/relations'
import { ApiError } from '@/api/client'
import type { UserRelationResponse, UserRelationType } from '@/types/api/relations'
import { useAuthStore } from '@/stores/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export class RelationBlockedError extends Error {
  constructor() {
    super('You cannot follow or rival this user.')
    this.name = 'RelationBlockedError'
  }
}

export const useRelationsStore = defineStore('relations', () => {
  const relations = ref<UserRelationResponse[]>([])
  const loaded = ref(false)
  let inFlight: Promise<void> | null = null

  const byTarget = computed(() => {
    const map = new Map<string, Map<UserRelationType, UserRelationResponse>>()
    for (const r of relations.value) {
      let inner = map.get(r.targetUserId)
      if (!inner) {
        inner = new Map()
        map.set(r.targetUserId, inner)
      }
      inner.set(r.type, r)
    }
    return map
  })

  function getRelation(
    targetUserId: string,
    type: UserRelationType,
  ): UserRelationResponse | undefined {
    return byTarget.value.get(targetUserId)?.get(type)
  }

  function hasRelation(targetUserId: string, type: UserRelationType): boolean {
    return getRelation(targetUserId, type) !== undefined
  }

  async function fetchAll(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      relations.value = []
      loaded.value = false
      return
    }

    if (inFlight) return inFlight

    inFlight = (async () => {
      try {
        const collected: UserRelationResponse[] = []
        let page = 0
        while (true) {
          const res = await getMyRelations({ page, size: 100 })
          collected.push(...res.content)
          if (res.last || res.empty) break
          page += 1
        }
        relations.value = collected
        loaded.value = true
      } catch {
        relations.value = []
        loaded.value = false
      } finally {
        inFlight = null
      }
    })()

    return inFlight
  }

  function upsert(relation: UserRelationResponse) {
    const idx = relations.value.findIndex(
      (r) => r.targetUserId === relation.targetUserId && r.type === relation.type,
    )
    if (idx >= 0) relations.value[idx] = relation
    else relations.value.push(relation)
  }

  function removeLocal(predicate: (r: UserRelationResponse) => boolean) {
    relations.value = relations.value.filter((r) => !predicate(r))
  }

  async function add(targetUserId: string, type: UserRelationType): Promise<UserRelationResponse> {
    try {
      const res = await apiCreate({ targetUserId, type })
      if (type === 'blocked') {
        removeLocal((r) => r.targetUserId === targetUserId && r.type !== 'blocked')
      }
      upsert(res)
      return res
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) throw new RelationBlockedError()
        if (err.status === 409) {
          await fetchAll()
          const existing = getRelation(targetUserId, type)
          if (existing) return existing
        }
      }
      throw err
    }
  }

  async function remove(targetUserId: string, type: UserRelationType): Promise<void> {
    const existing = getRelation(targetUserId, type)
    if (!existing) return
    await apiDelete(existing.id)
    removeLocal((r) => r.id === existing.id)
  }

  async function toggle(targetUserId: string, type: UserRelationType): Promise<void> {
    if (hasRelation(targetUserId, type)) {
      await remove(targetUserId, type)
      return
    }
    await add(targetUserId, type)
  }

  function reset() {
    relations.value = []
    loaded.value = false
  }

  return {
    relations,
    loaded,
    byTarget,
    getRelation,
    hasRelation,
    fetchAll,
    add,
    remove,
    toggle,
    reset,
  }
})
