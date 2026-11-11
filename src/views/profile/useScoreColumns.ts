import { useAppearance } from '@/composables/useAppearance'
import type { ScoreRowField } from '@/types/api/settings'
import type { TableColumn } from '@/types/display'
import { buildScoreColumns, SCORE_FIELD_COLUMNS } from '@/utils/scoreRowFields'
import { computed } from 'vue'

const LEADING_COLUMNS: TableColumn[] = [
  { key: 'leaderboardRank', label: '#', sortable: true, align: 'right', mono: true, width: '80px' },
  { key: 'cover', label: '', width: '56px' },
  { key: 'mapName', label: 'Map', align: 'left', width: '240px', flex: true },
]

const FIELD_COLUMNS: Record<ScoreRowField, TableColumn> = {
  ...SCORE_FIELD_COLUMNS,
  difficulty: { key: 'difficulty', label: 'Diff', align: 'center', width: '76px' },
  ap: { key: 'ap', label: 'AP', sortable: true, align: 'right', mono: true, width: '118px' },
  complexity: { key: 'complexity', label: 'Complexity', sortable: true, align: 'center', mono: true, width: '112px' },
  category: { key: 'category', label: 'Category', align: 'center', width: '92px' },
}

export function useScoreColumns(isSelfProfile: () => boolean) {
  const { scoreRowFields } = useAppearance()
  return computed(() =>
    buildScoreColumns(scoreRowFields.value, {
      leading: LEADING_COLUMNS,
      trailing: [
        { key: 'actions', label: '', align: 'center', width: isSelfProfile() ? '112px' : '84px', noLink: true },
      ],
      fields: FIELD_COLUMNS,
    }),
  )
}
