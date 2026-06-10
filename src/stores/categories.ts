import { getCategories } from '@/api/categories'
import { useThemeStore } from '@/stores/theme'
import type { CategoryResponse } from '@/types/api/categories'
import type { CategoryCode, CategoryInfo } from '@/types/display'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const CATEGORY_COLORS: Record<string, { accent: string; tint: string; tintLight: string }> = {
  true_acc: { accent: '#22c55e', tint: '#0f3d1e', tintLight: '#d4f5e0' },
  standard_acc: { accent: '#3b82f6', tint: '#162650', tintLight: '#d4e4fd' },
  tech_acc: { accent: '#ef4444', tint: '#3d1414', tintLight: '#fdd4d4' },
  low_mid: { accent: '#eab308', tint: '#3d3508', tintLight: '#faf0c8' },
  overall: { accent: '#a855f7', tint: '#2d1650', tintLight: '#ead4fd' },
  xp: { accent: '#06b6d4', tint: '#0e3640', tintLight: '#ccf2f8' },
}

const DEFAULT_COLOR = { accent: '#a855f7', tint: '#2d1650', tintLight: '#ead4fd' }

function readCssAccent(code: string): string {
  const fallback = CATEGORY_COLORS[code]?.accent ?? DEFAULT_COLOR.accent
  if (typeof document === 'undefined') return fallback
  const cssVar = '--accent-' + code.replace(/_/g, '-')
  const val = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return val || fallback
}

const STORAGE_KEY = 'cache:categories'

function loadCachedCategories(): CategoryResponse[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as CategoryResponse[] : []
  } catch {
    return []
  }
}

export const useCategoryStore = defineStore('categories', () => {
  const themeStore = useThemeStore()
  const cached = loadCachedCategories()
  const categories = ref<CategoryResponse[]>(cached)
  const loaded = ref(cached.length > 0)

  const byId = computed(() => {
    const map = new Map<string, CategoryResponse>()
    for (const cat of categories.value) {
      map.set(cat.id, cat)
    }
    return map
  })

  const byCode = computed(() => {
    const map = new Map<string, CategoryResponse>()
    for (const cat of categories.value) {
      map.set(cat.code, cat)
    }
    return map
  })

  const categoryInfoList = computed<CategoryInfo[]>(() => {
    void themeStore.theme
    void themeStore.activeTokens
    const list = categories.value.map((cat) => {
      const fallback = CATEGORY_COLORS[cat.code] ?? DEFAULT_COLOR
      return {
        code: cat.code,
        name: cat.name,
        accent: readCssAccent(cat.code),
        tint: fallback.tint,
        tintLight: fallback.tintLight,
      }
    })
    const xpFallback = CATEGORY_COLORS.xp
    return [
      ...list,
      {
        code: 'xp',
        name: 'XP',
        accent: readCssAccent('xp'),
        tint: xpFallback.tint,
        tintLight: xpFallback.tintLight,
      },
    ]
  })

  const categoryInfoByCode = computed(() => {
    const map = new Map<string, CategoryInfo>()
    for (const info of categoryInfoList.value) {
      map.set(info.code, info)
    }
    return map
  })

  function getCategoryId(code: CategoryCode): string | undefined {
    return byCode.value.get(code)?.id
  }

  function getCategoryCode(id: string): CategoryCode | undefined {
    return byId.value.get(id)?.code
  }

  function getCategoryInfo(code: string): CategoryInfo | undefined {
    return categoryInfoByCode.value.get(code)
  }

  function getAccent(code: string): string {
    return readCssAccent(code)
  }

  async function fetchCategories(force = false): Promise<void> {
    if (loaded.value && !force) return
    try {
      const result = await getCategories()
      categories.value = result
      loaded.value = true
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      } catch {
      }
    } catch {
    }
  }

  return {
    categories,
    loaded,
    byId,
    byCode,
    categoryInfoList,
    categoryInfoByCode,
    getCategoryId,
    getCategoryCode,
    getCategoryInfo,
    getAccent,
    fetchCategories,
  }
})
