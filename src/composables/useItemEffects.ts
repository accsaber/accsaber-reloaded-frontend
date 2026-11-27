import { useModifierColor } from '@/composables/useModifierColor'
import type { ItemModifierRef, UserItemResponse } from '@/types/api/items'
import { buildEffectLayers, readFragmentSpec } from '@/utils/cosmetics/effectLayers'
import { isBorderTypeKey, sortModifiersByKey, userItemTokenContext, type TokenContext } from '@/utils/items'
import { computed } from 'vue'

export function useItemEffects(
  userItem: () => UserItemResponse | null | undefined,
  typeKey: () => string | null | undefined = () => userItem()?.item.typeKey,
) {
  const modifiers = computed<ItemModifierRef[]>(() => sortModifiersByKey(userItem()?.modifiers ?? []))
  const effectLayers = computed(() => buildEffectLayers(userItem()?.modifiers, userItem()?.unusualEffect, userItem()?.serialNumber))
  const ownFx = computed(() => isBorderTypeKey(typeKey()))
  const fragmentSpec = computed(() => (ownFx.value ? null : readFragmentSpec(userItem()?.unusualEffect)))
  const overlayLayers = computed(() => (ownFx.value ? [] : effectLayers.value))
  const tokenCtx = computed<TokenContext>(() => {
    const u = userItem()
    return u ? userItemTokenContext(u) : {}
  })
  const { accent } = useModifierColor(modifiers)

  return { modifiers, effectLayers, ownFx, fragmentSpec, overlayLayers, tokenCtx, accent }
}
