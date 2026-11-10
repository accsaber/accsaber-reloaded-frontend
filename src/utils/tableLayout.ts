import type { TableColumn } from '@/types/display'
import { clamp } from '@/utils/math'

const FLEX_COLUMN_WIDTH = 120
const PAGE_GUTTER = 64

export function tableNaturalWidth(columns: TableColumn[]): number {
  return columns.reduce(
    (sum, col) => sum + (Number.parseInt(col.width ?? '', 10) || FLEX_COLUMN_WIDTH),
    0,
  )
}

export function tableCardQuery(columns: TableColumn[]): string {
  return `(max-width: ${clamp(tableNaturalWidth(columns) + PAGE_GUTTER, 767, 959)}px)`
}
