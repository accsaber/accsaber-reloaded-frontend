<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanLevelResponse, ClanLevelStepResponse, ClanResponse, ClanXpGrantResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_XP_SOURCE_LABEL, unlockLines } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const level = ref<ClanLevelResponse | null>(null)
const steps = ref<ClanLevelStepResponse[]>([])
const stepsLoading = ref(true)
const xpPage = ref<Page<ClanXpGrantResponse> | null>(null)
const xpLoading = ref(true)

const currentLevel = computed(() => level.value?.progress.level ?? props.clan.level.level)
const ladder = computed(() => [...steps.value].sort((a, b) => b.level - a.level))

const xpColumns: TableColumn[] = [
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'rawAmount', label: 'Raw', align: 'right', mono: true, width: '120px' },
  { key: 'rosterFactor', label: 'Roster factor', align: 'right', mono: true, width: '140px' },
  { key: 'amount', label: 'Banked', align: 'right', mono: true, width: '120px' },
  { key: 'createdAt', label: 'When', align: 'right', mono: true, width: '120px' },
]

const xpRows = computed(() =>
  (xpPage.value?.content ?? []).map((grant) => ({
    id: grant.id,
    source: CLAN_XP_SOURCE_LABEL[grant.source],
    rawAmount: Math.round(grant.rawAmount).toLocaleString(),
    rosterFactor: `÷ ${grant.rosterFactor.toFixed(2)}`,
    amount: Math.round(grant.amount).toLocaleString(),
    createdAt: formatRelativeDate(grant.createdAt),
  })),
)
const xpTotalPages = computed(() => xpPage.value?.totalPages ?? 0)

async function fetchLadder() {
  stepsLoading.value = true
  try {
    const { getClanLevel, getClanLevels } = await import('@/api/clans')
    const [current, table] = await Promise.all([getClanLevel(props.clan.clan.id), getClanLevels()])
    level.value = current
    steps.value = table
  } catch {
    level.value = null
    steps.value = []
  } finally {
    stepsLoading.value = false
  }
}

async function fetchXp() {
  xpLoading.value = true
  try {
    const { getClanXp } = await import('@/api/clans')
    xpPage.value = await getClanXp(props.clan.clan.id, { page: paginationParams.value.page, size: 25 })
  } catch {
    xpPage.value = null
  } finally {
    xpLoading.value = false
  }
}

fetchLadder()
watch(() => route.query.page, fetchXp, { immediate: true })
</script>

<template>
  <section class="level-tab">
    <div v-if="stepsLoading" class="level-tab__skeleton">
      <SkeletonLoader v-for="i in 6" :key="i" variant="table-row" />
    </div>

    <ol v-else class="ladder">
      <li
        v-for="step in ladder"
        :key="step.level"
        class="ladder__step"
        :class="{
          'ladder__step--current': step.level === currentLevel,
          'ladder__step--locked': step.level > currentLevel,
        }"
      >
        <span class="ladder__level">
          <span class="ladder__level-label">Lv</span>
          <span class="ladder__level-number">{{ step.level }}</span>
        </span>
        <span class="ladder__xp">{{ Math.round(step.totalXpRequired).toLocaleString() }} XP</span>
        <span class="ladder__unlocks">
          <span v-for="line in unlockLines(step.unlocks)" :key="line" class="ladder__unlock">{{ line }}</span>
          <span v-for="item in step.unlocks.cosmetics" :key="item.id" class="ladder__tile" :title="item.name">
            <ItemPreview :item="item" />
          </span>
          <span v-if="!unlockLines(step.unlocks).length && !step.unlocks.cosmetics.length" class="ladder__none">
            Nothing new
          </span>
        </span>
      </li>
    </ol>

    <div class="level-tab__xp">
      <h2 class="level-tab__heading">XP history</h2>
      <DataTable
        :columns="xpColumns"
        :rows="xpRows"
        :loading="xpLoading"
        :loading-rows="6"
        row-key="id"
        empty-message="No XP banked yet"
      />
      <PaginationControls v-if="xpTotalPages > 1" :page="currentPage" :total-pages="xpTotalPages" @update:page="setPage" />
    </div>
  </section>
</template>

<style scoped>
.level-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.level-tab__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ladder {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.ladder__step {
  display: grid;
  grid-template-columns: 96px 140px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.ladder__step:last-child {
  border-bottom: none;
}

.ladder__step:nth-child(even) {
  background: var(--bg-elevated);
}

.ladder__step--current {
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 10%, var(--bg-surface));
}

.ladder__step--locked {
  color: var(--text-tertiary);
}

.ladder__level {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-family: var(--font-mono);
}

.ladder__level-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.ladder__level-number {
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.ladder__step--current .ladder__level-number {
  color: var(--page-accent, var(--accent));
}

.ladder__step--locked .ladder__level-number {
  color: var(--text-tertiary);
}

.ladder__xp {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.ladder__unlocks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  min-width: 0;
}

.ladder__unlock {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.ladder__step--locked .ladder__unlock {
  color: var(--text-tertiary);
}

.ladder__tile {
  display: inline-flex;
  width: 48px;
  height: 48px;
  padding: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.ladder__none {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.level-tab__xp {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.level-tab__heading {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .ladder__step {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .ladder__xp {
    grid-column: 2;
    font-size: var(--text-caption);
  }

  .ladder__unlocks {
    grid-column: 1 / -1;
  }
}
</style>
