import type { TableColumn } from '@/types/display'

const FLEX_COLUMN_WIDTH = 120

export function tableNaturalWidth(columns: TableColumn[]): number {
  return columns.reduce(
    (sum, col) => sum + (Number.parseInt(col.width ?? '', 10) || FLEX_COLUMN_WIDTH),
    0,
  )
}
