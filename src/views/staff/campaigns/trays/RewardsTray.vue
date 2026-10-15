<script setup lang="ts">
import { computed } from 'vue'
import CampaignRewardsEditor from '../CampaignRewardsEditor.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const props = defineProps<{ target: 'completion' | 'node' | 'barrier' }>()

const { doc, access, vertices, meta, nodes, barriers, rewards } = useCampaignEditorContext()
const { campaign } = doc
const { editable } = access
const { selectedDifficulty, selectedBarrier } = vertices

const target = computed(() => {
  if (props.target === 'completion') {
    return {
      visible: !!campaign.value,
      xp: meta.formMeta.value.completionXp,
      setXp: (xp: number) => (meta.formMeta.value.completionXp = xp),
      xpLabel: 'Completion XP',
      xpMax: 50000,
      xpStep: 500,
      items: campaign.value?.completionItems ?? [],
      canAdd: true,
      limitText: '',
      commit: () => meta.commitMetaField('completionXp'),
      add: rewards.openCampaignItemPicker,
      remove: rewards.removeCompletionItem,
    }
  }
  if (props.target === 'node') {
    return {
      visible: !!selectedDifficulty.value,
      xp: nodes.formNode.value.xp,
      setXp: (xp: number) => (nodes.formNode.value.xp = xp),
      xpLabel: 'XP on clear',
      xpMax: 5000,
      xpStep: 50,
      items: selectedDifficulty.value?.items ?? [],
      canAdd: rewards.canAddNodeReward.value,
      limitText: `Limit of ${rewards.nodeRewardLimit} reached.`,
      commit: () => nodes.commitNodeField('xp'),
      add: rewards.openNodeItemPicker,
      remove: rewards.removeNodeItem,
    }
  }
  return {
    visible: !!selectedBarrier.value,
    xp: barriers.formBarrier.value.xp,
    setXp: (xp: number) => (barriers.formBarrier.value.xp = xp),
    xpLabel: 'XP on clear',
    xpMax: 5000,
    xpStep: 50,
    items: selectedBarrier.value?.items ?? [],
    canAdd: rewards.canAddBarrierReward.value,
    limitText: '',
    commit: () => barriers.commitBarrierField('xp'),
    add: rewards.openBarrierItemPicker,
    remove: rewards.removeBarrierItem,
  }
})
</script>

<template>
  <fieldset v-if="target.visible" class="campaign-editor__section" :disabled="!editable">
    <CampaignRewardsEditor
      :xp="target.xp"
      :xp-label="target.xpLabel"
      :xp-max="target.xpMax"
      :xp-step="target.xpStep"
      :items="target.items"
      :editable="editable"
      :curated="campaign?.status === 'CURATED'"
      :can-add="target.canAdd"
      :limit-text="target.limitText"
      @update:xp="target.setXp"
      @commit-xp="target.commit"
      @add="target.add"
      @remove="target.remove"
    />
  </fieldset>
</template>
