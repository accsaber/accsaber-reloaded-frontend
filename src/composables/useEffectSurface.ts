import { useThemeStore } from '@/stores/theme'
import { isFieldKey, type EffectMeasure } from '@/utils/cosmetics/effects'
import { computed } from 'vue'

export function useEffectSurface(measure: () => EffectMeasure) {
  const themeStore = useThemeStore()
  const isTitle = computed(() => measure().typeKey === 'title')
  const field = computed(() => isFieldKey(measure().typeKey))
  const light = computed(() => (measure().host?.base ?? themeStore.resolvedBase) === 'light')
  return { isTitle, field, light }
}
