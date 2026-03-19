import { useCategoryStore } from '@/stores/categories'
import type { CategoryCode } from '@/types/display'
import { computed, inject, provide, type Ref } from 'vue'

const CATEGORY_KEY = Symbol('categoryContext')

interface CategoryContext {
  accent: Ref<string>
  categoryCode: Ref<CategoryCode>
}

export function provideCategoryContext(code: Ref<CategoryCode> | CategoryCode) {
  const store = useCategoryStore()
  const codeRef = computed(() => (typeof code === 'string' ? code : code.value))

  const accent = computed(() => store.getAccent(codeRef.value))

  const context: CategoryContext = {
    accent,
    categoryCode: codeRef,
  }

  provide(CATEGORY_KEY, context)

  return context
}

export function useCategoryContext(): CategoryContext {
  const context = inject<CategoryContext>(CATEGORY_KEY)

  if (context) return context

  const store = useCategoryStore()
  return {
    accent: computed(() => store.getAccent('overall')),
    categoryCode: computed(() => 'overall'),
  }
}
