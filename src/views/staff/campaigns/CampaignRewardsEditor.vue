<script setup lang="ts">
import CampaignRewardItem from '@/components/domain/CampaignRewardItem.vue'
import type { CampaignItemAwardResponse } from '@/types/api/campaigns'
import CampaignEditorNote from './CampaignEditorNote.vue'
import CampaignTrayIcon from './CampaignTrayIcon.vue'

withDefaults(
  defineProps<{
    items: CampaignItemAwardResponse[]
    xpLabel: string
    xpMax: number
    xpStep: number
    editable: boolean
    curated: boolean
    canAdd?: boolean
    limitText?: string
  }>(),
  { canAdd: true, limitText: '' },
)

const xp = defineModel<number>('xp', { required: true })

const emit = defineEmits<{ commitXp: []; add: []; remove: [itemId: string] }>()
</script>

<template>
  <CampaignEditorNote v-if="!curated">Rewards pay out once curated.</CampaignEditorNote>
  <label class="campaign-editor__field">
    <span>{{ xpLabel }}</span>
    <div class="campaign-editor__slider-row">
      <input
        v-model.number="xp"
        type="range"
        min="0"
        :max="xpMax"
        :step="xpStep"
        @change="emit('commitXp')"
      />
      <input
        v-model.number="xp"
        type="number"
        min="0"
        :step="xpStep / 5"
        @blur="emit('commitXp')"
      />
    </div>
  </label>
  <ul v-if="items.length > 0" class="campaign-editor__reward-list">
    <li v-for="item in items" :key="item.itemId" class="campaign-editor__reward">
      <CampaignRewardItem :name="item.itemName" :quantity="item.quantity" :item="item.item">
        <template v-if="editable" #action>
          <button
            type="button"
            class="campaign-editor__reward-remove"
            aria-label="Remove reward"
            @click="emit('remove', item.itemId)"
          >
            <CampaignTrayIcon name="x" :size="12" />
          </button>
        </template>
      </CampaignRewardItem>
    </li>
  </ul>
  <p v-else class="campaign-editor__hint">No item rewards</p>
  <button
    v-if="editable && canAdd"
    type="button"
    class="campaign-editor__add-reward"
    @click="emit('add')"
  >
    <CampaignTrayIcon name="plus" :size="12" />
    Add reward
  </button>
  <p v-else-if="editable && limitText" class="campaign-editor__hint">{{ limitText }}</p>
</template>

<style scoped src="./campaignEditorFields.css"></style>
