<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import CampaignRewardItem from '@/components/domain/CampaignRewardItem.vue'
import { computed } from 'vue'
import CampaignEditorNote from '../CampaignEditorNote.vue'
import CampaignIssueNotes from '../CampaignIssueNotes.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  EDITING: 'Editing',
  CURATED: 'Curated',
}

const STATUS_MEANING: Record<string, string> = {
  DRAFT: 'Hidden. Players cannot start it.',
  PUBLISHED: 'Playable. No XP or items until curated.',
  EDITING: 'Reopened for changes. Progress is kept.',
  CURATED: 'Live with rewards. Edits apply right away.',
}

const CREATOR_STATUS_MEANING: Record<string, string> = {
  DRAFT: 'Only you can see it.',
  PUBLISHED: 'Playable and waiting on curators. Unpublish to edit.',
  EDITING: 'A curator is reviewing it. Unpublish to edit.',
  CURATED: 'Curated and locked. Ask a curator for changes.',
}

const { doc, access, lifecycle, trays, campaignAudit, publishBlockers } =
  useCampaignEditorContext()
const { campaign, isUnsavedDraft, actionPending } = doc
const { isCurationRoute, isAdmin, isCurator, isCreator, isDraftStatus, curatable } = access
const { editingLiveCampaign } = access
const { publishBlocked, doPlayerPublish, deleteDraft, doPlayerUnpublish } = lifecycle
const { doPublish, doReopen, doCurate, doUncurate, doToggleLoved, doToggleOfficial } = lifecycle
const { doDeactivate } = lifecycle
const { handleSelect } = trays

const statusMeaning = computed(() => {
  const status = campaign.value?.status
  if (!status) return ''
  const creatorText = !isCurationRoute && isCreator.value ? CREATOR_STATUS_MEANING[status] : null
  return creatorText || STATUS_MEANING[status]
})
</script>

<template>
  <header v-if="!isUnsavedDraft && campaign" class="campaign-editor__status">
    <p class="campaign-editor__status-meaning">
      <strong :class="`campaign-editor__status-name--${campaign.status.toLowerCase()}`">
        {{ STATUS_LABEL[campaign.status] }}
      </strong>
      {{ statusMeaning }}
    </p>

    <section v-if="publishBlocked" class="campaign-editor__blockers">
      <h3 class="field-label">Before Publishing</h3>
      <CampaignIssueNotes :issues="publishBlockers" tone="error" @select="handleSelect" />
    </section>

    <div class="campaign-editor__status-actions">
      <template v-if="!isCurationRoute && isCreator">
        <template v-if="isDraftStatus">
          <BaseButton
            size="sm"
            variant="primary"
            :disabled="publishBlocked"
            :loading="actionPending"
            @click="doPlayerPublish"
          >
            Publish
          </BaseButton>
          <BaseButton size="sm" variant="destructive" :loading="actionPending" @click="deleteDraft">
            Delete Draft
          </BaseButton>
        </template>
        <BaseButton
          v-else-if="campaign.status === 'PUBLISHED' || campaign.status === 'EDITING'"
          size="sm"
          variant="primary"
          :loading="actionPending"
          @click="doPlayerUnpublish"
        >
          Unpublish to Edit
        </BaseButton>
      </template>

      <template v-if="isCurationRoute">
        <BaseButton
          v-if="isCurator && (isDraftStatus || campaign.status === 'EDITING')"
          size="sm"
          :disabled="publishBlocked"
          :loading="actionPending"
          @click="doPublish"
        >
          Publish
        </BaseButton>
        <BaseButton
          v-if="isCurator && (campaign.status === 'PUBLISHED' || campaign.status === 'CURATED')"
          size="sm"
          :loading="actionPending"
          @click="doReopen"
        >
          Reopen for Editing
        </BaseButton>
        <BaseButton
          v-if="isCurator && curatable"
          size="sm"
          variant="primary"
          :disabled="publishBlocked"
          :loading="actionPending"
          @click="doCurate"
        >
          Curate
        </BaseButton>
        <BaseButton
          v-if="isCurator && campaign.status === 'CURATED'"
          size="sm"
          :loading="actionPending"
          @click="doUncurate"
        >
          Uncurate
        </BaseButton>
        <BaseButton
          v-if="isCurator && !isDraftStatus"
          size="sm"
          :loading="actionPending"
          @click="doToggleLoved"
        >
          {{ campaign.loved ? 'Remove Loved' : 'Mark Loved' }}
        </BaseButton>
        <BaseButton v-if="isAdmin" size="sm" :loading="actionPending" @click="doToggleOfficial">
          {{ campaign.official ? 'Remove Official' : 'Make Official' }}
        </BaseButton>
        <BaseButton
          v-if="isAdmin"
          size="sm"
          variant="destructive"
          :loading="actionPending"
          @click="doDeactivate"
        >
          Deactivate
        </BaseButton>
      </template>
    </div>

    <CampaignEditorNote v-if="editingLiveCampaign">
      Live campaign. Edits apply right away.
    </CampaignEditorNote>

    <section
      v-if="campaignAudit.paysOut || campaignAudit.issues.length > 0"
      class="campaign-editor__audit"
    >
      <template v-if="campaignAudit.paysOut">
        <h3 class="field-label">Payout</h3>

        <dl class="campaign-editor__audit-stats">
          <div>
            <dt>Nodes</dt>
            <dd>{{ campaignAudit.nodeCount }}</dd>
          </div>
          <div>
            <dt>Milestones</dt>
            <dd>{{ campaignAudit.milestoneCount }}</dd>
          </div>
          <div>
            <dt>Barriers</dt>
            <dd>{{ campaignAudit.barrierCount }}</dd>
          </div>
          <div>
            <dt>Avg XP / Node</dt>
            <dd>{{ campaignAudit.avgXpPerNode.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Node XP Range</dt>
            <dd>
              {{ campaignAudit.minNodeXp.toLocaleString() }} -
              {{ campaignAudit.maxNodeXp.toLocaleString() }}
            </dd>
          </div>
          <div>
            <dt>Total XP</dt>
            <dd
              :class="{
                'campaign-editor__audit-over': campaignAudit.totalXp > campaignAudit.xpBudget,
              }"
              :title="`Recommended at most ${campaignAudit.xpBudget.toLocaleString()} XP for ${campaignAudit.nodeCount} nodes`"
            >
              {{ campaignAudit.totalXp.toLocaleString() }}
              <small>/ {{ campaignAudit.xpBudget.toLocaleString() }}</small>
            </dd>
          </div>
          <div>
            <dt>Item Awards</dt>
            <dd
              :class="{
                'campaign-editor__audit-over':
                  campaignAudit.rewardCount > campaignAudit.rewardBudget,
              }"
              :title="`Recommended at most ${campaignAudit.rewardBudget} item awards for ${campaignAudit.nodeCount} nodes`"
            >
              {{ campaignAudit.rewardCount }}
              <small>/ {{ campaignAudit.rewardBudget }}</small>
            </dd>
          </div>
        </dl>

        <p
          v-if="campaignAudit.barrierXp || campaignAudit.completionXp"
          class="campaign-editor__hint"
        >
          Nodes {{ campaignAudit.nodeXp.toLocaleString() }} · Barriers
          {{ campaignAudit.barrierXp.toLocaleString() }} · Completion
          {{ campaignAudit.completionXp.toLocaleString() }}
        </p>

        <ul v-if="campaignAudit.rewards.length > 0" class="campaign-editor__reward-list">
          <li
            v-for="reward in campaignAudit.rewards"
            :key="reward.itemId"
            class="campaign-editor__reward"
          >
            <CampaignRewardItem :name="reward.itemName" :quantity="reward.quantity" :item="reward.item" />
          </li>
        </ul>
      </template>

      <CampaignIssueNotes :issues="campaignAudit.issues" @select="handleSelect" />
    </section>
  </header>

  <p v-else class="campaign-editor__status-meaning">New draft. Saves on your first edit.</p>
</template>

<style scoped>
.campaign-editor__status {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaign-editor__status-name--draft {
  color: var(--text-primary);
}

.campaign-editor__status-name--published {
  color: var(--info);
}

.campaign-editor__status-name--editing {
  color: var(--warning);
}

.campaign-editor__status-name--curated {
  color: var(--success);
}

.campaign-editor__status-meaning {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.5;
}

.campaign-editor__status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.campaign-editor__status-actions > * {
  flex: 1 1 auto;
}

.campaign-editor__blockers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campaign-editor__status h3 {
  margin: 0;
}

.campaign-editor__audit {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
}

.campaign-editor__audit-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px var(--space-sm);
  margin: 0;
}

.campaign-editor__audit-stats dt {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.campaign-editor__audit-stats dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.campaign-editor__audit-stats dd small {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.campaign-editor__audit-over,
.campaign-editor__audit-over small {
  color: var(--warning);
}
</style>
