<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ComparisonScenario, ComplexityPlayerCategory, ComplexityPlayerPlays } from '@/types/api/complexity'
import type { CategoryCode } from '@/types/display'
import { AP_DECIMALS } from '@/utils/complexity'
import { CATEGORY_ORDER } from '@/utils/constants'
import PlayerPlaysTable from './PlayerPlaysTable.vue'
import ScenarioCell from './ScenarioCell.vue'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  player: ComplexityPlayerPlays | null
  scenario: ComparisonScenario
  limit: number
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  'update:limit': [limit: number]
}>()

const LIMIT_HINT = 'How many of the best plays each scenario contributes. The table lists the union of those, so it can hold more rows than this.'
const LIST_HINT = "List is where the play sits in this player's own list, which sets how much of its AP counts. Rank is where it sits on the map."
const MAX_LIMIT = 50

const category = ref<CategoryCode>('overall')

const ordered = computed<ComplexityPlayerCategory[]>(() => {
  const order = CATEGORY_ORDER as readonly string[]
  return [...(props.player?.categories ?? [])].sort((a, b) => order.indexOf(a.categoryCode) - order.indexOf(b.categoryCode))
})

const excluded = computed<CategoryCode[]>(() => {
  const played = ordered.value.map((entry) => entry.categoryCode)
  return ['xp', 'low_mid', ...(CATEGORY_ORDER as readonly string[]).filter((code) => code !== 'overall' && !played.includes(code))]
})

watch(() => props.player?.player.id, () => {
  category.value = 'overall'
})

const active = computed(() => ordered.value.find((entry) => entry.categoryCode === category.value))
const plays = computed(() => (active.value ? active.value.plays : ordered.value.flatMap((entry) => entry.plays)))
</script>

<template>
  <BaseModal :open="open" :title="player?.player.name ?? 'Player Plays'" max-width="1200px" @close="emit('close')">
    <div class="plays-modal">
      <p v-if="error" class="caption plays-modal__error" role="alert">{{ error }}</p>

      <template v-if="loading || !player">
        <SkeletonLoader class="placeholder" height="var(--control-h)" />
        <SkeletonLoader v-for="n in 8" :key="n" class="placeholder" height="64px" />
      </template>

      <p v-else-if="!ordered.length" class="caption">This player has no ranked plays</p>

      <template v-else>
        <header class="plays-modal__head">
          <UserChip :user="player.player" size="lg" />
          <div v-if="active" class="plays-modal__fact">
            <span class="field-label">AP</span>
            <ScenarioCell :entry="active" field="ap" :scenario="scenario" :decimals="AP_DECIMALS" emphasis />
          </div>
          <div v-if="active" class="plays-modal__fact">
            <span class="field-label">Rank</span>
            <ScenarioCell :entry="active" field="rank" :scenario="scenario" :decimals="0" invert emphasis />
          </div>
        </header>

        <div class="plays-modal__controls">
          <CategoryTabs :model-value="category" :exclude="excluded" @update:model-value="category = $event" />
          <HintTooltip :text="LIST_HINT" label="List and rank" />
          <span class="plays-modal__limit">
            <span class="field-label">Top Plays</span>
            <HintTooltip :text="LIMIT_HINT" label="Top plays" />
            <BaseInput class="plays-modal__limit-input" type="number" min="1" :max="MAX_LIMIT" step="1" :model-value="limit"
              aria-label="Top plays" @change="emit('update:limit', Number(($event.target as HTMLInputElement).value))" />
          </span>
        </div>

        <PlayerPlaysTable :plays="plays" :scenario="scenario" />
      </template>
    </div>
  </BaseModal>
</template>

<style scoped>
.plays-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 70vh;
}

.plays-modal__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md) var(--space-2xl);
}

.plays-modal__head > :first-child {
  flex: 1;
  min-width: 200px;
}

.plays-modal__fact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.plays-modal__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.plays-modal__limit {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.plays-modal__limit-input {
  width: 88px;
}

.plays-modal__error {
  color: var(--error);
}
</style>
