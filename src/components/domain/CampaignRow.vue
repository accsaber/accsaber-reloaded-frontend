<script setup lang="ts">
import CampaignCardPopover from '@/components/domain/CampaignCardPopover.vue'
import CampaignCategoryTags from '@/components/domain/CampaignCategoryTags.vue'
import CampaignStatusBadge from '@/components/domain/CampaignStatusBadge.vue'
import CampaignVoteControl from '@/components/domain/CampaignVoteControl.vue'
import { useCampaignAccent } from '@/composables/useCampaignAccent'
import type { CampaignProgressSummary, CampaignResponse } from '@/types/api/campaigns'
import {
  campaignDifficultyColor,
  campaignDifficultyGradient,
  campaignDifficultyLabel,
} from '@/utils/campaignDifficulty'
import { computed, defineAsyncComponent } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const CampaignRewardItem = defineAsyncComponent(() => import('@/components/domain/CampaignRewardItem.vue'))

const props = defineProps<{
  campaign: CampaignResponse
  progress?: CampaignProgressSummary | null
  editorLink?: boolean
  collab?: boolean
  viewingUserId?: string | null
}>()

const { campaignAccent } = useCampaignAccent()

const cardTo = computed<RouteLocationRaw>(() => {
  const params = { campaignId: props.campaign.slug || props.campaign.id }
  if (props.editorLink) return { name: 'campaign-editor', params }
  return {
    name: 'campaign-detail',
    params,
    query: props.viewingUserId ? { viewing: props.viewingUserId } : undefined,
  }
})

const difficultyLabel = computed(() => campaignDifficultyLabel(props.campaign.tags))
const difficultyGradient = computed(() => campaignDifficultyGradient(props.campaign.tags))
const extraTags = computed(() => props.campaign.tags.filter((t) => t.kind === 'THEME' || t.kind === 'GENRE'))

const accent = computed(() => campaignAccent(props.campaign.tags))

const difficultyColor = computed(() => campaignDifficultyColor(props.campaign.tags, accent.value))

const totalNodes = computed(() => props.campaign.difficultyCount || 0)

const run = computed<CampaignProgressSummary | null>(() => {
  if (props.progress) return props.progress
  const status = props.campaign.myProgressStatus
  if (status !== 'IN_PROGRESS' && status !== 'COMPLETED') return null
  return { progressStatus: status, completedDifficulties: props.campaign.myCompletedDifficulties ?? 0 }
})

const progressPct = computed(() =>
  run.value && totalNodes.value > 0 ? Math.round((run.value.completedDifficulties / totalNodes.value) * 100) : 0,
)

const draftLabel = computed(() => {
  if (props.campaign.status === 'DRAFT') return 'Draft'
  if (props.campaign.status === 'EDITING') return 'Editing'
  return null
})

const creator = computed(() => props.campaign.creatorAlias || props.campaign.creatorName || 'AccSaber')
const coverUrl = computed(() => props.campaign.iconUrl || props.campaign.backgroundUrl || null)
const rewardXp = computed(() => (props.campaign.totalXp ? `${props.campaign.totalXp.toLocaleString()} XP` : null))
const rewardItems = computed(() => props.campaign.rewards ?? [])

const itemsLabel = computed(() => {
  const count = props.campaign.totalRewardCount ?? rewardItems.value.length
  return `${count.toLocaleString()} item${count === 1 ? '' : 's'}`
})

const tagsLabel = computed(() => `${extraTags.value.length} tag${extraTags.value.length === 1 ? '' : 's'}`)
const hasFootline = computed(() => !!rewardXp.value || rewardItems.value.length > 0 || extraTags.value.length > 0)
</script>

<template>
  <router-link
    class="campaign-card"
    :to="cardTo"
    :style="{ '--card-accent': accent, '--card-diff': difficultyColor, '--card-diff-gradient': difficultyGradient ?? 'none' }"
  >
    <div class="campaign-card__cover" aria-hidden="true">
      <img v-if="coverUrl" :src="coverUrl" :alt="campaign.name" loading="lazy" />
      <div v-else class="campaign-card__fallback">
        <svg viewBox="-30 -30 60 60" width="64" height="64" aria-hidden="true">
          <polygon points="28,0 14,24.25 -14,24.25 -28,0 -14,-24.25 14,-24.25"
            fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
          <polygon points="16,0 8,13.86 -8,13.86 -16,0 -8,-13.86 8,-13.86"
            fill="currentColor" opacity="0.18" />
        </svg>
        <span class="campaign-card__fallback-count">{{ totalNodes }}</span>
      </div>
      <span v-if="difficultyLabel" class="campaign-card__diff-pill"
        :class="{ 'campaign-card__diff-pill--fade': difficultyGradient }">
        <span class="campaign-card__diff-pill-text">{{ difficultyLabel }}</span>
      </span>
    </div>

    <div class="campaign-card__body">
      <header class="campaign-card__head">
        <h3 class="campaign-card__name">{{ campaign.name }}</h3>
        <p class="campaign-card__creator">
          by {{ creator }}
          <span v-if="collab" class="campaign-card__collab">· collaborating</span>
        </p>
      </header>

      <p v-if="campaign.summary" class="campaign-card__summary">{{ campaign.summary }}</p>

      <div class="campaign-card__meta">
        <CampaignCategoryTags :tags="campaign.tags" collapse />
        <span v-if="campaign.legacy" class="campaign-card__chip">Retroactive</span>
      </div>

      <footer class="campaign-card__foot">
        <p v-if="hasFootline" class="campaign-card__loot">
          <span v-if="rewardXp">{{ rewardXp }}</span>
          <CampaignCardPopover v-if="rewardItems.length > 0" :label="itemsLabel" title="Rewards">
            <ul class="campaign-card__popover-list">
              <li v-for="r in rewardItems" :key="r.itemId">
                <CampaignRewardItem :name="r.itemName" :quantity="r.quantity" :item="r.item" />
              </li>
            </ul>
          </CampaignCardPopover>
          <CampaignCardPopover v-if="extraTags.length > 0" :label="tagsLabel" title="Tags">
            <ul class="campaign-card__popover-list campaign-card__popover-list--tags">
              <li v-for="t in extraTags" :key="t.id">{{ t.name }}</li>
            </ul>
          </CampaignCardPopover>
        </p>
        <div class="campaign-card__foot-row">
          <CampaignStatusBadge :campaign="campaign" size="sm" />
          <span v-if="draftLabel" class="campaign-card__status">{{ draftLabel }}</span>
          <span v-if="run" class="campaign-card__progress"
            :class="{ 'campaign-card__progress--done': run.progressStatus === 'COMPLETED' }">
            <span class="campaign-card__progress-track" aria-hidden="true">
              <span class="campaign-card__progress-fill" :style="{ transform: `scaleX(${progressPct / 100})` }" />
            </span>
            <span class="campaign-card__progress-text">{{ run.completedDifficulties }}/{{ totalNodes }}</span>
          </span>
          <span v-else class="campaign-card__count">{{ totalNodes }} nodes</span>
        </div>
        <CampaignVoteControl :campaign="campaign" size="sm" />
      </footer>
    </div>
  </router-link>
</template>

<style scoped>
.campaign-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color 140ms ease, transform 140ms ease;
}

.campaign-card:hover {
  border-color: var(--card-accent);
  transform: translateY(-1px);
}

.campaign-card__cover {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--bg-base);
  overflow: hidden;
}

.campaign-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.campaign-card__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--space-xs);
  color: var(--card-diff);
  background: var(--bg-base);
}

.campaign-card__fallback-count {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--card-diff);
}

.campaign-card__diff-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--card-diff);
  background: var(--bg-base);
  border: 1px solid color-mix(in srgb, var(--card-diff) 40%, transparent);
  border-radius: var(--radius-pill);
}

.campaign-card__diff-pill-text {
  color: inherit;
}

.campaign-card__diff-pill--fade .campaign-card__diff-pill-text {
  background-image: var(--card-diff-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.campaign-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  flex: 1;
  min-width: 0;
}

.campaign-card__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.campaign-card__name {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.campaign-card__creator {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.campaign-card__collab {
  color: var(--card-accent);
  font-weight: 600;
}

.campaign-card__summary {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.campaign-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.campaign-card__chip {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-card__chip {
  padding: 2px 6px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
}

.campaign-card__foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--bg-overlay);
}

.campaign-card__loot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.campaign-card__loot > * + *::before {
  content: '·';
  margin-right: 5px;
  color: var(--text-tertiary);
}

.campaign-card__popover-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campaign-card__popover-list--tags {
  flex-direction: row;
  flex-wrap: wrap;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.campaign-card__popover-list--tags li {
  padding: 2px 6px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.campaign-card__foot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-width: 0;
}

.campaign-card__status {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}


.campaign-card__progress,
.campaign-card__count {
  margin-left: auto;
}

.campaign-card__progress {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.campaign-card__progress-track {
  position: relative;
  width: 84px;
  height: 3px;
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.campaign-card__progress-fill {
  position: absolute;
  inset: 0;
  background: var(--card-accent);
  transform-origin: left center;
}

.campaign-card__progress--done .campaign-card__progress-fill {
  background: var(--success);
}

.campaign-card__count {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}
</style>
