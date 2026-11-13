<script setup lang="ts">
import { getPlaylistExportUrl } from '@/api/campaigns'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import CampaignCategoryTags from '@/components/domain/CampaignCategoryTags.vue'
import CampaignCurationCredits from '@/views/campaign/CampaignCurationCredits.vue'
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
  <aside class="campaign-detail__rail" aria-label="Campaign overview">
    <div class="campaign-detail__part">
      <header class="campaign-detail__title-block">
        <router-link class="caption campaign-detail__back" :to="{ name: 'campaigns' }">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 6 9 12 15 18" />
          </svg>
          Campaigns
        </router-link>
        <h1 class="campaign-detail__title">{{ campaign.name }}</h1>
        <p class="caption">by {{ campaign.creatorAlias || campaign.creatorName || 'AccSaber' }}</p>
        <CampaignStatusBadge v-if="hasBadges" :campaign="campaign" />
        <CampaignCurationCredits :campaign="campaign" />
        <p v-if="hasCategoryTags" class="campaign-detail__traits">
          <CampaignCategoryTags :tags="campaign.tags" />
        </p>
        <p v-if="difficultyLabel || themeTags.length" class="campaign-detail__traits caption">
          <span v-if="difficultyLabel" class="campaign-detail__difficulty"
            :class="{ 'campaign-detail__difficulty--fade': difficultyGradient }"
            :style="difficultyStyle">{{ difficultyLabel }}</span>
          <span v-for="tag in themeTags" :key="tag.id">{{ tag.name }}</span>
        </p>
      </header>

      <p class="campaign-detail__mode">{{ modeSentence }}</p>
      <p v-if="campaign.summary" class="campaign-detail__summary">{{ campaign.summary }}</p>

      <CampaignVoteControl class="campaign-detail__vote" :campaign="campaign" size="md" />

      <div class="campaign-detail__actions">
        <template v-if="spectating" />
        <BaseButton v-else-if="!loggedIn" variant="primary" @click="emit('login')">
          Log in to begin
        </BaseButton>
        <BaseButton v-else-if="myStatus === 'IN_PROGRESS'" :loading="abandoning" @click="emit('abandon')">
          Abandon Campaign
        </BaseButton>
        <span v-else-if="myStatus === 'COMPLETED'" class="campaign-detail__status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Completed, +{{ campaign.completionXp.toLocaleString() }} XP earned
        </span>
        <BaseButton v-else variant="primary" :loading="starting" @click="emit('start')">
          Begin Campaign
        </BaseButton>

        <BaseButton v-if="campaign.playlistExportEnabled" :href="playlistUrl"
          aria-label="Download Beat Saber playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Playlist
        </BaseButton>

        <BaseButton v-if="canManage" @click="emit('manage')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit Campaign
        </BaseButton>

        <p v-if="actionError" class="caption campaign-detail__error" role="alert">{{ actionError }}</p>
        <p v-if="!spectating && myStatus === 'ABANDONED'" class="caption">
          Abandoned. Starting again resets progress.
        </p>
      </div>
    </div>

    <div class="campaign-detail__part campaign-detail__part--rest">
      <section class="campaign-detail__progress" :class="{ refreshing: spectateLoading }"
        :aria-label="spectating ? `${spectateName}'s progression` : 'Your progression'">
        <h2 v-if="spectating" class="card-title">{{ spectateName }}'s run</h2>

        <p v-if="spectating && spectateError" class="caption campaign-detail__error" role="alert">
          {{ spectateError }}
        </p>
        <template v-else>
          <StatBlock class="campaign-detail__cleared" :label="`Cleared of ${total}`" :value="completed" :decimals="0">
            <div class="campaign-detail__bar">
              <ProgressBar :value="total > 0 ? completed / total : 0" />
            </div>
          </StatBlock>
          <p class="caption campaign-detail__progress-foot">
            <template v-if="spectating">
              <span>{{ statusLabel }}</span>
              <span v-if="startedAt">Started {{ startedAt }}</span>
              <span v-if="milestone">Furthest: {{ milestone }}</span>
            </template>
            <template v-else-if="campaign.completionXp > 0">
              <span>+{{ campaign.completionXp.toLocaleString() }} XP on finish</span>
              <CampaignRewardNotice v-if="campaign.completionItems.length === 0" :curated="curated" />
            </template>
          </p>
        </template>
      </section>

      <section v-if="campaign.description" class="campaign-detail__brief">
        <button type="button" class="campaign-detail__brief-toggle field-label" :aria-expanded="briefingOpen"
          @click="briefingOpen = !briefingOpen">
          Briefing
          <svg class="campaign-detail__brief-chevron" :class="{ 'campaign-detail__brief-chevron--open': briefingOpen }"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <Transition name="collapse">
          <div v-if="briefingOpen" class="collapsible">
            <MarkdownText :content="campaign.description" />
          </div>
        </Transition>
      </section>

      <section v-if="campaign.curatorNotes" class="campaign-detail__brief">
        <h2 class="field-label">From the Curator</h2>
        <p class="caption">{{ campaign.curatorNotes }}</p>
      </section>

      <CampaignAwards v-if="campaign.completionItems.length > 0" heading="h2" label="Completion Rewards"
        :items="campaign.completionItems" :curated="curated" />
    </div>
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
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}

.campaign-detail__part {
  display: contents;
}

.campaign-detail__title-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
}

.campaign-detail__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.campaign-detail__back:hover {
  color: var(--text-primary);
}

.campaign-detail__title {
  font-size: var(--text-page-title);
  line-height: 1.15;
  text-wrap: balance;
}

.campaign-detail__traits {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-sm);
  margin: 0;
  line-height: 1.5;
}

.campaign-detail__difficulty {
  font-weight: 600;
}

.campaign-detail__difficulty--fade {
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.campaign-detail__mode,
.campaign-detail__summary {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-primary);
}

.campaign-detail__summary {
  margin-top: calc(-1 * var(--space-sm));
  color: var(--text-secondary);
}

.campaign-detail__vote {
  align-self: flex-start;
}

.campaign-detail__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaign-detail__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--control-h);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--success);
}

.campaign-detail__error {
  color: var(--error);
}

.campaign-detail__progress {
  transition: opacity var(--dur-fast) var(--ease-out);
}

.campaign-detail__progress,
.campaign-detail__brief {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaign-detail__cleared {
  padding: 0;
}

.campaign-detail__bar {
  display: flex;
}

.campaign-detail__progress-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0 var(--space-sm);
}

.campaign-detail__brief h2 {
  margin: 0;
}

.campaign-detail__brief-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--control-h);
  padding: 0 var(--space-sm);
  font-family: inherit;
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}

.campaign-detail__brief-toggle:hover {
  color: var(--text-primary);
}

.campaign-detail__brief-chevron {
  transition: transform var(--dur-fast) var(--ease-out);
}

.campaign-detail__brief-chevron--open {
  transform: rotate(180deg);
}

@media (max-width: 860px) {
  .campaign-detail__rail {
    display: contents;
  }

  .campaign-detail__part {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-top: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-surface);
    border-radius: var(--radius-card);
    animation: settle-in var(--dur-enter) var(--ease-out) backwards;
  }

  .campaign-detail__part--rest {
    order: 3;
    margin-bottom: var(--space-md);
  }
}
</style>
