<script setup lang="ts">
import { formatAccuracy, formatCount } from '@/utils/formatters'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  MissionCalibrationResponse,
  MissionShortfallResponse,
  MissionStatsParams,
} from '@/types/api/statistics'
import { computed, ref, watch } from 'vue'
import StatsCloseButton from './StatsCloseButton.vue'
import StatsHistogram from './StatsHistogram.vue'
import {
  MISSION_TIER_LABELS,
  NO_VALUE,
  labelCase,
  rateClass,
} from './statsFormat'

const props = defineProps<{
  templateId: string
  filters: MissionStatsParams
}>()

const emit = defineEmits<{ close: [] }>()

const loading = ref(false)
const failed = ref(false)
const tiers = ref<MissionCalibrationResponse[]>([])
const shortfall = ref<MissionShortfallResponse[]>([])

const templateName = computed(() => tiers.value[0]?.templateName ?? '')
const templateCode = computed(() => tiers.value[0]?.templateCode ?? '')
const missionType = computed(() => tiers.value[0]?.type ?? null)
const maxAssigned = computed(() => Math.max(...tiers.value.map((t) => t.assigned), 1))

let requestId = 0

async function fetchDetail() {
  const { templateId, filters } = props
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const api = await import('@/api/statistics')
    const [byTier, shortfallRows] = await Promise.all([
      api.getMissionCalibrationByTier(templateId, filters),
      api.getMissionShortfall(templateId, filters),
    ])
    if (id !== requestId) return
    tiers.value = byTier
    shortfall.value = shortfallRows
  } catch {
    if (id !== requestId) return
    tiers.value = []
    shortfall.value = []
    failed.value = true
  }
  loading.value = false
}

watch(() => JSON.stringify([props.templateId, props.filters]), fetchDetail, { immediate: true })
</script>

<template>
  <section class="calib-detail">
    <header class="calib-detail__head">
      <div>
        <h3 class="calib-detail__name">{{ templateName || 'Mission template' }}</h3>
        <p class="calib-detail__meta">
          <span v-if="templateCode" class="calib-detail__code">{{ templateCode }}</span>
          <span v-if="missionType">{{ labelCase(missionType) }}</span>
        </p>
      </div>
      <StatsCloseButton label="Close template breakdown" @click="emit('close')" />
    </header>

    <div v-if="loading" class="calib-detail__panels">
      <SkeletonLoader variant="card" height="220px" />
      <SkeletonLoader variant="card" height="220px" />
    </div>

    <p v-else-if="failed" class="calib-detail__note">Could not load this breakdown. Try again in a moment.</p>

    <div v-else class="calib-detail__panels">
      <div class="tier-strip">
        <h4 class="calib-detail__subtitle">Completion by tier</h4>
        <p v-if="!tiers.length" class="calib-detail__note">No assignments match the current filters.</p>
        <ol v-else class="tier-strip__list">
          <li v-for="row in tiers" :key="row.tier ?? 'none'" class="tier-strip__row">
            <span class="tier-strip__tier" :class="{ 'tier-strip__tier--unknown': row.tier === 'unknown' }">
              {{ row.tier ? MISSION_TIER_LABELS[row.tier] : NO_VALUE }}
            </span>
            <span class="tier-strip__track">
              <span class="tier-strip__fill" :class="rateClass(row.completionRate)"
                :style="{ '--fill': ((row.completionRate ?? 0) * 100) + '%' }" />
            </span>
            <span class="tier-strip__rate" :class="rateClass(row.completionRate)">
              {{ formatAccuracy(row.completionRate, 1) }}
            </span>
            <span class="tier-strip__counts"
              :title="formatCount(row.assigned) + ' assigned in this tier of ' + formatCount(maxAssigned) + ' at the busiest tier'">
              {{ formatCount(row.completed) }} / {{ formatCount(row.assigned) }}
            </span>
          </li>
        </ol>
      </div>

      <div class="shortfall">
        <h4 class="calib-detail__subtitle">How close the failures got</h4>
        <p v-if="!shortfall.length" class="calib-detail__note">No expired missions yet.</p>
        <div v-for="row in shortfall" :key="row.band" class="shortfall__band">
          <div class="shortfall__head">
            <span class="shortfall__band-name">{{ labelCase(row.band) }}</span>
            <span class="shortfall__stat">median reached {{ formatAccuracy(row.medianReachedFraction, 1) }}</span>
          </div>
          <p class="shortfall__counts">{{ formatCount(row.measured) }} measured of {{ formatCount(row.failed) }} expired</p>
          <StatsHistogram title="Progress at expiry" :entries="row.buckets" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calib-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
}

.calib-detail__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.calib-detail__name {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.calib-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.calib-detail__code {
  font-family: var(--font-code);
}

.calib-detail__subtitle {
  margin: 0 0 var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.calib-detail__note {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-tertiary);
  line-height: 1.5;
}

.calib-detail__panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: start;
}

.tier-strip__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tier-strip__row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 54px auto;
  align-items: center;
  gap: var(--space-sm);
  padding: 3px 0;
}

.tier-strip__tier {
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.tier-strip__tier--unknown {
  color: var(--text-tertiary);
}

.tier-strip__track {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 1px;
  overflow: hidden;
}

.tier-strip__fill {
  display: block;
  width: var(--fill);
  height: 100%;
  background: currentColor;
  transition: width 200ms ease-out;
}

.tier-strip__rate {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  text-align: right;
}

.tier-strip__counts {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.shortfall {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.shortfall__band {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.shortfall__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.shortfall__band-name {
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.shortfall__stat {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--page-accent);
}

.shortfall__counts {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .calib-detail__panels {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tier-strip__fill {
    transition: none;
  }
}
</style>

<style scoped src="./statsRates.css"></style>
