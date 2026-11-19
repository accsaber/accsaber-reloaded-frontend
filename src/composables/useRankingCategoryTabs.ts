import { useCategoryStore } from '@/stores/categories'
import type { Tab } from '@/types/display'
import { computed } from 'vue'

export function useRankingCategoryTabs() {
  const categoryStore = useCategoryStore()
  return computed<Tab[]>(() =>
    categoryStore.categories
      .filter((c) => c.code !== 'overall')
      .map((c) => ({ key: c.id, label: categoryStore.getShortName(c.code), accentColor: categoryStore.getAccent(c.code) })),
  )
}
