<script setup lang="ts">
import { getPlaylistExportUrl } from '@/api/campaigns'
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CampaignCategoryTags from '@/components/domain/CampaignCategoryTags.vue'
import CampaignCurationCredits from '@/components/domain/CampaignCurationCredits.vue'
import CampaignStatusBadge from '@/components/domain/CampaignStatusBadge.vue'
import CampaignVoteControl from '@/components/domain/CampaignVoteControl.vue'
import type { CampaignDetailResponse } from '@/types/api/campaigns'
import type { UserCampaignStatus } from '@/types/enums'
import { terminalNodes } from '@/utils/campaignAudit'
import { campaignBadges } from '@/utils/campaignBadges'
import {
  campaignDifficultyColor,
  campaignDifficultyGradient,
  campaignDifficultyLabel,
} from '@/utils/campaignDifficulty'
import CampaignAwards from '@/views/campaign/CampaignAwards.vue'
import CampaignRewardNotice from '@/views/campaign/CampaignRewardNotice.vue'
import { computed, defineAsyncComponent, ref } from 'vue'

const MarkdownText = defineAsyncComponent(() => import('@/components/common/MarkdownText.vue'))

const props = defineProps<{
  campaign: CampaignDetailResponse
  accent: string
  loggedIn: boolean
  myStatus: UserCampaignStatus | null
  spectating: boolean
  spectateName: string
  spectateLoading: boolean
  spectateError: string | null
  completed: number
  total: number
  pct: number
  statusLabel: string
  startedAt: string | null
  milestone: string | null
  starting: boolean
  abandoning: boolean
  actionError: string | null
  canManage: boolean
}>()

const emit = defineEmits<{
  start: []
  abandon: []
  manage: []
  login: []
}>()

const briefingOpen = ref(false)

const tags = computed(() => props.campaign.tags)
const hasCategoryTags = computed(() => tags.value.some((t) => t.kind === 'CATEGORY'))
const themeTags = computed(() => tags.value.filter((t) => t.kind === 'THEME' || t.kind === 'GENRE'))
const hasBadges = computed(() => campaignBadges(props.campaign).length > 0)
const difficultyLabel = computed(() => campaignDifficultyLabel(tags.value))
const difficultyGradient = computed(() => campaignDifficultyGradient(tags.value))
const difficultyStyle = computed(() =>
  difficultyGradient.value
    ? { backgroundImage: difficultyGradient.value }
    : { color: campaignDifficultyColor(tags.value, props.accent) },
)
const playlistUrl = computed(() => getPlaylistExportUrl(props.campaign.id))
const curated = computed(() => props.campaign.status === 'CURATED')

const modeSentence = computed(() => {
  const c = props.campaign
  const endings = terminalNodes(c).length
  const goal =
    c.completionMode === 'ALL'
      ? 'Clear every node'
      : endings > 1
        ? 'Clear any one of the flagged endings'
        : 'Reach the end'
  const order = c.progressionAgnostic ? ' in any order' : ''
  const retro = c.legacy ? ' Existing PBs count toward progress.' : ''
  return `${goal}${order}.${retro}`
})
</script>

<template>
  <aside class="campaign-detail__rail campaign-detail__rail--left" aria-label="Campaign overview">
    <header class="campaign-detail__title-block">
      <h1 class="campaign-detail__title">{{ campaign.name }}</h1>
      <p class="campaign-detail__byline">
        by
        <span class="campaign-detail__creator-name">
          {{ campaign.creatorAlias || campaign.creatorName || 'AccSaber' }}
        </span>
      </p>
      <p v-if="hasBadges" class="campaign-detail__badge-row">
        <CampaignStatusBadge :campaign="campaign" size="md" />
      </p>
      <CampaignCurationCredits :campaign="campaign" />
      <p v-if="hasCategoryTags" class="campaign-detail__taxonomy">
        <CampaignCategoryTags :tags="campaign.tags" />
      </p>
      <p v-if="difficultyLabel || themeTags.length" class="campaign-detail__traits">
        <span v-if="difficultyLabel" class="campaign-detail__trait">
          <span class="campaign-detail__difficulty"
            :class="{ 'campaign-detail__difficulty--fade': difficultyGradient }"
            :style="difficultyStyle">{{ difficultyLabel }}</span>
        </span>
        <span v-for="tag in themeTags" :key="tag.id" class="campaign-detail__trait">{{ tag.name }}</span>
      </p>
      <p class="campaign-detail__mode">{{ modeSentence }}</p>
    </header>

    <p v-if="campaign.summary" class="campaign-detail__summary">{{ campaign.summary }}</p>

    <CampaignVoteControl class="campaign-detail__vote" :campaign="campaign" size="md" />

    <div class="campaign-detail__actions">
      <template v-if="spectating" />
      <BaseButton v-else-if="!loggedIn" variant="primary" size="md" @click="emit('login')">
        Log in to begin
      </BaseButton>
      <BaseButton v-else-if="myStatus === 'IN_PROGRESS'" variant="default" size="md" :loading="abandoning"
        @click="emit('abandon')">
        Abandon campaign
      </BaseButton>
      <span v-else-if="myStatus === 'COMPLETED'" class="campaign-detail__status">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Completed, +{{ campaign.completionXp.toLocaleString() }} XP earned
      </span>
      <BaseButton v-else variant="primary" size="md" :loading="starting" @click="emit('start')">
        Begin campaign
      </BaseButton>

      <BaseButton v-if="campaign.playlistExportEnabled" :href="playlistUrl" size="sm"
        aria-label="Download Beat Saber playlist">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download playlist
      </BaseButton>

      <p v-if="actionError" class="campaign-detail__error" role="alert">{{ actionError }}</p>
      <p v-if="!spectating && myStatus === 'ABANDONED'" class="campaign-detail__hint">
        Abandoned. Starting again resets progress.
      </p>

      <button v-if="canManage" type="button" class="campaign-detail__manage" @click="emit('manage')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Edit campaign
      </button>
    </div>

    <section class="campaign-detail__progress" :class="{ 'campaign-detail__progress--spectating': spectating }"
      :aria-label="spectating ? `${spectateName}'s progression` : 'Your progression'">
      <h2 v-if="spectating" class="campaign-detail__progress-subject">{{ spectateName }}'s run</h2>

      <SkeletonLoader v-if="spectating && spectateLoading" variant="stat-block" />
      <p v-else-if="spectating && spectateError" class="campaign-detail__error" role="alert">
        {{ spectateError }}
      </p>
      <template v-else>
        <div class="campaign-detail__progress-row">
          <span class="campaign-detail__progress-label">Cleared</span>
          <span class="campaign-detail__progress-count">
            <span class="campaign-detail__progress-num">{{ completed }}</span>
            <span class="campaign-detail__progress-sep">of</span>
            <span class="campaign-detail__progress-total">{{ total }}</span>
          </span>
        </div>
        <div class="campaign-detail__progress-track" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100"
          role="progressbar">
          <div class="campaign-detail__progress-fill"
            :style="{ transform: `scaleX(${pct / 100})`, background: accent }" />
        </div>
        <div class="campaign-detail__progress-foot">
          <span>{{ pct }}% complete</span>
          <span v-if="!spectating" class="campaign-detail__xp-note">
            <CampaignRewardNotice v-if="campaign.completionXp > 0" :curated="curated" />
            +{{ campaign.completionXp.toLocaleString() }} XP on finish
          </span>
          <span v-else>{{ statusLabel }}</span>
        </div>
        <p v-if="spectating && (startedAt || milestone)" class="campaign-detail__progress-meta">
          <span v-if="startedAt">Started {{ startedAt }}</span>
          <span v-if="milestone">Furthest: {{ milestone }}</span>
        </p>
      </template>
    </section>

    <section v-if="campaign.description" class="campaign-detail__brief">
      <button type="button" class="campaign-detail__brief-toggle" :aria-expanded="briefingOpen"
        @click="briefingOpen = !briefingOpen">
        <span class="campaign-detail__section-label">Briefing</span>
        <svg class="campaign-detail__brief-chevron" :class="{ 'campaign-detail__brief-chevron--open': briefingOpen }"
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <MarkdownText v-if="briefingOpen" :content="campaign.description" />
    </section>

    <section v-if="campaign.curatorNotes" class="campaign-detail__brief">
      <h2 class="campaign-detail__section-label">From the curator</h2>
      <p class="campaign-detail__notes">{{ campaign.curatorNotes }}</p>
    </section>

    <CampaignAwards v-if="campaign.completionItems.length > 0" heading="h2" label="Completion rewards"
      :items="campaign.completionItems" :curated="curated" />
  </aside>
</template>

<style scoped>
.campaign-detail__rail {
  grid-row: 1;
  grid-column: 1;
  align-self: start;
  max-height: calc(100vh - var(--navbar-height) - var(--space-md) * 2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}

.campaign-detail__rail::-webkit-scrollbar {
  width: 4px;
}

.campaign-detail__rail::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.campaign-detail__title-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.campaign-detail__title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.15;
  letter-spacing: -0.005em;
}

.campaign-detail__byline {
  margin: 6px 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.campaign-detail__creator-name {
  color: var(--text-secondary);
  font-weight: 500;
}

.campaign-detail__badge-row {
  margin: 8px 0 0;
}

.campaign-detail__taxonomy,
.campaign-detail__traits {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  line-height: 1.5;
}

.campaign-detail__taxonomy {
  margin: 10px 0 0;
}

.campaign-detail__traits {
  margin: 3px 0 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-tertiary);
}

.campaign-detail__taxonomy :deep(.campaign-tag) {
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.campaign-detail__trait {
  white-space: nowrap;
}

.campaign-detail__taxonomy :deep(.campaign-tag + .campaign-tag)::before,
.campaign-detail__trait + .campaign-detail__trait::before {
  content: '·';
  margin: 0 6px;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--text-tertiary);
}

.campaign-detail__difficulty--fade {
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.campaign-detail__mode {
  margin: 10px 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--text-primary);
  line-height: 1.5;
}

.campaign-detail__summary {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.55;
}

.campaign-detail__vote {
  align-self: flex-start;
}

.campaign-detail__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: flex-start;
}

.campaign-detail__actions > * {
  width: 100%;
}

.campaign-detail__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.4;
}

.campaign-detail__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
  border-radius: var(--radius-card);
}

.campaign-detail__manage {
  width: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 0;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.campaign-detail__manage:hover {
  color: var(--text-primary);
}

.campaign-detail__error {
  margin: 0;
  padding: 8px 12px;
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
  border-radius: var(--radius-card);
}

.campaign-detail__progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campaign-detail__progress--spectating {
  padding: var(--space-sm) var(--space-sm) 10px;
  border: 1px solid color-mix(in srgb, var(--page-accent) 40%, var(--bg-overlay));
  border-radius: var(--radius-card);
}

.campaign-detail__progress-subject {
  margin: 0 0 2px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.campaign-detail__progress-meta {
  display: flex;
  flex-wrap: wrap;
  margin: 2px 0 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.campaign-detail__progress-meta span + span::before {
  content: '·';
  margin: 0 6px;
  color: var(--text-tertiary);
}

.campaign-detail__progress-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.campaign-detail__progress-label,
.campaign-detail__section-label {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-detail__section-label {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.campaign-detail__progress-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.campaign-detail__progress-num {
  font-size: 1.5rem;
  font-weight: 500;
}

.campaign-detail__progress-sep {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.campaign-detail__progress-total {
  font-size: 0.9375rem;
  color: var(--text-secondary);
}

.campaign-detail__progress-track {
  position: relative;
  height: 3px;
  background: var(--bg-overlay);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.campaign-detail__progress-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transition: transform 320ms cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform;
}

.campaign-detail__progress-foot {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

.campaign-detail__xp-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.campaign-detail__brief {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campaign-detail__brief-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  text-align: left;
  transition: color 120ms ease;
}

.campaign-detail__brief-toggle:hover {
  color: var(--text-secondary);
}

.campaign-detail__brief-chevron {
  transition: transform 160ms ease;
}

.campaign-detail__brief-chevron--open {
  transform: rotate(180deg);
}

.campaign-detail__notes {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.55;
}

@media (max-width: 860px) {
  .campaign-detail__rail {
    max-height: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .campaign-detail__progress-fill {
    transition: none;
  }
}
</style>
