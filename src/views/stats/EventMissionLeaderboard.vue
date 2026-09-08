<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import type { EventMissionLeaderboardResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import LeaderboardPlayerCell from './LeaderboardPlayerCell.vue'
import { NO_VALUE, fmtInt } from './statsFormat'

const props = defineProps<{
  eventKey: string
  templateId: string
  missionName: string
  country: string
}>()

const emit = defineEmits<{ close: [] }>()

const COLUMNS: TableColumn[] = [
  { key: 'rank', label: '#', align: 'right', mono: true, width: '60px' },
  { key: 'player', label: 'Player', align: 'left' },
  { key: 'completions', label: 'Completions', align: 'right', mono: true, width: '140px' },
  { key: 'xpEarned', label: 'XP', align: 'right', mono: true, width: '100px' },
  { key: 'itemsAwarded', label: 'Items', align: 'right', mono: true, width: '90px' },
  { key: 'lastCompletedAt', label: 'Last done', align: 'right', width: '130px' },
]

const page = ref(1)
const loading = ref(false)
const pageData = ref<Page<EventMissionLeaderboardResponse> | null>(null)

const totalPages = computed(() => pageData.value?.totalPages ?? 0)

const rows = computed<Record<string, unknown>[]>(() =>
  (pageData.value?.content ?? []).map((item) => ({
    ...item,
    avatarUrl: pickAvatarUrl(item),
    avatarFallbackUrl: pickAvatarFallback(item),
  })))

function formatDate(value: unknown): string {
  if (!value) return NO_VALUE
  return new Date(String(value)).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

let requestId = 0

async function fetchLeaderboard() {
  const id = ++requestId
  loading.value = true
  try {
    const { getEventMissionLeaderboard } = await import('@/api/statistics')
    const result = await getEventMissionLeaderboard(
      props.eventKey,
      { page: page.value - 1, size: 20 },
      props.templateId,
      props.country || undefined,
    )
    if (id !== requestId) return
    pageData.value = result
  } catch (error) {
    if (id !== requestId) return
    console.error('Failed to fetch event mission leaderboard:', error)
    pageData.value = null
  }
  loading.value = false
}

watch(() => [props.eventKey, props.templateId, props.country] as const, () => {
  page.value = 1
  fetchLeaderboard()
}, { immediate: true })

watch(page, () => fetchLeaderboard())
</script>

<template>
  <section class="mission-lb">
    <header class="mission-lb__head">
      <h4 class="mission-lb__title">{{ missionName || 'Mission' }}</h4>
      <button type="button" class="mission-lb__close" aria-label="Close mission leaderboard" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="5" row-key="rank"
      empty-message="Nobody has completed this mission yet.">
      <template #cell-rank="{ value }"><span class="mission-lb__rank">#{{ fmtInt(value) }}</span></template>
      <template #cell-player="{ row }">
        <LeaderboardPlayerCell :user-id="(row.userId as string)" :user-name="(row.userName as string)"
          :avatar-url="(row.avatarUrl as string)"
          :avatar-fallback-url="(row.avatarFallbackUrl as string | null)" :country="(row.country as string)" />
      </template>
      <template #cell-completions="{ value }"><span class="mission-lb__strong">{{ fmtInt(value) }}</span></template>
      <template #cell-xpEarned="{ value }">{{ fmtInt(value) }}</template>
      <template #cell-itemsAwarded="{ value }">{{ fmtInt(value) }}</template>
      <template #cell-lastCompletedAt="{ value }">
        <span class="mission-lb__dim">{{ formatDate(value) }}</span>
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />
  </section>
</template>

<style scoped>
.mission-lb {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.mission-lb__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.mission-lb__title {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.mission-lb__close {
  flex-shrink: 0;
  display: inline-flex;
  padding: 2px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.mission-lb__close:hover {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
}

.mission-lb__rank {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.mission-lb__strong {
  color: var(--page-accent);
  font-weight: 600;
}

.mission-lb__dim {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
}
</style>
