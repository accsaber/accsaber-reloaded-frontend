<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { PlayerRef } from '@/types/api/common'
import { CLAN_ROLE_LABEL, type RankSlot } from '@/utils/clans'
import { computed, ref } from 'vue'

const props = defineProps<{
  seat: RankSlot
  candidates: PlayerRef[]
}>()

const emit = defineEmits<{ pick: [member: PlayerRef] }>()

const open = ref(false)
const pickable = computed(() => props.seat.open && props.candidates.length > 0)

function pick(member: PlayerRef) {
  open.value = false
  emit('pick', member)
}
</script>

<template>
  <BaseDropdown :open="open" class="slot__picker" @update:open="open = $event && pickable">
    <template #trigger>
      <component
        :is="pickable ? 'button' : 'article'"
        :type="pickable ? 'button' : undefined"
        :aria-expanded="pickable ? open : undefined"
        class="slot"
        :class="[`slot--${seat.role}`, { 'slot--open': seat.open }]"
      >
        <span class="slot__portrait" aria-hidden="true">
          <svg v-if="seat.open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <span class="slot__body">
          <span class="slot__role">{{ CLAN_ROLE_LABEL[seat.role] }}</span>
          <span class="slot__when">{{ seat.open ? 'Open slot' : `Unlocks at clan level ${seat.level}` }}</span>
        </span>
      </component>
    </template>
    <div class="slot__list" role="menu">
      <button
        v-for="member in candidates"
        :key="member.id"
        type="button"
        class="slot__item"
        role="menuitem"
        @click="pick(member)"
      >
        <UserChip :user="member" size="sm" hide-clan />
      </button>
    </div>
  </BaseDropdown>
</template>

<style scoped>
.slot {
  --portrait: 64px;
  display: grid;
  grid-template-columns: var(--portrait) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-md);
  border: 1px dashed var(--bg-overlay);
  border-radius: var(--radius-card);
}

button.slot {
  width: 100%;
  font: inherit;
  text-align: left;
  background: none;
  cursor: pointer;
}

button.slot:hover,
button.slot[aria-expanded='true'] {
  border-color: var(--text-tertiary);
  background: var(--bg-surface);
}

.slot__picker {
  display: block;
}

.slot__list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
}

.slot__item {
  display: flex;
  padding: var(--space-xs) var(--space-sm);
  font: inherit;
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.slot__item:hover {
  background: var(--bg-overlay);
}

.slot--commander {
  --portrait: 96px;
}

.slot__portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--portrait);
  height: var(--portrait);
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border-radius: var(--radius-avatar);
}

.slot--open .slot__portrait {
  color: var(--text-secondary);
  background: none;
  border: 1px dashed var(--text-tertiary);
}

.slot__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.slot__role {
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-secondary);
}

.slot__when {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
