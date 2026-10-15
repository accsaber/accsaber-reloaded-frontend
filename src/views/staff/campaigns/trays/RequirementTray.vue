<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import type { CampaignTargetMode } from '@/types/enums'
import { computed, ref } from 'vue'
import CampaignEditorNote from '../CampaignEditorNote.vue'
import CampaignTargetRow from '../CampaignTargetRow.vue'
import CampaignTrayIcon from '../CampaignTrayIcon.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { REQUIREMENT_TYPE_OPTIONS } from '../useCampaignTargets'

const TARGET_MODES: Array<{ value: CampaignTargetMode; label: string }> = [
  { value: 'AND', label: 'All of' },
  { value: 'OR', label: 'Any of' },
]

const MODIFIER_STATE_WORD: Record<string, string> = {
  REQUIRED: 'required',
  FORBIDDEN: 'forbidden',
}

const { doc, access, vertices, nodes, targets, mapSources } = useCampaignEditorContext()
const { actionPending } = doc
const { editable } = access
const { selectedDifficulty } = vertices
const { formNode, commitNodeField, selectedNodeApRankBlocked } = nodes
const { targetRows, formTargetMode, canAddTarget, addTarget, removeTarget, moveTarget } = targets
const { setTargetMode, setTargetType, setTargetBound, reorderTargets, commitTargets } = targets
const { modifierOptions, nodeModifierById, cycleNodeModifier } = targets
const { refreshNodeVersion, openRepoint } = mapSources

const requirementOptions = computed(() =>
  selectedNodeApRankBlocked.value
    ? REQUIREMENT_TYPE_OPTIONS.filter((o) => o.value !== 'AP' && o.value !== 'RANK')
    : REQUIREMENT_TYPE_OPTIONS,
)

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
</script>

<template>
  <fieldset class="campaign-editor__section" :disabled="!editable">
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
        <HintTooltip text="Click to cycle required, forbidden, unset." />
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
        <HintTooltip text="Markdown supported." />
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
</template>


<style scoped>
.campaign-editor__btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.campaign-editor__mod {
  padding: 3px var(--space-sm);
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
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.campaign-editor__target-join {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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
</style>
