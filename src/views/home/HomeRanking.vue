<script setup lang="ts">
import { getLeaderboard } from '@/api/leaderboards'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useCategoryStore } from '@/stores/categories'
import type { ScoreRelationType } from '@/types/api/relations'
import type { LeaderboardResponse } from '@/types/api/users'
import type { CategoryCode, TableColumn, UserRefDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatAccuracy } from '@/utils/formatters'
import { toPlayerDisplay } from '@/utils/mappers'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  relation?: ScoreRelationType
  category?: CategoryCode
}>(), {
  relation: undefined,
  category: 'overall',
})

const categoryStore = useCategoryStore()
const size = computed(() => (props.relation ? 6 : 8))

const loading = ref(false)
const pageData = ref<Page<LeaderboardResponse> | null>(null)
const page = ref(1)

const columns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '84px' },
  { key: 'player', label: 'Player', align: 'left', width: '130px', flex: true },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '104px' },
  { key: 'avgAccuracy', label: 'Avg acc', align: 'right', mono: true, width: '96px' },
]

const rows = computed<Record<string, unknown>[]>(
  () => pageData.value?.content.map((entry) => ({ ...toPlayerDisplay(entry) })) ?? [],
)

const emptyMessage = computed(() => {
  if (props.relation === 'follower') return 'No followed players ranked'
  if (props.relation === 'rival') return 'No rivals ranked'
  return 'No players ranked'
})

function playerRoute(row: Record<string, unknown>): RouteLocationRaw {
  return { name: 'player-profile', params: { userId: row.userId as string } }
}

let request = 0

async function fetchRanking() {
  const current = ++request
  await categoryStore.fetchCategories()
  const categoryId = categoryStore.getCategoryId(props.category)
  if (!categoryId || current !== request) return
  loading.value = true
  try {
    const next = await getLeaderboard(categoryId, {
      page: page.value - 1,
      size: size.value,
      sort: 'ranking,asc',
      relation: props.relation,
      inactiveUsers: props.relation ? true : undefined,
    })
    if (current === request) pageData.value = next
  } catch {
    if (current === request) pageData.value = null
  } finally {
    if (current === request) loading.value = false
  }
}

watch(() => [props.relation, props.category], () => {
  if (page.value === 1) void fetchRanking()
  else page.value = 1
})
watch(page, fetchRanking, { immediate: true })
</script>

<template>
  <section class="home-ranking" :class="{ 'home-ranking--paired': relation }">
    <div class="home-ranking__header">
      <h2 class="section-title">{{ relation ? 'Ranking' : 'Top players' }}</h2>
      <RouterLink :to="`/leaderboards/${category}`" class="home-ranking__more">Full leaderboard</RouterLink>
    </div>

    <DataTable
      :refreshing="loading && !!pageData"
      :columns="columns"
      :rows="rows"
      :loading="!pageData && loading"
      :loading-rows="size"
      row-key="userId"
      row-clickable
      :row-to="playerRoute"
      :empty-message="emptyMessage"
    >
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>

      <template #cell-player="{ row }">
        <UserChip :user="(row.player as UserRefDisplay)" size="sm" tooltip hide-clan />
      </template>

      <template #cell-ap="{ value }">
        <span class="home-ranking__ap">{{ (value as number).toFixed(2) }}</span>
      </template>

      <template #cell-avgAccuracy="{ value }">
        <template v-if="value != null">{{ formatAccuracy(value as number) }}</template>
        <template v-else>-</template>
      </template>

      <template #mobile-card="{ row }">
        <RouterLink :to="playerRoute(row)" class="home-ranking__card">
          <span class="rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
          <UserChip :user="(row.player as UserRefDisplay)" size="sm" hide-clan class="home-ranking__player" />
          <span class="home-ranking__ap">{{ (row.ap as number).toFixed(2) }}</span>
        </RouterLink>
      </template>
    </DataTable>

    <PaginationControls
      v-if="relation && (pageData?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="pageData!.totalPages"
      :sibling-count="1"
      @update:page="page = $event"
    />
  </section>
</template>

<style scoped>
.home-ranking {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.home-ranking__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  min-height: 32px;
}

.home-ranking__more {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.home-ranking__more:hover,
.home-ranking__more:focus-visible {
  color: var(--accent);
}

.home-ranking--paired :deep(.data-table__th) {
  height: 32px;
  padding-block: 0;
}

.home-ranking--paired :deep(.data-table__row) {
  height: 62px;
}

.home-ranking :deep(.data-table__th),
.home-ranking :deep(.data-table__td),
.home-ranking :deep(.data-table__cell-link) {
  padding-left: var(--space-sm);
  padding-right: var(--space-sm);
}

.home-ranking__player {
  flex: 1;
}

.home-ranking__ap {
  color: var(--page-accent, var(--accent));
  font-weight: 600;
}

.home-ranking__card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 48px;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  color: inherit;
  text-decoration: none;
}
</style>
