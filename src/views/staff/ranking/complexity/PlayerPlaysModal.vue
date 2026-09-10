<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { useCategoryStore } from '@/stores/categories'
import type {
  ComparisonScenario,
  ComplexityPlayerCategory,
  ComplexityPlayerPlays,
  ComplexityScenario,
} from '@/types/api/complexity'
import type { CategoryCode } from '@/types/display'
import { AP_DECIMALS, SCENARIO_LABELS } from '@/utils/complexity'
import { CATEGORY_ORDER } from '@/utils/constants'
import PlayerPlaysTable from './PlayerPlaysTable.vue'
import ScenarioCell from './ScenarioCell.vue'
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  player: ComplexityPlayerPlays | null
  scenario: ComparisonScenario
  columns: readonly ComplexityScenario[]
  limit: number
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  'update:limit': [limit: number]
}>()

const categoryStore = useCategoryStore()

const orderedCategories = computed<ComplexityPlayerCategory[]>(() => {
  const order = CATEGORY_ORDER as readonly string[]
  return [...(props.player?.categories ?? [])].sort(
    (a, b) => order.indexOf(a.categoryCode) - order.indexOf(b.categoryCode),
  )
})

const avatarUrl = computed(() => pickAvatarUrl(props.player))
const avatarFallback = computed(() => pickAvatarFallback(props.player))

function totals(category: ComplexityPlayerCategory) {
  return props.columns.map((scenario) => ({
    key: scenario,
    label: SCENARIO_LABELS[scenario],
    ap: category.scenarios[scenario]?.ap ?? null,
    rank: category.scenarios[scenario]?.rank ?? null,
    apDelta: scenario === 'CURRENT' ? null : category.deltas[scenario]?.ap ?? null,
    rankDelta: scenario === 'CURRENT' ? null : category.deltas[scenario]?.rank ?? null,
  }))
}

function accentFor(code: string): string {
  return categoryStore.getAccent(code)
}
</script>

<template>
  <BaseModal :open="open" :title="player?.name ?? 'Player plays'" max-width="1240px"
    @close="emit('close')">
    <div class="plays-modal">
      <header class="plays-modal__head">
        <GlowImage v-if="player" :src="avatarUrl" :alt="player.name" :size="44"
          :fallback-src="avatarFallback" />
        <div v-if="player" class="plays-modal__identity">
          <span class="plays-modal__name">
            {{ player.name }}
            <CountryFlag :country="player.country" />
          </span>
          <span class="plays-modal__meta">
            Best plays under {{ SCENARIO_LABELS[scenario].toLowerCase() }} next to today
          </span>
        </div>
        <BaseInput class="plays-modal__limit" label="Plays per category" type="number" min="1"
          max="50" step="1" :model-value="limit"
          @update:model-value="emit('update:limit', Number($event))" />
      </header>

      <p v-if="error" class="plays-modal__error">{{ error }}</p>

      <template v-if="loading">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </template>

      <p v-else-if="player && orderedCategories.length === 0" class="plays-modal__empty">
        This player has no ranked plays.
      </p>

      <section v-for="category in orderedCategories" :key="category.categoryId"
        class="plays-modal__category" :style="{ '--page-accent': accentFor(category.categoryCode) }">
        <header class="plays-modal__category-head">
          <CategoryBadge :category="(category.categoryCode as CategoryCode)" />
          <div class="plays-modal__totals">
            <div v-for="total in totals(category)" :key="total.key" class="plays-modal__total">
              <span class="plays-modal__total-label">{{ total.label }}</span>
              <ScenarioCell :value="total.ap" :delta="total.apDelta" :decimals="AP_DECIMALS"
                :emphasis="total.key === 'CURRENT' || total.key === scenario" />
              <span class="plays-modal__total-rank">
                <span>{{ total.rank != null ? `#${total.rank}` : '–' }}</span>
                <ScenarioCell delta-only invert :value="total.rankDelta" :delta="total.rankDelta"
                  :decimals="0" />
              </span>
            </div>
          </div>
        </header>

        <PlayerPlaysTable :plays="category.plays" :scenario="scenario" :columns="columns" />
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.plays-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.plays-modal__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.plays-modal__identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  min-width: 160px;
}

.plays-modal__name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-card-title);
  font-weight: 600;
}

.plays-modal__meta {
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.plays-modal__limit {
  max-width: 150px;
}

.plays-modal__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-body);
}

.plays-modal__empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.plays-modal__category {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.plays-modal__category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.plays-modal__totals {
  display: flex;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.plays-modal__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.plays-modal__total-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.plays-modal__total-rank {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
