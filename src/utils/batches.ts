import type { PublicBatchResponse } from '@/types/api/batches'
import type { CategoryCode, MapDisplay } from '@/types/display'
import { CATEGORY_ORDER } from './constants'
import { toMapDisplay } from './mappers'

export interface BatchCategoryGroup {
  categoryCode: CategoryCode
  accent: string
  name: string
  diffs: MapDisplay[]
}

export function groupBatchByCategory(
  batch: PublicBatchResponse,
  getCategoryCode: (id: string) => CategoryCode | undefined,
  getAccent: (code: CategoryCode) => string,
  getCategoryName: (code: CategoryCode) => string,
): BatchCategoryGroup[] {
  const grouped = new Map<CategoryCode, MapDisplay[]>()
  for (const diff of batch.difficulties) {
    const display = toMapDisplay(diff, getCategoryCode)
    const code = display.categoryCode
    if (!grouped.has(code)) grouped.set(code, [])
    grouped.get(code)!.push(display)
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      const ai = (CATEGORY_ORDER as readonly string[]).indexOf(a)
      const bi = (CATEGORY_ORDER as readonly string[]).indexOf(b)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    .map(([code, diffs]) => ({
      categoryCode: code,
      accent: getAccent(code),
      name: getCategoryName(code),
      diffs,
    }))
}
