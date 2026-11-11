import { useAppearance } from '@/composables/useAppearance'
import type { ScoreRowField } from '@/types/api/settings'
import type { TableColumn } from '@/types/display'
import { buildScoreColumns, SCORE_FIELD_COLUMNS } from '@/utils/scoreRowFields'
import { computed } from 'vue'

const TRAILING_COLUMNS: TableColumn[] = [
  { key: 'detail', label: '', align: 'center', width: '84px', noLink: true },
]

const FIELD_COLUMNS: Partial<Record<ScoreRowField, TableColumn>> = {
  ...SCORE_FIELD_COLUMNS,
  ap: { key: 'ap', label: 'AP', sortable: true, align: 'right', mono: true, width: '84px' },
}

export function useMapScoreColumns(filtering: () => boolean) {
  const { scoreRowFields } = useAppearance()
  return computed(() =>
    buildScoreColumns(scoreRowFields.value, {
      leading: [
        { key: 'rank', label: '#', sortable: true, align: 'right', mono: true, width: filtering() ? '150px' : '80px' },
        { key: 'player', label: 'Player', align: 'left', width: '240px', flex: true },
        { key: 'score', label: 'Score', sortable: true, align: 'right', mono: true, width: '108px' },
      ],
      trailing: TRAILING_COLUMNS,
      fields: FIELD_COLUMNS,
    }),
  )
}
