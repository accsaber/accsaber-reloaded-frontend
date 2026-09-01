import type {
  EffectCrateGroup,
  EffectOption,
} from '@/components/domain/ItemEffectFilter.vue'
import type {
  ItemFilterModifierOption,
  ItemFilterTypeGroup,
  ItemFilterTypeOption,
} from '@/components/domain/ItemFilterPanel.vue'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { UnusualEffectGroupsResponse } from '@/types/api/items'
import { modifierAccentHex } from '@/utils/items'
import { computed, ref } from 'vue'

export interface ItemFilterOptionsConfig {
  hiddenModifierKeys?: string[]
  effects?: boolean
}

function childTypeLabel(name: string, parentName: string): string {
  const stripped = name.startsWith(parentName) ? name.slice(parentName.length).trim() : name
  const deprefixed = stripped.startsWith('Profile ') ? stripped.slice('Profile '.length) : stripped
  return deprefixed || name
}

export function useItemFilterOptions(config: ItemFilterOptionsConfig = {}) {
  const itemTypeStore = useItemTypeStore()
  const itemModifierStore = useItemModifierStore()

  const hiddenModifierKeys = new Set(config.hiddenModifierKeys ?? [])

  const typeGroups = computed<ItemFilterTypeGroup[]>(() => {
    const types = itemTypeStore.itemTypes.filter((t) => t.active)
    const standalone: ItemFilterTypeOption[] = []
    const groups: ItemFilterTypeGroup[] = []
    for (const root of types.filter((t) => t.parentTypeId == null)) {
      const children = types.filter((t) => t.parentTypeId === root.id)
      if (children.length === 0) {
        standalone.push({ key: root.key, label: root.name })
      } else {
        groups.push({
          label: root.name,
          options: children.map((c) => ({ key: c.key, label: childTypeLabel(c.name, root.name) })),
        })
      }
    }
    return [{ label: null, options: standalone }, ...groups].filter((g) => g.options.length > 0)
  })

  const modifierOptions = computed<ItemFilterModifierOption[]>(() =>
    itemModifierStore.modifiers
      .filter((m) => m.active && !hiddenModifierKeys.has(m.key))
      .map((m) => ({ key: m.key, label: m.name, colorHex: modifierAccentHex(m) })),
  )

  const effectGroupsData = ref<UnusualEffectGroupsResponse | null>(null)

  const effectGroups = computed<EffectCrateGroup[]>(() =>
    (effectGroupsData.value?.groups ?? [])
      .map((g) => ({
        crateId: g.crateId,
        crateName: g.crateName,
        crateIconUrl: g.crateIconUrl,
        effects: g.effects
          .filter((e) => e.active)
          .map((e) => ({ id: e.id, key: e.key, label: e.name })),
      }))
      .filter((g) => g.effects.length > 0),
  )

  const ungroupedEffects = computed<EffectOption[]>(() =>
    (effectGroupsData.value?.ungrouped ?? [])
      .filter((e) => e.active)
      .map((e) => ({ id: e.id, key: e.key, label: e.name })),
  )

  async function loadEffects() {
    try {
      const { getUnusualEffectGroups } = await import('@/api/items')
      effectGroupsData.value = await getUnusualEffectGroups()
    } catch {
      effectGroupsData.value = null
    }
  }

  itemTypeStore.fetchItemTypes()
  itemModifierStore.fetchModifiers()
  if (config.effects) loadEffects()

  return { typeGroups, modifierOptions, effectGroups, ungroupedEffects }
}
