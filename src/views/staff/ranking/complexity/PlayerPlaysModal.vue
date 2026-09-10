<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import HintTooltip from './HintTooltip.vue'
import { pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
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
import { computed, ref, watch } from 'vue'

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

const LIMIT_HINT = 'How many of the best plays each scenario contributes. The table lists the union of those, so it can hold more rows than this.'

const category = ref<CategoryCode>('overall')

const ordered = computed<ComplexityPlayerCategory[]>(() => {
  const order = CATEGORY_ORDER as readonly string[]
  return [...(props.player?.categories ?? [])].sort(
    (a, b) => order.indexOf(a.categoryCode) - order.indexOf(b.categoryCode),
  )
})

const excluded = computed<CategoryCode[]>(() => {
  const played = ordered.value.map((entry) => entry.categoryCode)
  const skip: CategoryCode[] = ['xp', 'low_mid']
  for (const code of CATEGORY_ORDER as readonly string[]) {
    if (code !== 'overall' && !played.includes(code)) skip.push(code)
  }
  return skip
})

watch(() => props.player?.userId, () => {
  category.value = 'overall'
})

const active = computed(() => ordered.value.find((entry) => entry.categoryCode === category.value))

const plays = computed(() =>
  active.value ? active.value.plays : ordered.value.flatMap((entry) => entry.plays),
)

const totals = computed(() => {
  const source = active.value
  if (!source) return []
  return props.columns.map((scenario) => ({
    key: scenario,
    label: SCENARIO_LABELS[scenario],
    ap: source.scenarios[scenario]?.ap ?? null,
    rank: source.scenarios[scenario]?.rank ?? null,
    apDelta: scenario === 'CURRENT' ? null : source.deltas[scenario]?.ap ?? null,
    rankDelta: scenario === 'CURRENT' ? null : source.deltas[scenario]?.rank ?? null,
  }))
})

const avatarUrl = computed(() => pickAvatarUrl(props.player))
const avatarFallback = computed(() => pickAvatarFallback(props.player))
</script>

<template>
  <BaseModal :open="open" :title="player?.name ?? 'Player plays'" max-width="1200px"
    @close="emit('close')">
    <div class="plays-modal">
      <header class="plays-modal__head">
        <GlowImage v-if="player" :src="avatarUrl" :alt="player.name" :size="40"
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
        <label class="plays-modal__limit">
          <span class="plays-modal__limit-label">
            Top plays
            <HintTooltip :text="LIMIT_HINT" label="top plays" />
          </span>
          <input class="plays-modal__limit-input" type="number" min="1" max="50" step="1"
            :value="limit"
            @change="emit('update:limit', Number(($event.target as HTMLInputElement).value))" />
        </label>
      </header>

      <p v-if="error" class="plays-modal__error">{{ error }}</p>

      <template v-if="loading">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </template>

      <p v-else-if="player && ordered.length === 0" class="plays-modal__empty">
        This player has no ranked plays.
      </p>

      <template v-else-if="player">
        <div class="plays-modal__controls">
          <CategoryTabs :model-value="category" :exclude="excluded"
            @update:model-value="category = $event" />
          <div v-if="totals.length" class="plays-modal__totals">
            <div v-for="total in totals" :key="total.key" class="plays-modal__total">
              <span class="plays-modal__total-label">{{ total.label }}</span>
              <ScenarioCell :value="total.ap" :delta="total.apDelta" :decimals="AP_DECIMALS"
                :emphasis="total.key === scenario" />
              <span class="plays-modal__total-rank">
                {{ total.rank != null ? `#${total.rank}` : '–' }}
                <ScenarioCell delta-only invert :value="total.rankDelta" :delta="total.rankDelta"
                  :decimals="0" />
              </span>
            </div>
          </div>
        </div>

        <PlayerPlaysTable :plays="plays" :scenario="scenario" :columns="columns" />
      </template>
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
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.plays-modal__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.plays-modal__limit-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plays-modal__limit-input {
  width: 64px;
  padding: 4px var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  text-align: right;
  outline: none;
}

.plays-modal__limit-input:focus {
  border-color: var(--page-accent, var(--accent));
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

.plays-modal__controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
  min-width: 0;
}

.plays-modal__controls > :first-child {
  flex: 1;
  min-width: 220px;
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
