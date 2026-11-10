import type { TableColumn } from '@/types/display'
import { clamp } from '@/utils/math'

const FLEX_COLUMN_WIDTH = 120
const HEADER_CHAR_WIDTH = 9
const HEADER_ICON_WIDTH = 14
const HEADER_PADDING = 32
const SORT_GLYPH_WIDTH = 14
const PAGE_GUTTER = 64

export function columnWidth(col: TableColumn): number {
  const header = col.icon ? HEADER_ICON_WIDTH : col.label.length * HEADER_CHAR_WIDTH
  const fit = header + HEADER_PADDING + (col.sortable ? SORT_GLYPH_WIDTH : 0)
  return Math.max(Number.parseInt(col.width ?? '', 10) || FLEX_COLUMN_WIDTH, fit)
}

export function tableNaturalWidth(columns: TableColumn[]): number {
  return columns.reduce((sum, col) => sum + columnWidth(col), 0)
}

export function tableCardQuery(columns: TableColumn[]): string {
  return `(max-width: ${clamp(tableNaturalWidth(columns) + PAGE_GUTTER, 767, 959)}px)`
}
