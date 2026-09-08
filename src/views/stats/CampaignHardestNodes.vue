<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import { pickCoverFallback, pickCoverUrl } from '@/composables/useAvatarFallback'
import type { CampaignNodeDifficultyResponse } from '@/types/api/statistics'
import { formatUserValue, requirementLabel } from '@/utils/campaignLayout'
import { computed, ref, watch } from 'vue'
import { fmtDecimal, fmtFraction, fmtInt, rateClass } from './statsFormat'

const props = defineProps<{
  campaignId: string
  campaignName: string
  country: string
}>()

const emit = defineEmits<{ close: [] }>()

const loading = ref(false)
const failed = ref(false)
const nodes = ref<CampaignNodeDifficultyResponse[]>([])

const maxUnlocked = computed(() => Math.max(...nodes.value.map((n) => n.unlocked), 1))

function requirement(node: CampaignNodeDifficultyResponse): string {
  if (!node.requirementType) return 'No requirement'
  return `${requirementLabel(node.requirementType)} ${formatUserValue(node.requirementType, node.requirementValue)}`
}

let requestId = 0

async function fetchNodes(campaignId: string, country: string) {
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const { getCampaignHardestNodes } = await import('@/api/statistics')
    const result = await getCampaignHardestNodes(campaignId, country || undefined)
    if (id !== requestId) return
    nodes.value = result
  } catch (error) {
    if (id !== requestId) return
    console.error('Failed to fetch campaign nodes:', error)
    nodes.value = []
    failed.value = true
  }
  loading.value = false
}

watch(
  () => [props.campaignId, props.country] as const,
  ([campaignId, country]) => fetchNodes(campaignId, country),
  { immediate: true },
)
</script>

<template>
  <section class="nodes">
    <header class="nodes__head">
      <div>
        <h3 class="nodes__title">{{ campaignName || 'Campaign' }}</h3>
      </div>
      <button type="button" class="nodes__close" aria-label="Close campaign nodes" @click="emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <div v-if="loading" class="nodes__list">
      <SkeletonLoader v-for="i in 5" :key="i" variant="card" height="64px" />
    </div>

    <p v-else-if="failed" class="nodes__empty">Could not load this campaign's nodes.</p>

    <p v-else-if="!nodes.length" class="nodes__empty">
      No node data yet.
    </p>

    <ol v-else class="nodes__list">
      <li v-for="node in nodes" :key="node.campaignDifficultyId" class="node">
        <GlowImage :src="pickCoverUrl(node)" :fallback-src="pickCoverFallback(node)" :alt="node.songName" :size="44" />

        <div class="node__identity">
          <span class="node__song">
            {{ node.songName }}
            <span v-if="node.songSubName" class="node__subname">{{ node.songSubName }}</span>
          </span>
          <span class="node__meta">
            <DifficultyBadge :difficulty="node.difficulty" />
            <span class="node__author">{{ node.songAuthor }}</span>
            <span class="node__mapper">{{ node.mapAuthor }}</span>
          </span>
        </div>

        <div class="node__requirement">
          <span class="node__label">Requirement</span>
          <span class="node__req-value">{{ requirement(node) }}</span>
          <span class="node__flags">
            <span v-if="node.barrier" class="node__flag node__flag--barrier">Gate</span>
            <span v-if="node.terminal" class="node__flag">Final</span>
            <span class="node__xp">{{ fmtInt(node.xp) }} XP</span>
          </span>
        </div>

        <div class="node__numbers">
          <span class="node__stat">
            <span class="node__label">Unlocked</span>
            <span class="node__value">{{ fmtInt(node.unlocked) }}</span>
          </span>
          <span class="node__stat">
            <span class="node__label">Cleared</span>
            <span class="node__value">{{ fmtInt(node.cleared) }}</span>
          </span>
          <span class="node__stat">
            <span class="node__label">Clear rate</span>
            <span class="node__value" :class="rateClass(node.clearRate)">{{ fmtFraction(node.clearRate) }}</span>
          </span>
          <span class="node__stat">
            <span class="node__label">Median days</span>
            <span class="node__value">{{ fmtDecimal(node.medianDaysToClear) }}</span>
          </span>
        </div>

        <span class="node__track" :title="fmtInt(node.cleared) + ' cleared of ' + fmtInt(node.unlocked) + ' unlocked'">
          <span class="node__reach" :style="{ '--reach': ((node.unlocked / maxUnlocked) * 100) + '%' }">
            <span class="node__clear" :class="rateClass(node.clearRate)"
              :style="{ '--fill': ((node.clearRate ?? 0) * 100) + '%' }" />
          </span>
        </span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.nodes {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
}

.nodes__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.nodes__title {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.nodes__close {
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

.nodes__close:hover {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
}

.nodes__empty {
  margin: 0;
  padding: var(--space-lg) 0;
  text-align: center;
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

.nodes__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.node {
  display: grid;
  grid-template-columns: 44px minmax(0, 1.6fr) minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.node__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.node__song {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node__subname {
  color: var(--text-tertiary);
  font-weight: 400;
}

.node__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-caption);
}

.node__author {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node__mapper {
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node__requirement {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.node__req-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.node__flags {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
}

.node__flag {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}

.node__flag--barrier {
  color: var(--warning);
}

.node__xp {
  font-family: var(--font-mono);
  color: var(--xp-campaign);
}

.node__numbers {
  display: flex;
  gap: var(--space-lg);
}

.node__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.node__label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.node__value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.node__track {
  grid-column: 2 / -1;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 1px;
  overflow: hidden;
}

.node__reach {
  display: block;
  width: var(--reach);
  height: 100%;
  background: var(--bg-overlay);
}

.node__clear {
  display: block;
  width: var(--fill);
  height: 100%;
  background: currentColor;
}

.rate--critical { color: var(--error); }
.rate--low { color: var(--xp-score); }
.rate--mid { color: var(--warning); }
.rate--high { color: var(--tier-platinum); }
.rate--top { color: var(--success); }
.rate--none { color: var(--text-tertiary); }

@media (max-width: 900px) {
  .node {
    grid-template-columns: 44px minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
  }

  .node__requirement,
  .node__numbers,
  .node__track {
    grid-column: 1 / -1;
  }

  .node__numbers {
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .node__stat {
    text-align: left;
  }
}
</style>
