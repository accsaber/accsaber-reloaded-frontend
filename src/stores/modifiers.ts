import type { ModifierResponse } from '@/types/api/modifiers'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useModifierStore = defineStore('modifiers', () => {
  const modifiers = ref<ModifierResponse[]>([])
  const loaded = ref(false)

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

  async function fetchModifiers(): Promise<void> {
    try {
      const { getModifiers } = await import('@/api/modifiers')
      modifiers.value = await getModifiers()
      loaded.value = true
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
