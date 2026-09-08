<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  MissionCalibrationResponse,
  MissionShortfallResponse,
  MissionStatsParams,
} from '@/types/api/statistics'
import { computed, ref, watch } from 'vue'
import StatsHistogram from './StatsHistogram.vue'
import {
  MISSION_TIER_LABELS,
  NO_VALUE,
  fmtFraction,
  fmtInt,
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

async function fetchDetail(templateId: string, filters: MissionStatsParams) {
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
  } catch (error) {
    if (id !== requestId) return
    console.error('Failed to fetch mission calibration detail:', error)
    tiers.value = []
    shortfall.value = []
    failed.value = true
  }
  loading.value = false
}

watch(
  () => [props.templateId, props.filters] as const,
  ([templateId, filters]) => fetchDetail(templateId, filters),
  { immediate: true, deep: true },
)
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
      <button type="button" class="calib-detail__close" aria-label="Close template breakdown" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
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
              {{ fmtFraction(row.completionRate) }}
            </span>
            <span class="tier-strip__counts"
              :title="fmtInt(row.assigned) + ' assigned in this tier of ' + fmtInt(maxAssigned) + ' at the busiest tier'">
              {{ fmtInt(row.completed) }} / {{ fmtInt(row.assigned) }}
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
            <span class="shortfall__stat">median reached {{ fmtFraction(row.medianReachedFraction) }}</span>
          </div>
          <p class="shortfall__counts">{{ fmtInt(row.measured) }} measured of {{ fmtInt(row.failed) }} expired</p>
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

.calib-detail__close {
  flex-shrink: 0;
  display: inline-flex;
  padding: var(--space-xs);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.calib-detail__close:hover {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
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

.rate--critical { color: var(--error); }
.rate--low { color: var(--xp-score); }
.rate--mid { color: var(--warning); }
.rate--high { color: var(--tier-platinum); }
.rate--top { color: var(--success); }
.rate--none { color: var(--text-tertiary); }

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
