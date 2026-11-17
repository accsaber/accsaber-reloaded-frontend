<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseModal from '@/components/common/BaseModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { MissionContributorResponse, MissionResponse } from '@/types/api/missions'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { missionUnitLabel } from '@/utils/missions'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mission: MissionResponse
  loadPage: (missionId: string, params: PaginationParams) => Promise<Page<MissionContributorResponse>>
}>()

const emit = defineEmits<{
  close: []
  navigate: []
}>()

const PAGE_SIZE = 10

const pageData = ref<Page<MissionContributorResponse> | null>(null)
const page = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)

const paid = computed(() => props.mission.status === 'completed')
const totalPages = computed(() => pageData.value?.totalPages ?? Math.ceil((props.mission.contributors ?? 0) / PAGE_SIZE))

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '72px' },
  { key: 'player', label: 'Player', align: 'left', primary: true },
  ...(paid.value ? [{ key: 'status', label: 'Reward', align: 'left', width: '120px' } as TableColumn] : []),
  { key: 'amount', label: 'Contributed', align: 'right', mono: true, width: '160px' },
])

const rows = computed(() =>
  (pageData.value?.content ?? []).map((row) => ({
    id: row.player.id,
    rank: row.rank,
    player: row.player,
    status: row.rewardedAt != null ? 'Rewarded' : 'Pending',
    amount: missionUnitLabel(props.mission.type, row.contribution),
  })),
)

let request = 0

async function load(missionId: string, target: number) {
  const current = ++request
  loading.value = true
  error.value = null
  try {
    const next = await props.loadPage(missionId, { page: target - 1, size: PAGE_SIZE })
    if (current === request) pageData.value = next
  } catch (err) {
    if (current !== request) return
    pageData.value = null
    error.value = parseApiError(err, 'Could not load contributors').message
  } finally {
    if (current === request) loading.value = false
  }
}

watch(
  () => [props.mission.id, page.value] as const,
  ([id, target]) => load(id, target),
  { immediate: true },
)
</script>

<template>
  <BaseModal open :title="mission.name" max-width="620px" @close="emit('close')">
    <p v-if="error" class="caption contrib__error" role="alert">{{ error }}</p>
    <DataTable
      v-else
      class="contrib__table"
      :columns="columns"
      :rows="rows"
      :loading="loading && !pageData"
      :refreshing="loading && !!pageData"
      :loading-rows="PAGE_SIZE"
      row-key="id"
      empty-message="Nobody has contributed yet"
    >
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>
      <template #cell-player="{ value }">
        <UserChip :user="(value as UserRefDisplay)" link @click="emit('navigate')" />
      </template>
      <template #mobile-card="{ row }">
        <span class="contrib__card">
          <span class="rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" link @click="emit('navigate')" />
          <span class="contrib__amount">{{ row.amount }}</span>
          <span v-if="paid" class="caption contrib__status">{{ row.status }}</span>
        </span>
      </template>
    </DataTable>

    <template v-if="totalPages > 1" #footer>
      <PaginationControls :page="page" :total-pages="totalPages" @update:page="page = $event" />
    </template>
  </BaseModal>
</template>

<style scoped>
.contrib__error {
  color: var(--error);
}

.contrib__error,
.contrib__table {
  min-height: calc(34px + 10 * 48px);
}

.contrib__card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  padding: var(--space-sm) var(--space-md);
}

.contrib__amount {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.contrib__status {
  grid-column: 2 / -1;
}
</style>
