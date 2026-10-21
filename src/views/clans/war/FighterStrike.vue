<script setup lang="ts">
import AccuracySlider from '@/components/common/AccuracySlider.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  ClanWarPoolEntryResponse,
  ClanWarStrikePreviewResponse,
  ClanWarStrikeRulesResponse,
} from '@/types/api/clans'
import { formatAccuracy } from '@/utils/formatters'
import { formatDifficulty } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'
import StrikeLines from './StrikeLines.vue'
import { formatDamage, hitBreakdown, strikeOutcome, type StrikeKind } from './warStrike'

const props = defineProps<{
  rules: ClanWarStrikeRulesResponse
  preview: ClanWarStrikePreviewResponse
  guard: number
  pool: ClanWarPoolEntryResponse[]
  loadedMapId: string
}>()

const mapId = defineModel<string>('mapId', { required: true })

const KIND_LABEL: Record<StrikeKind, string> = { damage: 'Damage', chip: 'Chip', none: 'Nothing lands' }

const accuracy = ref(1)

const hit = computed(() => hitBreakdown(props.rules, props.preview, props.guard))
const entry = computed(() => props.pool.find((e) => e.difficulty.id === mapId.value) ?? null)
const loaded = computed(() => !!entry.value && props.loadedMapId === mapId.value)

watch(loaded, (ready) => {
  if (!ready || !entry.value) return
  const maxScore = entry.value.difficulty.maxScore
  accuracy.value = (entry.value.viewerScore?.score ?? props.preview.onMap?.targetScore ?? maxScore) / maxScore
}, { immediate: true })

const outcome = computed(() => {
  if (!loaded.value || !entry.value) return null
  const maxScore = entry.value.difficulty.maxScore
  return strikeOutcome(props.rules, props.preview, props.guard, Math.round(accuracy.value * maxScore), maxScore)
})
</script>

<template>
  <span class="strike">
    <span class="strike__damage">
      {{ formatDamage(hit.damage) }}
      <HintTooltip text="Damage breakdown" :width="320" more>
        <template #default="{ locked }">
          <StrikeLines v-if="!locked" :lines="hit.lines" />
          <div v-else class="strike__what-if">
            <div class="strike__maps">
              <button
                v-for="e in pool"
                :key="e.difficulty.id"
                type="button"
                class="strike__map"
                :class="{ 'strike__map--active': e.difficulty.id === mapId }"
                @click="mapId = e.difficulty.id"
              >
                {{ e.difficulty.songName }} ({{ formatDifficulty(e.difficulty.difficulty) }})
              </button>
            </div>
            <StrikeLines v-if="!entry" :lines="hit.lines" />
            <template v-else>
              <span class="strike__acc">{{ formatAccuracy(accuracy) }}</span>
              <AccuracySlider v-model="accuracy" />
              <template v-if="outcome">
                <span class="strike__kind" :class="`strike__kind--${outcome.kind}`">{{ KIND_LABEL[outcome.kind] }}</span>
                <span>{{ outcome.note }}</span>
                <StrikeLines v-if="outcome.lines.length" :lines="outcome.lines" />
              </template>
              <SkeletonLoader v-else variant="text" :lines="3" />
            </template>
          </div>
        </template>
      </HintTooltip>
    </span>
    <span class="strike__hits">
      {{ preview.hitsToBreak }} {{ preview.hitsToBreak === 1 ? 'hit' : 'hits' }} to break
    </span>
  </span>
</template>

<style scoped>
.strike {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.strike__damage {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.strike__hits {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
}

.strike__what-if {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.strike__maps {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--bg-overlay);
  padding-bottom: var(--space-xs);
}

.strike__map {
  padding: var(--space-xs) 0;
  background: none;
  border: none;
  color: var(--text-secondary);
  font: inherit;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.strike__map:hover,
.strike__map--active {
  color: var(--text-primary);
}

.strike__map--active {
  font-weight: 600;
}

.strike__acc {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.strike__kind {
  font-weight: 600;
}

.strike__kind--damage {
  color: var(--success);
}

.strike__kind--chip {
  color: var(--warning);
}

.strike__kind--none {
  color: var(--text-tertiary);
}
</style>
