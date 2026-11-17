<script setup lang="ts">
import { parseApiError } from '@/api/client'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanStandingResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import { formatSignedStanding, formatStanding } from '@/utils/clans'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'

const props = defineProps<{ seasonId: string }>()

const PAGE_SIZE = 20
const COLUMNS: TableColumn[] = [
  { key: 'rank', label: 'Rank', width: '80px' },
  { key: 'clan', label: 'Clan', primary: true },
  { key: 'standing', label: 'Standing', align: 'right', mono: true, width: '130px', format: (v) => formatStanding(v as number) },
  { key: 'baseStanding', label: 'Base', align: 'right', mono: true, width: '130px', format: (v) => formatStanding(v as number) },
  { key: 'earned', label: 'Earned', align: 'right', mono: true, width: '130px', format: (v) => formatSignedStanding(v as number) },
]

const standings = ref<ClanStandingResponse[]>([])
const page = ref(1)
const totalPages = ref(0)
const loading = ref(true)
const error = ref('')

const rows = computed<Record<string, unknown>[]>(() => standings.value.map((row) => ({ ...row, id: row.clan.id })))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { getClanSeasonStandings } = await import('@/api/clans')
    const res = await getClanSeasonStandings(props.seasonId, { page: page.value - 1, size: PAGE_SIZE })
    standings.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the standings').message
  } finally {
    loading.value = false
  }
}

watch(page, load, { immediate: true })
</script>

<template>
  <div class="standings">
    <p v-if="error" class="caption standings__error" role="alert">{{ error }}</p>
    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !standings.length" :refreshing="loading && standings.length > 0"
      :loading-rows="4" row-key="id" empty-message="No clans ranked yet">
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>
      <template #cell-clan="{ row }">
        <span class="standings__clan">
          <ClanTag :clan="(row.clan as ClanStandingResponse['clan'])" size="sm" />
          {{ (row.clan as ClanStandingResponse['clan']).name }}
        </span>
      </template>
    </DataTable>
    <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
  </div>
</template>

<style scoped>
.standings {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.standings__error {
  color: var(--error);
}

.standings__clan {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
