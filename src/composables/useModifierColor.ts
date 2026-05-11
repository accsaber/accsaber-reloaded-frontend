import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemModifierRef } from '@/types/api/items'
import { modifierAccentHex, primaryModifier } from '@/utils/items'
import { computed, type ComputedRef, type Ref } from 'vue'

export interface ModifierColorRefs {
  accent: ComputedRef<string | null>
  resolve: (modifier: ItemModifierRef) => string | null
}

export function useModifierColor(modifiers: Ref<ItemModifierRef[]> | ComputedRef<ItemModifierRef[]>): ModifierColorRefs {
  const store = useItemModifierStore()

  function resolve(modifier: ItemModifierRef): string | null {
    return modifierAccentHex(modifier, store.byKey.get(modifier.key)?.colorHex ?? null)
  }

  const accent = computed<string | null>(() => {
    const m = primaryModifier(modifiers.value)
    return m ? resolve(m) : null
  })

  return { accent, resolve }
}
