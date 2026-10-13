<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import CampaignRewardItem from '@/components/domain/CampaignRewardItem.vue'
import UserChip from '@/components/domain/UserChip.vue'
import CampaignBackgroundPlacer from './CampaignBackgroundPlacer.vue'
import CampaignBoundsField from './CampaignBoundsField.vue'
import CampaignColorField from './CampaignColorField.vue'
import CampaignRewardsEditor from './CampaignRewardsEditor.vue'
import CampaignEditorNote from './CampaignEditorNote.vue'
import CampaignEditorTile from './CampaignEditorTile.vue'
import CampaignEditorToggle from './CampaignEditorToggle.vue'
import CampaignFieldHint from './CampaignFieldHint.vue'
import CampaignIssueNotes from './CampaignIssueNotes.vue'
import CampaignTrayIcon from './CampaignTrayIcon.vue'
import CampaignTargetRow from './CampaignTargetRow.vue'
import CampaignShapeGlyph from './CampaignShapeGlyph.vue'
import CampaignLabelPositionPicker from './CampaignLabelPositionPicker.vue'
import { useCampaignEditorContext } from './campaignEditorContext'
import { cssToken, resolveSize } from '@/utils/campaignLayout'
import { toCollaboratorUserRef } from '@/utils/mappers'
import type { CampaignTargetMode } from '@/types/enums'
import { computed, ref } from 'vue'

const fontOptions = [
  { value: '', label: 'Default' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'mono', label: 'Monospace' },
  { value: 'serif', label: 'Serif' },
]

const {
  campaign,
  activeTray,
  isUnsavedDraft,
  isDraftStatus,
  curatable,
  isCurationRoute,
  isAdmin,
  isCurator,
  isCreator,
  editingLiveCampaign,
  statusLabel,
  statusMeaning,
  creatorStatusMeaning,
  actionPending,
  editable,
  formMeta,
  fieldErrors,
  commitMetaField,
  setMetaFlag,
  commitBackgroundColor,
  resetBackgroundColor,
  completionModeOptions,
  onCompletionModeChange,
  uploadBackground,
  removeBackground,
  canvasFrame,
  uploadIcon,
  removeIcon,
  commitBackgroundPlacement,
  gridLock,
  removeCompletionItem,
  openCampaignItemPicker,
  tagsByKind,
  campaignTagIds,
  toggleTag,
  doPlayerPublish,
  deleteDraft,
  isCollaborator,
  activeCollaborators,
  collaboratorsLoading,
  canInviteMore,
  collaboratorLimit,
  openCollaboratorPicker,
  removeCollaborator,
  leaveCampaign,
  doPlayerUnpublish,
  doPublish,
  doReopen,
  doCurate,
  doUncurate,
  doToggleLoved,
  doToggleOfficial,
  doDeactivate,
  selectedDifficulty,
  selectedNodeApRankBlocked,
  apRankBlockedNodeIds,
  openRepoint,
  refreshNodeVersion,
  formNode,
  requirementTypeOptions,
  targetRows,
  formTargetMode,
  canAddTarget,
  addTarget,
  removeTarget,
  moveTarget,
  setTargetMode,
  setTargetType,
  setTargetBound,
  reorderTargets,
  commitTargets,
  campaignAudit,
  publishBlockers,
  publishBlocked,
  terminalNodeIds,
  isTerminalNode,
  lockedLastTerminal,
  setNodeTerminal,
  completionModeBlocked,
  handleSelect,
  modifierOptions,
  nodeModifierById,
  cycleNodeModifier,
  commitNodeField,
  uploadCheckpointAvatar,
  removeCheckpointAvatar,
  uploadNodeBorder,
  removeNodeBorder,
  selectNodeBorderLayer,
  isMilestone,
  setMilestone,
  commitMilestoneLabel,
  defaultColorHex,
  resetNodeColor,
  shapeTiles,
  sizeTiles,
  selectBorderShape,
  selectNodeLabelPosition,
  selectNodeSize,
  selectedCount,
  applyBulkSize,
  applyBulkShape,
  removeSelectedNodes,
  setPrereqMode,
  removeNodeItem,
  openNodeItemPicker,
  canAddNodeReward,
  nodeRewardLimit,
  hasBarriers,
  selectedBarrier,
  formBarrier,
  barrierConditionOptions,
  barrierMeta,
  barrierLowerDisplay,
  barrierUpperDisplay,
  setBarrierBound,
  commitBarrierBounds,
  barrierValueBounds,
  onBarrierConditionTypeChange,
  commitBarrierField,
  affectedPickMode,
  toggleAffectedPickMode,
  toggleAffected,
  setBarrierPrereqMode,
  resetBarrierColor,
  selectBarrierLabelPosition,
  canAddBarrierReward,
  openBarrierItemPicker,
  removeBarrierItem,
  selectedText,
  formText,
  commitTextField,
  onTextContentInput,
  textEffects,
  textEffectActive,
  toggleTextEffect,
  selectedEdge,
  formConnection,
  connectionColorError,
  commitConnectionColor,
  resetConnectionColor,
} = useCampaignEditorContext()

const affectedNodeList = computed(() => {
  const b = selectedBarrier.value
  const c = campaign.value
  if (!b || !c) return []
  const byId = new Map(c.difficulties.map((d) => [d.id, d]))
  return b.affectedCampaignDifficultyIds.map((id) => ({
    id,
    name: byId.get(id)?.songName ?? 'Unknown node',
  }))
})

const requirementOptions = computed(() =>
  selectedNodeApRankBlocked.value
    ? requirementTypeOptions.filter((o) => o.value !== 'AP' && o.value !== 'RANK')
    : requirementTypeOptions,
)

const MODIFIER_STATE_WORD: Record<string, string> = {
  REQUIRED: 'required',
  FORBIDDEN: 'forbidden',
}

const modifierChips = computed(() =>
  modifierOptions.value.map((m) => {
    const state = nodeModifierById.value.get(m.id) ?? null
    return {
      id: m.id,
      code: m.code,
      state,
      label: `${m.name}: ${state ? MODIFIER_STATE_WORD[state] : 'not constrained'}`,
    }
  }),
)

const otherEndings = computed(() => {
  const ids = terminalNodeIds.value
  const selfId = selectedDifficulty.value?.id
  return selfId && ids.has(selfId) ? ids.size - 1 : ids.size
})

const MARKDOWN_HINT = 'Markdown supported.'

const TARGET_MODES: Array<{ value: CampaignTargetMode; label: string }> = [
  { value: 'AND', label: 'All of' },
  { value: 'OR', label: 'Any of' },
]

const isMultiTarget = computed(() => targetRows.value.length > 1)

const beatLeaderOnlyNote = computed(() => {
  const types = new Set(targetRows.value.map((r) => r.requirementType))
  const subjects: string[] = []
  if (types.has('BOMB_HITS')) subjects.push('Bomb')
  if (types.has('PAUSES')) subjects.push('Pause')
  if (!subjects.length) return ''
  return `${subjects.join(' and ')} counts are BeatLeader only.`
})

const dragTargetIndex = ref<number | null>(null)

function onTargetDragEnter(index: number) {
  const from = dragTargetIndex.value
  if (from === null || from === index) return
  if (reorderTargets(from, index)) dragTargetIndex.value = index
}

function onTargetDrop() {
  if (dragTargetIndex.value === null) return
  dragTargetIndex.value = null
  commitTargets()
}

const barrierConditionHint = computed(() => {
  const meta = barrierMeta.value
  if (meta.noValue) {
    const verb = formBarrier.value.conditionType === 'PASS' ? 'passed without No-Fail' : 'full-comboed'
    return `Every affected node ${verb}.`
  }
  if (meta.metric === 'count') return `Out of ${affectedNodeList.value.length} affected nodes.`
  if (meta.metric === 'bombs') return 'Averaged. Use the upper bound for "at most".'
  if (meta.metric === 'mistakes') {
    return 'Bad cuts plus misses, averaged. Use the upper bound for "at most".'
  }
  if (meta.metric === 'pauses') {
    return 'Averaged, BeatLeader only. Use the upper bound for "at most".'
  }
  if (meta.lowerBetter) return `Lower is better (${meta.agg}).`
  return `${meta.agg} across affected nodes.`
})

const AP_RANK_BARRIER_TYPES = ['AVERAGE_AP', 'AP_MAX', 'AVERAGE_RANK', 'MAX_RANK']

const barrierAffectsApRankBlocked = computed(() => {
  const b = selectedBarrier.value
  if (!b) return false
  return b.affectedCampaignDifficultyIds.some((id) => apRankBlockedNodeIds.value.has(id))
})

const barrierConditionOptionsFiltered = computed(() =>
  barrierAffectsApRankBlocked.value
    ? barrierConditionOptions.filter((o) => !AP_RANK_BARRIER_TYPES.includes(o.value))
    : barrierConditionOptions,
)

const defaultBarrierColor = computed(() => cssToken('--warning'))

function resetTextColor() {
  formText.value.color = ''
  commitTextField('color')
}
</script>

<template>
  <template v-if="activeTray === 'status'">
    <header v-if="!isUnsavedDraft && campaign" class="campaign-editor__status">
      <div class="campaign-editor__status-row">
        <span
          class="campaign-editor__status-pill"
          :class="`campaign-editor__status-pill--${campaign.status.toLowerCase()}`"
        >
          {{ statusLabel[campaign.status] }}
        </span>
      </div>
      <p class="campaign-editor__status-meaning">
        {{
          (!isCurationRoute && isCreator && creatorStatusMeaning) || statusMeaning[campaign.status]
        }}
      </p>

      <section v-if="publishBlocked" class="campaign-editor__blockers">
        <h3 class="campaign-editor__blockers-title">Before publishing</h3>
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
            <BaseButton
              size="sm"
              variant="destructive"
              :loading="actionPending"
              @click="deleteDraft"
            >
              Delete draft
            </BaseButton>
          </template>
          <BaseButton
            v-else-if="campaign.status === 'PUBLISHED' || campaign.status === 'EDITING'"
            size="sm"
            variant="primary"
            :loading="actionPending"
            @click="doPlayerUnpublish"
          >
            Unpublish to edit
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
            Reopen for editing
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
            {{ campaign.loved ? 'Remove loved' : 'Mark loved' }}
          </BaseButton>
          <BaseButton v-if="isAdmin" size="sm" :loading="actionPending" @click="doToggleOfficial">
            {{ campaign.official ? 'Remove official' : 'Make official' }}
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
        Live campaign. Edits apply right away. Changed requirements re-settle completions.
      </CampaignEditorNote>

      <section
        v-if="campaignAudit.paysOut || campaignAudit.issues.length > 0"
        class="campaign-editor__audit"
      >
        <template v-if="campaignAudit.paysOut">
          <h3 class="campaign-editor__audit-title">Payout</h3>

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
              <dt>Avg XP / node</dt>
              <dd>{{ campaignAudit.avgXpPerNode.toLocaleString() }}</dd>
            </div>
            <div>
              <dt>Node XP range</dt>
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
              <dt>Item awards</dt>
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
              <CampaignRewardItem
                :name="reward.itemName"
                :quantity="reward.quantity"
                :item="reward.item"
              />
            </li>
          </ul>
        </template>

        <CampaignIssueNotes :issues="campaignAudit.issues" @select="handleSelect" />
      </section>
    </header>

    <p v-else class="campaign-editor__status-meaning">New draft. Saves on your first edit.</p>
  </template>

  <fieldset
    v-else-if="activeTray === 'identity' && campaign"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <label class="campaign-editor__field">
      <span>Name</span>
      <input v-model="formMeta.name" type="text" @blur="commitMetaField('name')" />
    </label>
    <label class="campaign-editor__field">
      <span>Creator alias</span>
      <input
        v-model="formMeta.creatorAlias"
        type="text"
        :placeholder="campaign.creatorName ?? 'Creator name'"
        @blur="commitMetaField('creatorAlias')"
      />
    </label>
    <label class="campaign-editor__field">
      <span>Slug</span>
      <input
        v-model="formMeta.slug"
        type="text"
        placeholder="auto from name"
        @blur="commitMetaField('slug')"
      />
    </label>
    <label class="campaign-editor__field">
      <span>Summary</span>
      <input v-model="formMeta.summary" type="text" @blur="commitMetaField('summary')" />
    </label>
    <label class="campaign-editor__field">
      <span>Description <CampaignFieldHint :text="MARKDOWN_HINT" /></span>
      <textarea v-model="formMeta.description" rows="4" @blur="commitMetaField('description')" />
    </label>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'settings'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__field">
      <span>Completion mode</span>
      <BaseSelect
        :model-value="formMeta.completionMode"
        :options="completionModeOptions.map((o) => ({ value: o.value, label: o.label }))"
        @update:model-value="onCompletionModeChange"
      />
    </div>
    <CampaignEditorNote v-if="completionModeBlocked" tone="error">
      No node is flagged as an ending. Flag one first.
    </CampaignEditorNote>
    <CampaignEditorToggle
      :model-value="formMeta.progressionAgnostic"
      label="Progression agnostic"
      on-text="Nodes can be cleared in any order"
      off-text="Connections decide what unlocks next"
      :disabled="hasBarriers"
      @update:model-value="setMetaFlag('progressionAgnostic', $event)"
    />
    <p v-if="hasBarriers" class="campaign-editor__hint">Remove the barriers first.</p>
    <CampaignEditorToggle
      :model-value="formMeta.playlistExportEnabled"
      label="Playlist export"
      on-text="Players can download the campaign as a playlist"
      off-text="No playlist download"
      @update:model-value="setMetaFlag('playlistExportEnabled', $event)"
    />
    <CampaignColorField
      v-model="formMeta.backgroundColor"
      label="Background color"
      text
      placeholder="#f5b800 · gold · rgb(…)"
      :fallback="defaultColorHex"
      :error="fieldErrors.backgroundColor"
      @commit="commitBackgroundColor"
      @reset="resetBackgroundColor"
    />
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'images' && campaign"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__image-row">
      <ImageUploader
        label="Background"
        hint="16:9 hero"
        :image-url="campaign.backgroundUrl"
        :disabled="!editable"
        :upload-handler="uploadBackground"
        :remove-handler="removeBackground"
      />
      <ImageUploader
        label="Icon"
        hint="Square card image"
        aspect-ratio="1 / 1"
        :image-url="campaign.iconUrl"
        :disabled="!editable"
        :upload-handler="uploadIcon"
        :remove-handler="removeIcon"
      />
    </div>
    <div v-if="campaign.backgroundUrl" class="campaign-editor__field">
      <span>Background placement</span>
      <CampaignBackgroundPlacer
        :image-url="campaign.backgroundUrl"
        :placement="campaign.background"
        :frame="canvasFrame"
        :grid-lock="gridLock"
        :disabled="!editable"
        @commit="commitBackgroundPlacement"
      />
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'completion' && campaign"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignRewardsEditor
      v-model:xp="formMeta.completionXp"
      xp-label="Completion XP"
      :xp-max="50000"
      :xp-step="500"
      :items="campaign.completionItems"
      :editable="editable"
      :curated="campaign.status === 'CURATED'"
      @commit-xp="commitMetaField('completionXp')"
      @add="openCampaignItemPicker"
      @remove="removeCompletionItem"
    />
  </fieldset>

  <fieldset v-else-if="activeTray === 'collaborators' && campaign" class="campaign-editor__section">
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
        <UserChip :user="toCollaboratorUserRef(c)" size="sm" class="campaign-editor__collab-player" />
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
          :aria-label="`Remove ${c.userName}`"
          @click="removeCollaborator(c.userId)"
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

  <fieldset
    v-else-if="activeTray === 'tags'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div
      v-for="kind in ['CATEGORY', 'DIFFICULTY', 'THEME', 'GENRE']"
      :key="kind"
      class="campaign-editor__tag-group"
    >
      <span class="campaign-editor__tag-label">{{ kind.toLowerCase() }}</span>
      <div class="campaign-editor__tag-chips">
        <button
          v-for="t in tagsByKind.get(kind) ?? []"
          :key="t.id"
          type="button"
          class="campaign-editor__chip"
          :class="{ 'campaign-editor__chip--active': campaignTagIds.has(t.id) }"
          @click="toggleTag(t.id)"
        >
          {{ t.name }}
        </button>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'requirement'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div v-if="isMultiTarget" class="campaign-editor__field">
      <span>Clears when</span>
      <div
        class="campaign-editor__prereq-mode-toggle"
        role="radiogroup"
        aria-label="Objective mode"
      >
        <button
          v-for="mode in TARGET_MODES"
          :key="mode.value"
          type="button"
          role="radio"
          :aria-checked="formTargetMode === mode.value"
          class="campaign-editor__prereq-mode-btn"
          :class="{ 'campaign-editor__prereq-mode-btn--active': formTargetMode === mode.value }"
          @click="setTargetMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <ul class="campaign-editor__targets">
      <template v-for="row in targetRows" :key="row.key">
        <li
          v-if="row.index > 0"
          class="campaign-editor__target-join"
          :class="`campaign-editor__target-join--${formTargetMode.toLowerCase()}`"
          aria-hidden="true"
        >
          {{ formTargetMode }}
        </li>
        <CampaignTargetRow
          :row="row"
          :type-options="requirementOptions"
          :multi="isMultiTarget"
          :disabled="!editable"
          @type="setTargetType(row.index, $event)"
          @update:lower="setTargetBound(row.index, 'requirementValue', $event)"
          @update:upper="setTargetBound(row.index, 'requirementValueMax', $event)"
          @commit="commitTargets"
          @remove="removeTarget(row.index)"
          @move="moveTarget(row.index, row.index + $event)"
          @grab="dragTargetIndex = row.index"
          @enter="onTargetDragEnter(row.index)"
          @drop="onTargetDrop"
        />
      </template>
    </ul>

    <button
      v-if="canAddTarget"
      type="button"
      class="campaign-editor__add-reward"
      @click="addTarget"
    >
      <CampaignTrayIcon name="plus" :size="12" />
      Add objective
    </button>

    <p v-if="selectedNodeApRankBlocked" class="campaign-editor__hint">
      Unranked map. AP and rank goals are unavailable.
    </p>
    <CampaignEditorNote v-if="beatLeaderOnlyNote">
      {{ beatLeaderOnlyNote }}
    </CampaignEditorNote>

    <div class="campaign-editor__field">
      <span>
        Modifiers <small>(optional)</small>
        <CampaignFieldHint text="Click to cycle required, forbidden, unset." />
      </span>
      <div class="campaign-editor__tag-chips">
        <button
          v-for="m in modifierChips"
          :key="m.id"
          type="button"
          class="campaign-editor__mod"
          :class="{
            'campaign-editor__mod--required': m.state === 'REQUIRED',
            'campaign-editor__mod--forbidden': m.state === 'FORBIDDEN',
          }"
          :aria-label="m.label"
          :title="m.label"
          @click="cycleNodeModifier(m.id)"
        >
          {{ m.code }}
        </button>
      </div>
    </div>
    <label class="campaign-editor__field">
      <span>
        Description <small>(optional)</small>
        <CampaignFieldHint :text="MARKDOWN_HINT" />
      </span>
      <textarea v-model="formNode.description" rows="2" @blur="commitNodeField('description')" />
    </label>
    <div v-if="editable && selectedDifficulty" class="campaign-editor__field">
      <div class="campaign-editor__btn-row">
        <BaseButton
          v-if="selectedDifficulty.beatsaverCode"
          size="sm"
          :loading="actionPending"
          @click="refreshNodeVersion"
        >
          Refresh version
        </BaseButton>
        <BaseButton size="sm" @click="openRepoint(selectedDifficulty.id)">
          Change map / version
        </BaseButton>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'ending' && selectedDifficulty"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignEditorToggle
      :model-value="isTerminalNode"
      label="Finishes the campaign"
      on-text="Clearing this node ends the run"
      off-text="Just another stop on the path"
      @update:model-value="setNodeTerminal"
    >
      <template #glyph>
        <CampaignTrayIcon name="flag" :size="26" />
      </template>
    </CampaignEditorToggle>

    <p v-if="otherEndings > 0" class="campaign-editor__hint">
      {{ otherEndings === 1 ? 'One other ending' : `${otherEndings} other endings` }}
    </p>
    <CampaignEditorNote v-if="lockedLastTerminal">
      Only ending on a live campaign. Flag another first.
    </CampaignEditorNote>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'milestone'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignEditorToggle
      :model-value="isMilestone"
      label="Milestone"
      on-text="Shows as a landmark on the map"
      off-text="Plain node"
      @update:model-value="setMilestone"
    >
      <template #glyph>
        <CampaignTrayIcon name="award" :size="26" />
      </template>
    </CampaignEditorToggle>
    <template v-if="isMilestone">
      <label class="campaign-editor__field">
        <span>Label</span>
        <input
          v-model="formNode.checkpointLabel"
          type="text"
          placeholder="e.g. Rookie"
          @blur="commitMilestoneLabel()"
        />
      </label>
      <div class="campaign-editor__field">
        <span>Label position</span>
        <CampaignLabelPositionPicker
          :model-value="formNode.checkpointLabelPosition"
          @select="selectNodeLabelPosition"
        />
      </div>
      <div class="campaign-editor__avatar-upload">
        <ImageUploader
          label="Avatar"
          hint="Square, optional"
          aspect-ratio="1 / 1"
          :image-url="selectedDifficulty?.checkpointAvatarUrl || null"
          :disabled="!editable"
          :upload-handler="uploadCheckpointAvatar"
          :remove-handler="removeCheckpointAvatar"
        />
      </div>
      <div class="campaign-editor__field-row">
        <CampaignColorField
          v-model="formNode.checkpointColor"
          label="Band color"
          :fallback="defaultColorHex"
          @commit="commitNodeField('checkpointColor')"
          @reset="resetNodeColor('checkpointColor')"
        />
        <label class="campaign-editor__field">
          <span>Band size: {{ resolveSize(formNode.checkpointSize, 30) }}px</span>
          <input
            type="range"
            min="14"
            max="64"
            step="1"
            :value="resolveSize(formNode.checkpointSize, 30)"
            @input="formNode.checkpointSize = Number(($event.target as HTMLInputElement).value)"
            @change="commitNodeField('checkpointSize')"
          />
        </label>
      </div>
    </template>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'shape'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__field">
      <span>Border shape</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in shapeTiles"
          :key="t.label"
          :active="formNode.borderShape === t.value"
          :label="t.label"
          @select="selectBorderShape(t.value)"
        >
          <CampaignShapeGlyph :shape="t.value" />
        </CampaignEditorTile>
      </div>
    </div>
    <div class="campaign-editor__field">
      <span>Node size: {{ resolveSize(formNode.size, 48) }}px</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in sizeTiles"
          :key="t.value"
          :active="resolveSize(formNode.size, 48) === t.value"
          :label="`${t.label} (${t.value}px)`"
          @select="selectNodeSize(t.value)"
        >
          <CampaignShapeGlyph shape="hex" :radius="t.glyph" />
        </CampaignEditorTile>
      </div>
      <input
        type="range"
        min="24"
        max="96"
        step="1"
        :value="resolveSize(formNode.size, 48)"
        @input="formNode.size = Number(($event.target as HTMLInputElement).value)"
        @change="commitNodeField('size')"
      />
    </div>
    <CampaignColorField
      v-model="formNode.borderColor"
      label="Border color"
      :fallback="defaultColorHex"
      @commit="commitNodeField('borderColor')"
      @reset="resetNodeColor('borderColor')"
    />
    <div class="campaign-editor__avatar-upload">
      <ImageUploader
        label="Border art"
        hint="Frame or GIF"
        aspect-ratio="1 / 1"
        :image-url="selectedDifficulty?.nodeBorderUrl || null"
        :disabled="!editable"
        :upload-handler="uploadNodeBorder"
        :remove-handler="removeNodeBorder"
      />
    </div>
    <div v-if="selectedDifficulty?.nodeBorderUrl" class="campaign-editor__field">
      <span>Border layer</span>
      <div class="campaign-editor__prereq-mode-toggle" role="radiogroup" aria-label="Border layer">
        <button
          type="button"
          role="radio"
          :aria-checked="formNode.nodeBorderLayer !== 'BELOW'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': formNode.nodeBorderLayer !== 'BELOW',
          }"
          @click="selectNodeBorderLayer('ABOVE')"
        >
          over cover
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="formNode.nodeBorderLayer === 'BELOW'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': formNode.nodeBorderLayer === 'BELOW',
          }"
          @click="selectNodeBorderLayer('BELOW')"
        >
          behind cover
        </button>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'bulk'"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <p class="campaign-editor__hint">{{ selectedCount }} selected</p>
    <div class="campaign-editor__field">
      <span>Node size</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in sizeTiles"
          :key="t.value"
          :label="`${t.label} (${t.value}px)`"
          @select="applyBulkSize(t.value)"
        >
          <CampaignShapeGlyph shape="hex" :radius="t.glyph" />
        </CampaignEditorTile>
      </div>
    </div>
    <div class="campaign-editor__field">
      <span>Border shape</span>
      <div class="campaign-editor__shape-row">
        <CampaignEditorTile
          v-for="t in shapeTiles"
          :key="t.label"
          :label="t.label"
          @select="applyBulkShape(t.value)"
        >
          <CampaignShapeGlyph :shape="t.value" />
        </CampaignEditorTile>
      </div>
    </div>
    <BaseButton
      size="sm"
      variant="destructive"
      :loading="actionPending"
      @click="removeSelectedNodes"
    >
      Remove {{ selectedCount }} nodes
    </BaseButton>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'unlock' && selectedDifficulty"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__prereq-mode" role="radiogroup" aria-label="Unlock when">
      <div class="campaign-editor__prereq-mode-toggle">
        <button
          type="button"
          role="radio"
          :aria-checked="selectedDifficulty.prerequisiteMode !== 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active':
              selectedDifficulty.prerequisiteMode !== 'AND',
          }"
          @click="setPrereqMode('OR')"
        >
          any clears
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="selectedDifficulty.prerequisiteMode === 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active':
              selectedDifficulty.prerequisiteMode === 'AND',
          }"
          @click="setPrereqMode('AND')"
        >
          all clear
        </button>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'rewards' && selectedDifficulty"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignRewardsEditor
      v-model:xp="formNode.xp"
      xp-label="XP on clear"
      :xp-max="5000"
      :xp-step="50"
      :items="selectedDifficulty.items"
      :editable="editable"
      :curated="campaign?.status === 'CURATED'"
      :can-add="canAddNodeReward"
      :limit-text="`Limit of ${nodeRewardLimit} reached.`"
      @commit-xp="commitNodeField('xp')"
      @add="openNodeItemPicker"
      @remove="removeNodeItem"
    />
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'barrierCondition' && selectedBarrier"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__field">
      <span>Condition <CampaignFieldHint :text="barrierConditionHint" /></span>
      <BaseSelect
        :model-value="formBarrier.conditionType"
        :options="barrierConditionOptionsFiltered.map((o) => ({ value: o.value, label: o.label }))"
        @update:model-value="onBarrierConditionTypeChange"
      />
    </div>
    <p v-if="barrierAffectsApRankBlocked" class="campaign-editor__hint">
      An affected map is unranked. AP and rank conditions are unavailable.
    </p>
    <div
      v-if="!barrierMeta.noValue"
      class="campaign-editor__field"
      :class="{
        'campaign-editor__field--disabled':
          barrierMeta.metric === 'count' && barrierValueBounds.max <= 1,
      }"
    >
      <CampaignBoundsField
        :lower="barrierLowerDisplay"
        :upper="barrierUpperDisplay"
        :min="barrierValueBounds.min"
        :max="barrierValueBounds.max"
        :step="barrierValueBounds.step"
        :unit="barrierValueBounds.unit"
        :disabled="barrierMeta.metric === 'count' && barrierValueBounds.max <= 1"
        single-label="Goal"
        @update:lower="setBarrierBound('conditionValue', $event)"
        @update:upper="setBarrierBound('conditionValueMax', $event)"
        @commit="commitBarrierBounds"
      />
    </div>
    <p
      v-if="barrierMeta.metric === 'count' && affectedNodeList.length <= 1"
      class="campaign-editor__hint"
    >
      Locked at {{ affectedNodeList.length || 1 }}. Add affected nodes to raise it.
    </p>
    <label class="campaign-editor__field">
      <span>
        Description <small>(optional)</small>
        <CampaignFieldHint :text="MARKDOWN_HINT" />
      </span>
      <textarea
        v-model="formBarrier.description"
        rows="2"
        @blur="commitBarrierField('description')"
      />
    </label>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'barrierAffected' && selectedBarrier"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <button
      type="button"
      class="campaign-editor__pick-toggle"
      :class="{ 'campaign-editor__pick-toggle--active': affectedPickMode }"
      @click="toggleAffectedPickMode"
    >
      <span class="campaign-editor__pick-dot" aria-hidden="true" />
      {{ affectedPickMode ? 'Picking… click nodes on the canvas' : 'Pick on canvas' }}
    </button>
    <ul v-if="affectedNodeList.length > 0" class="campaign-editor__affected-list">
      <li v-for="n in affectedNodeList" :key="n.id" class="campaign-editor__affected-item">
        <span class="campaign-editor__affected-name">{{ n.name }}</span>
        <button
          v-if="editable"
          type="button"
          class="campaign-editor__reward-remove"
          :aria-label="`Remove ${n.name}`"
          @click="toggleAffected(n.id)"
        >
          <CampaignTrayIcon name="x" :size="12" />
        </button>
      </li>
    </ul>
    <p v-else class="campaign-editor__hint">No affected nodes</p>
    <div class="campaign-editor__field">
      <span>Opens when</span>
      <div
        class="campaign-editor__prereq-mode-toggle"
        role="radiogroup"
        aria-label="Gate opens when"
      >
        <button
          type="button"
          role="radio"
          :aria-checked="selectedBarrier.prerequisiteMode !== 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': selectedBarrier.prerequisiteMode !== 'AND',
          }"
          @click="setBarrierPrereqMode('OR')"
        >
          any clears
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="selectedBarrier.prerequisiteMode === 'AND'"
          class="campaign-editor__prereq-mode-btn"
          :class="{
            'campaign-editor__prereq-mode-btn--active': selectedBarrier.prerequisiteMode === 'AND',
          }"
          @click="setBarrierPrereqMode('AND')"
        >
          all clear
        </button>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'barrierStyle' && selectedBarrier"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__field">
      <span>Gate length: {{ resolveSize(formBarrier.size, 48) }}px</span>
      <input
        type="range"
        min="32"
        max="120"
        step="1"
        :value="resolveSize(formBarrier.size, 48)"
        @input="formBarrier.size = Number(($event.target as HTMLInputElement).value)"
        @change="commitBarrierField('size')"
      />
    </div>
    <CampaignColorField
      v-model="formBarrier.borderColor"
      label="Gate color"
      :fallback="defaultBarrierColor"
      @commit="commitBarrierField('borderColor')"
      @reset="resetBarrierColor"
    />
    <label class="campaign-editor__field">
      <span>Label <small>(optional)</small></span>
      <input
        v-model="formBarrier.checkpointLabel"
        type="text"
        placeholder="e.g. Section clear"
        @blur="commitBarrierField('checkpointLabel')"
      />
    </label>
    <div class="campaign-editor__field">
      <span>Label position</span>
      <CampaignLabelPositionPicker
        :model-value="formBarrier.checkpointLabelPosition"
        @select="selectBarrierLabelPosition"
      />
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'barrierRewards' && selectedBarrier"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignRewardsEditor
      v-model:xp="formBarrier.xp"
      xp-label="XP on clear"
      :xp-max="5000"
      :xp-step="50"
      :items="selectedBarrier.items"
      :editable="editable"
      :curated="campaign?.status === 'CURATED'"
      :can-add="canAddBarrierReward"
      @commit-xp="commitBarrierField('xp')"
      @add="openBarrierItemPicker"
      @remove="removeBarrierItem"
    />
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'text' && selectedText"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <div class="campaign-editor__field" @focusout="commitTextField('content')">
      <span>Content</span>
      <RichTextEditor
        :model-value="formText.content"
        :min-height="120"
        :max-height="240"
        aria-label="Text content"
        @update:model-value="onTextContentInput"
      />
    </div>
    <div class="campaign-editor__field">
      <span>Font</span>
      <BaseSelect
        :model-value="formText.font"
        :options="fontOptions"
        @update:model-value="
          (v: string) => {
            formText.font = v
            commitTextField('font')
          }
        "
      />
    </div>
    <label class="campaign-editor__field">
      <span>Scale: {{ formText.scale.toFixed(1) }}×</span>
      <input
        type="range"
        min="0.5"
        max="3"
        step="0.1"
        v-model.number="formText.scale"
        @change="commitTextField('scale')"
      />
    </label>
    <CampaignColorField
      v-model="formText.color"
      label="Color"
      :fallback="defaultColorHex"
      @commit="commitTextField('color')"
      @reset="resetTextColor"
    />
    <div class="campaign-editor__field">
      <span>Effects</span>
      <div class="campaign-editor__tag-chips">
        <button
          v-for="fx in textEffects"
          :key="fx"
          type="button"
          class="campaign-editor__chip"
          :class="{ 'campaign-editor__chip--active': textEffectActive(fx) }"
          @click="toggleTextEffect(fx)"
        >
          {{ fx }}
        </button>
      </div>
    </div>
  </fieldset>

  <fieldset
    v-else-if="activeTray === 'connection' && selectedEdge"
    class="campaign-editor__section"
    :disabled="!editable"
  >
    <CampaignColorField
      v-model="formConnection.color"
      label="Connection color"
      text
      placeholder="#f5b800 · gold"
      :maxlength="33"
      :fallback="defaultColorHex"
      :error="connectionColorError"
      @commit="commitConnectionColor"
      @reset="resetConnectionColor"
    />
  </fieldset>
</template>

<style scoped src="./campaignEditorFields.css"></style>

<style scoped>
.campaign-editor__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: var(--space-lg) 0 0;
  border: none;
  border-top: 1px solid var(--bg-overlay);
}

.campaign-editor__section:first-of-type {
  padding-top: 0;
  border-top: none;
}

.campaign-editor__section[disabled] {
  opacity: 0.6;
  pointer-events: none;
}

.campaign-editor__field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.campaign-editor__btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.campaign-editor__status {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.campaign-editor__status-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-editor__status-pill {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: var(--radius-btn);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid;
}

.campaign-editor__status-pill--draft {
  color: var(--text-secondary);
  border-color: var(--bg-overlay);
}

.campaign-editor__status-pill--published {
  color: var(--info);
  border-color: color-mix(in srgb, var(--info) 50%, transparent);
}

.campaign-editor__status-pill--editing {
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 50%, transparent);
}

.campaign-editor__status-pill--curated {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 50%, transparent);
}

.campaign-editor__status-meaning {
  margin: 0;
  font-family: var(--font-sans);
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

.campaign-editor__blockers-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-editor__audit {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--bg-overlay);
}

.campaign-editor__audit-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.campaign-editor__audit-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px var(--space-sm);
  margin: 0;
}

.campaign-editor__audit-stats dt {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.campaign-editor__audit-stats dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.campaign-editor__audit-stats dd small {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.campaign-editor__audit-over,
.campaign-editor__audit-over small {
  color: var(--warning);
}

.campaign-editor__avatar-upload {
  max-width: 180px;
}

.campaign-editor__image-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.campaign-editor__image-row :deep(.image-uploader) {
  width: 100%;
  max-width: 320px;
}

.campaign-editor__image-row :deep(.image-uploader:last-child) {
  max-width: 200px;
}

.campaign-editor__tag-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campaign-editor__tag-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: capitalize;
}

.campaign-editor__tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.campaign-editor__chip {
  padding: 3px 8px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.campaign-editor__chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-editor__chip--active {
  color: var(--page-accent);
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 12%, transparent);
}

.campaign-editor__mod {
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.campaign-editor__mod:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-editor__mod--required {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 55%, transparent);
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

.campaign-editor__mod--forbidden {
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 55%, transparent);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  text-decoration: line-through;
}

.campaign-editor__targets {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.campaign-editor__target-join {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--text-tertiary);
}

.campaign-editor__target-join::before,
.campaign-editor__target-join::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bg-overlay);
}

.campaign-editor__target-join--or {
  color: var(--page-accent);
}

.campaign-editor__shape-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.campaign-editor__prereq-mode {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.campaign-editor__prereq-mode-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.campaign-editor__prereq-mode-btn {
  padding: 4px 10px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease;
}

.campaign-editor__prereq-mode-btn:hover {
  color: var(--text-primary);
}

.campaign-editor__prereq-mode-btn--active {
  color: var(--page-accent);
  background: var(--bg-elevated);
}

.campaign-editor__collab-owner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 8px 10px;
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
  gap: 4px;
}

.campaign-editor__collab-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campaign-editor__collab {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-sm);
  align-items: center;
  padding: 6px 8px;
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

.campaign-editor__pick-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 7px 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease,
    background 120ms ease;
}

.campaign-editor__pick-toggle:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.campaign-editor__pick-toggle--active {
  color: var(--warning);
  border-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
}

.campaign-editor__pick-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

.campaign-editor__pick-toggle--active .campaign-editor__pick-dot {
  opacity: 1;
  animation: pick-pulse 1.4s ease-in-out infinite;
}

@keyframes pick-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .campaign-editor__pick-toggle--active .campaign-editor__pick-dot {
    animation: none;
  }
}

.campaign-editor__affected-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campaign-editor__affected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 5px 8px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.campaign-editor__affected-name {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
