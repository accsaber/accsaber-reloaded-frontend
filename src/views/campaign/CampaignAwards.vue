<script setup lang="ts">
import CampaignRewardItem from '@/components/domain/CampaignRewardItem.vue'
import type { CampaignItemAwardResponse } from '@/types/api/campaigns'
import CampaignRewardNotice from '@/views/campaign/CampaignRewardNotice.vue'

withDefaults(
  defineProps<{
    label: string
    items: CampaignItemAwardResponse[]
    curated: boolean
    xp?: number
    withheld?: boolean
    heading?: 'h2' | 'h3'
  }>(),
  { xp: 0, withheld: false, heading: 'h3' },
)
</script>

<template>
  <section class="awards">
    <component :is="heading" class="awards__label field-label">
      <span class="awards__notice">
        {{ label }}
        <CampaignRewardNotice :curated="curated" />
      </span>
      <span v-if="xp > 0" class="awards__xp">+{{ xp.toLocaleString() }} XP</span>
    </component>
    <ul v-if="items.length > 0" class="awards__list">
      <li v-for="item in items" :key="item.itemId" class="awards__item"
        :class="{ 'awards__item--withheld': withheld }">
        <CampaignRewardItem :name="item.itemName" :quantity="item.quantity" :item="item.item" />
        <span v-if="withheld" class="awards__hold" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4" />
          </svg>
        </span>
      </li>
    </ul>
    <slot />
  </section>
</template>

<style scoped>
.awards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.awards__label {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.awards__notice {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.awards__xp {
  color: var(--page-accent);
}

.awards__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.awards__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  font-size: var(--text-caption);
}

.awards__item--withheld {
  position: relative;
}

.awards__item--withheld :deep(.reward-item) {
  opacity: 0.55;
}

.awards__hold {
  position: absolute;
  top: 2px;
  left: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--warning);
  background: var(--bg-elevated);
  border: 1px solid var(--warning);
  border-radius: 50%;
}
</style>
