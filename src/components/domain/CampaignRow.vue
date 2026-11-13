<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
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
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

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
const difficultyColor = computed(() =>
  campaignDifficultyColor(props.campaign.tags, campaignAccent(props.campaign.tags)),
)

const totalNodes = computed(() => props.campaign.difficultyCount || 0)

const run = computed<CampaignProgressSummary | null>(() => {
  if (props.progress) return props.progress
  const status = props.campaign.myProgressStatus
  if (status !== 'IN_PROGRESS' && status !== 'COMPLETED') return null
  return { progressStatus: status, completedDifficulties: props.campaign.myCompletedDifficulties ?? 0 }
})

const draftLabel = computed(() => {
  if (props.campaign.status === 'DRAFT') return 'Draft'
  if (props.campaign.status === 'EDITING') return 'Editing'
  return null
})

const creator = computed(() => props.campaign.creatorAlias || props.campaign.creatorName || 'AccSaber')
const coverUrl = computed(() => props.campaign.iconUrl || props.campaign.backgroundUrl || null)

const loot = computed(() => {
  const xp = props.campaign.totalXp
  const items = props.campaign.totalRewardCount ?? props.campaign.rewards?.length ?? 0
  return [
    run.value ? null : `${totalNodes.value} nodes`,
    xp ? `${xp.toLocaleString()} XP` : null,
    items ? `${items.toLocaleString()} item${items === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <router-link
    class="campaign-card"
    :to="cardTo"
    :style="{ '--card-diff': difficultyColor, '--card-diff-gradient': difficultyGradient ?? 'none' }"
  >
    <div class="campaign-card__cover" aria-hidden="true">
      <img v-if="coverUrl" :src="coverUrl" alt="" loading="lazy" decoding="async" />
      <div v-else class="campaign-card__fallback">
        <svg viewBox="-30 -30 60 60">
          <polygon points="28,0 14,24.25 -14,24.25 -28,0 -14,-24.25 14,-24.25"
            fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
          <text y="7" text-anchor="middle" fill="currentColor">{{ totalNodes }}</text>
        </svg>
      </div>
    </div>

    <div class="campaign-card__head">
      <h3 class="campaign-card__line card-title">{{ campaign.name }}</h3>
      <p class="campaign-card__byline caption">
        <span class="campaign-card__line">by {{ creator }}<template v-if="collab"> · Collaborating</template></span>
        <CampaignStatusBadge :campaign="campaign" />
        <span v-if="draftLabel" class="campaign-card__note">{{ draftLabel }}</span>
      </p>
      <p class="campaign-card__summary caption">{{ campaign.summary }}</p>
      <p class="campaign-card__line campaign-card__identity">
        <CampaignCategoryTags :tags="campaign.tags" collapse />
        <span v-if="difficultyLabel" class="campaign-card__diff"
          :class="{ 'campaign-card__diff--fade': difficultyGradient }">{{ difficultyLabel }}</span>
        <span v-if="campaign.legacy" class="campaign-card__note">Retroactive</span>
      </p>
    </div>

    <div class="campaign-card__foot">
      <div class="campaign-card__row caption">
        <span v-if="run" class="campaign-card__progress"
          :class="{ 'campaign-card__progress--done': run.progressStatus === 'COMPLETED' }">
          <ProgressBar :value="totalNodes > 0 ? run.completedDifficulties / totalNodes : 0" />
          {{ run.completedDifficulties }}/{{ totalNodes }}
        </span>
        <span class="campaign-card__line">{{ loot }}</span>
      </div>
      <div class="campaign-card__row caption">
        <CampaignVoteControl :campaign="campaign" size="sm" />
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.campaign-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.campaign-card:hover {
  border-color: var(--text-tertiary);
}

.campaign-card__cover {
  aspect-ratio: 1 / 1;
  background: var(--bg-base);
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
  color: var(--card-diff);
}

.campaign-card__fallback svg {
  width: 40%;
}

.campaign-card__fallback text {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
}

.campaign-card__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding: var(--space-md) var(--space-md) 0;
}

.campaign-card__line {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-card__summary {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 3em;
  overflow: hidden;
}

.campaign-card__identity {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.5;
}

.campaign-card__diff {
  color: var(--card-diff);
}

.campaign-card__diff--fade {
  background-image: var(--card-diff-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.campaign-card__note {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
  color: var(--text-tertiary);
}

.campaign-card__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md) var(--space-md);
}

.campaign-card__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 26px;
  min-width: 0;
}

.campaign-card__byline {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 20px;
  min-width: 0;
}

.campaign-card__byline > .campaign-card__line {
  flex: 1;
  min-width: 0;
}

.campaign-card__progress {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 0 0 auto;
  --bar-height: 4px;
}

.campaign-card__progress .progress-bar {
  flex: none;
  width: 48px;
}

.campaign-card__progress--done {
  --bar-color: var(--success);
}

@media (max-width: 767px) {
  .campaign-card {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .campaign-card__cover {
    align-self: start;
  }

  .campaign-card__head {
    gap: 0;
    padding: var(--space-sm) var(--space-md) 0;
  }

  .campaign-card__summary {
    -webkit-line-clamp: 1;
    min-height: 1.5em;
  }

  .campaign-card__foot {
    grid-column: 1 / -1;
    padding: var(--space-sm) var(--space-md);
  }
}
</style>
