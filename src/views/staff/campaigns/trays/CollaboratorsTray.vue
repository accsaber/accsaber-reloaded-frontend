<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import UserChip from '@/components/domain/UserChip.vue'
import CampaignTrayIcon from '../CampaignTrayIcon.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { doc, access, collaborators } = useCampaignEditorContext()
const { campaign, actionPending } = doc
const { isCreator } = access
const { isCollaborator, activeCollaborators, collaboratorsLoading, canInviteMore } = collaborators
const { collaboratorLimit, openCollaboratorPicker, removeCollaborator, leaveCampaign } =
  collaborators
</script>

<template>
  <fieldset v-if="campaign" class="campaign-editor__section">
    <div class="campaign-editor__collab-owner">
      <span class="campaign-editor__collab-owner-tag">Owner</span>
      <span class="campaign-editor__collab-owner-name">{{
        campaign.creatorAlias || campaign.creatorName || 'You'
      }}</span>
    </div>

    <div
      v-if="collaboratorsLoading && activeCollaborators.length === 0"
      class="campaign-editor__collab-skeletons"
    >
      <SkeletonLoader v-for="i in 2" :key="i" variant="table-row" />
    </div>

    <ul v-else-if="activeCollaborators.length > 0" class="campaign-editor__collab-list">
      <li v-for="c in activeCollaborators" :key="c.id" class="campaign-editor__collab">
        <UserChip :user="c.user" size="sm" class="campaign-editor__collab-player" />
        <span
          class="campaign-editor__collab-status"
          :class="`campaign-editor__collab-status--${c.status.toLowerCase()}`"
        >
          {{ c.status === 'PENDING' ? 'Invited' : 'Collaborator' }}
        </span>
        <button
          v-if="isCreator"
          type="button"
          class="campaign-editor__reward-remove"
          :aria-label="`Remove ${c.user.name}`"
          @click="removeCollaborator(c.user.id)"
        >
          <CampaignTrayIcon name="x" :size="12" />
        </button>
      </li>
    </ul>

    <p v-else-if="isCreator" class="campaign-editor__hint">No collaborators</p>
    <p v-else class="campaign-editor__hint">You are a collaborator.</p>

    <button
      v-if="isCreator && canInviteMore"
      type="button"
      class="campaign-editor__add-reward"
      @click="openCollaboratorPicker"
    >
      <CampaignTrayIcon name="plus" :size="12" />
      Invite collaborator
    </button>
    <p v-else-if="isCreator" class="campaign-editor__hint">
      Limit of {{ collaboratorLimit }} reached.
    </p>

    <BaseButton
      v-if="isCollaborator"
      size="sm"
      variant="destructive"
      :loading="actionPending"
      @click="leaveCampaign"
    >
      Leave campaign
    </BaseButton>
  </fieldset>
</template>


<style scoped>
.campaign-editor__collab-owner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 10px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.campaign-editor__collab-owner-tag {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-editor__collab-owner-name {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-editor__collab-skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-editor__collab-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.campaign-editor__collab {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-sm);
  align-items: center;
  padding: 6px var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.campaign-editor__collab-player {
  font-size: var(--text-caption);
}

.campaign-editor__collab-status {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.campaign-editor__collab-status--pending {
  color: var(--warning);
}

.campaign-editor__collab-status--accepted {
  color: var(--page-accent);
}
</style>
