<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import { computed } from 'vue'
import CampaignBoundsField from '../CampaignBoundsField.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'
import { BARRIER_CONDITION_OPTIONS } from '../useCampaignBarriers'

const AP_RANK_BARRIER_TYPES = ['AVERAGE_AP', 'AP_MAX', 'AVERAGE_RANK', 'MAX_RANK']

const { access, vertices, nodes, barriers } = useCampaignEditorContext()
const { editable } = access
const { selectedBarrier } = vertices
const { apRankBlockedNodeIds } = nodes
const { formBarrier, barrierMeta, barrierLowerDisplay, barrierUpperDisplay } = barriers
const { barrierValueBounds, setBarrierBound, commitBarrierBounds, commitBarrierField } = barriers
const { onBarrierConditionTypeChange } = barriers

const affectedCount = computed(() => selectedBarrier.value?.affectedCampaignDifficultyIds.length ?? 0)

const countLocked = computed(
  () => barrierMeta.value.metric === 'count' && barrierValueBounds.value.max <= 1,
)

const conditionHint = computed(() => {
  const meta = barrierMeta.value
  if (meta.noValue) {
    const verb = formBarrier.value.conditionType === 'PASS' ? 'passed without No-Fail' : 'full-comboed'
    return `Every affected node ${verb}.`
  }
  if (meta.metric === 'count') return `Out of ${affectedCount.value} affected nodes.`
  if (meta.metric === 'bombs') return 'Averaged.'
  if (meta.metric === 'mistakes') return 'Bad cuts plus misses, averaged.'
  if (meta.metric === 'pauses') return 'Averaged, BeatLeader only.'
  if (meta.lowerBetter) return `Lower is better (${meta.agg}).`
  return `${meta.agg} across affected nodes.`
})

const affectsApRankBlocked = computed(() => {
  const b = selectedBarrier.value
  if (!b) return false
  return b.affectedCampaignDifficultyIds.some((id) => apRankBlockedNodeIds.value.has(id))
})

const conditionOptions = computed(() =>
  affectsApRankBlocked.value
    ? BARRIER_CONDITION_OPTIONS.filter((o) => !AP_RANK_BARRIER_TYPES.includes(o.value))
    : BARRIER_CONDITION_OPTIONS,
)
</script>

<template>
  <fieldset v-if="selectedBarrier" class="campaign-editor__section" :disabled="!editable">
    <div class="campaign-editor__field">
      <span>Condition <HintTooltip :text="conditionHint" /></span>
      <BaseSelect
        :model-value="formBarrier.conditionType"
        :options="conditionOptions"
        @update:model-value="onBarrierConditionTypeChange"
      />
    </div>
    <p v-if="affectsApRankBlocked" class="campaign-editor__hint">
      An affected map is unranked. AP and rank conditions are unavailable.
    </p>
    <div
      v-if="!barrierMeta.noValue"
      class="campaign-editor__field"
      :class="{ 'campaign-editor__field--disabled': countLocked }"
    >
      <CampaignBoundsField
        :lower="barrierLowerDisplay"
        :upper="barrierUpperDisplay"
        :min="barrierValueBounds.min"
        :max="barrierValueBounds.max"
        :step="barrierValueBounds.step"
        :unit="barrierValueBounds.unit"
        :disabled="countLocked"
        single-label="Goal"
        @update:lower="setBarrierBound('conditionValue', $event)"
        @update:upper="setBarrierBound('conditionValueMax', $event)"
        @commit="commitBarrierBounds"
      />
    </div>
    <p v-if="barrierMeta.metric === 'count' && affectedCount <= 1" class="campaign-editor__hint">
      Locked at {{ affectedCount || 1 }}.
    </p>
    <label class="campaign-editor__field">
      <span>
        Description <small>(optional)</small>
        <HintTooltip text="Markdown supported." />
      </span>
      <textarea
        v-model="formBarrier.description"
        rows="2"
        @blur="commitBarrierField('description')"
      />
    </label>
  </fieldset>
</template>
