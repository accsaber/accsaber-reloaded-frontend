import { useAppearance } from '@/composables/useAppearance'
import type { ScoreRowField } from '@/types/api/settings'
import type { TableColumn } from '@/types/display'
import { buildScoreColumns } from '@/utils/scoreRowFields'
import { computed } from 'vue'

const LEADING_COLUMNS: TableColumn[] = [
  { key: 'leaderboardRank', label: '#', sortable: true, align: 'right', mono: true, width: '80px' },
  { key: 'cover', label: '', width: '56px' },
  { key: 'mapName', label: 'Map', align: 'left', width: '240px', flex: true },
]

const FIELD_COLUMNS: Record<ScoreRowField, TableColumn> = {
  difficulty: { key: 'difficulty', label: 'Diff', align: 'center', width: '76px' },
  accuracy: { key: 'accuracy', label: 'Acc', sortable: true, align: 'right', mono: true, width: '76px' },
  ap: { key: 'ap', label: 'AP', sortable: true, align: 'right', mono: true, width: '100px' },
  weighted_ap: { key: 'weighted', label: 'Weighted', sortable: true, align: 'right', mono: true, width: '100px' },
  complexity: { key: 'complexity', label: 'Complexity', sortable: true, align: 'center', mono: true, width: '112px' },
  category: { key: 'category', label: 'Category', align: 'center', width: '92px' },
  streak_115: { key: 'streak115', label: '115s', sortable: true, align: 'right', mono: true, width: '64px' },
  max_streak_115: { key: 'maxStreak115', label: 'Max', sortable: true, align: 'right', mono: true, width: '64px' },
  pauses: { key: 'pauses', label: 'Pauses', sortable: true, align: 'right', mono: true, width: '84px' },
  play_count: { key: 'playCount', label: 'Plays', sortable: true, align: 'right', mono: true, width: '76px' },
  last_played_at: { key: 'lastPlayedAt', label: 'Played', sortable: true, align: 'right', width: '84px' },
  date: { key: 'date', label: 'Date', sortable: true, align: 'right', width: '84px' },
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
