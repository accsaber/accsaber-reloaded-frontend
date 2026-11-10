import { usePreviewStore } from '@/stores/preview'
import { useThemeStore } from '@/stores/theme'
import type { ItemResponse } from '@/types/api/items'
import { buildEffectLayers } from '@/utils/cosmetics/effectLayers'
import { itemVariantPreviews } from '@/utils/items'
import { readThemeValue } from '@/utils/cosmetics/readers'
import { isCreativesSubdomain } from '@/utils/subdomain'
import { watch } from 'vue'

function resolveThemeTokens(item: ItemResponse, variantKey: string | null): Record<string, string> | null {
  if (variantKey) {
    const match = itemVariantPreviews(item)?.find((p) => p.key === variantKey)
    if (match) return readThemeValue(match.item.value)?.tokens ?? null
  }
  return readThemeValue(item.value)?.tokens ?? null
}

export function usePreviewTheme() {
  const preview = usePreviewStore()
  const themeStore = useThemeStore()

  watch(
    () => [preview.theme, preview.themeVariant, preview.themeEffect, preview.themeModifiers] as const,
    ([themeItem, variantKey, effect, modifiers]) => {
      if (!isCreativesSubdomain) return
      const tokens = themeItem ? resolveThemeTokens(themeItem, variantKey) : null
      const effects = buildEffectLayers(modifiers, effect)
      if (tokens || effects.length) themeStore.previewThemeTokens(tokens, effects)
      else themeStore.stopPreview()
    },
    { immediate: true },
  )
}
