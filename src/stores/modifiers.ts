import { getModifiers } from '@/api/modifiers'
import type { ModifierResponse } from '@/types/api/modifiers'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'cache:modifiers'

function loadCachedModifiers(): ModifierResponse[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as ModifierResponse[] : []
  } catch {
    return []
  }
}

export const useModifierStore = defineStore('modifiers', () => {
  const cached = loadCachedModifiers()
  const modifiers = ref<ModifierResponse[]>(cached)
  const loaded = ref(cached.length > 0)

  const byId = computed(() => {
    const map = new Map<string, ModifierResponse>()
    for (const mod of modifiers.value) {
      map.set(mod.id, mod)
    }
    return map
  })

  function resolveModifierNames(ids: string[]): string[] {
    return ids
      .map((id) => byId.value.get(id)?.name)
      .filter((name): name is string => name !== undefined)
  }

  function resolveModifierCodes(ids: string[]): string[] {
    return ids
      .map((id) => byId.value.get(id)?.code)
      .filter((code): code is string => code !== undefined)
  }

  async function fetchModifiers(force = false): Promise<void> {
    if (loaded.value && !force) return
    try {
      const result = await getModifiers()
      modifiers.value = result
      loaded.value = true
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      } catch {
      }
    } catch {
    }
  }

  return {
    modifiers,
    loaded,
    byId,
    resolveModifierNames,
    resolveModifierCodes,
    fetchModifiers,
  }
})
