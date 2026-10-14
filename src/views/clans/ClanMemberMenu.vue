<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import type { ClanRole } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import { CLAN_ROLE_LABEL } from '@/utils/clans'
import { ref } from 'vue'

export interface MemberActions {
  roles: ClanRole[]
  kick: boolean
  transfer: boolean
  claim: boolean
}

export type MemberPick = ClanRole | 'kick' | 'transfer' | 'claim'

const props = defineProps<{
  member: PlayerRef
  actions: MemberActions
}>()

const emit = defineEmits<{ pick: [action: MemberPick] }>()

const open = ref(false)

function pick(action: MemberPick) {
  open.value = false
  emit('pick', action)
}
</script>

<template>
  <BaseDropdown v-model:open="open" position="bottom-right">
    <template #trigger>
      <button type="button" class="member-menu__btn" :aria-label="`Manage ${props.member.name}`" :aria-expanded="open">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </template>
    <div class="member-menu" role="menu">
      <button
        v-for="role in actions.roles"
        :key="role"
        type="button"
        class="member-menu__item"
        role="menuitem"
        @click="pick(role)"
      >
        Make {{ CLAN_ROLE_LABEL[role].toLowerCase() }}
      </button>
      <button v-if="actions.transfer" type="button" class="member-menu__item" role="menuitem" @click="pick('transfer')">
        Transfer founder
      </button>
      <button v-if="actions.claim" type="button" class="member-menu__item" role="menuitem" @click="pick('claim')">
        Claim clan
      </button>
      <button
        v-if="actions.kick"
        type="button"
        class="member-menu__item member-menu__item--danger"
        role="menuitem"
        @click="pick('kick')"
      >
        Kick
      </button>
    </div>
  </BaseDropdown>
</template>

<style scoped>
.member-menu__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.member-menu__btn:hover,
.member-menu__btn[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--bg-overlay);
  background: var(--bg-surface);
}

.member-menu {
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: var(--space-xs);
}

.member-menu__item {
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  text-align: left;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.member-menu__item:hover {
  background: var(--bg-overlay);
}

.member-menu__item--danger {
  color: var(--error);
}

.member-menu__item--danger:hover {
  background: color-mix(in srgb, var(--error) 12%, transparent);
}
</style>
