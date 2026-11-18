<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import type { ClanJoinRequestResponse, ClanRole } from '@/types/api/clans'
import { hasClanRole } from '@/utils/clans'
import { computed, ref } from 'vue'
import './menuList.css'

const props = defineProps<{
  signedIn: boolean
  viewerRole: ClanRole | null
  viewerInOtherClan: boolean
  acceptingRequests: boolean
  pendingRequest: ClanJoinRequestResponse | null
  busy: boolean
  error: string | null
  editing: boolean
}>()

const emit = defineEmits<{
  request: []
  resolve: [status: 'accepted' | 'declined' | 'cancelled']
  edit: []
  cancel: []
  save: []
  leave: []
  disband: []
}>()

const menuOpen = ref(false)
const isFounder = computed(() => hasClanRole(props.viewerRole, 'founder'))
const invite = computed(() => props.pendingRequest?.direction === 'invite')

function pick(action: 'leave' | 'disband') {
  menuOpen.value = false
  if (action === 'leave') emit('leave')
  else emit('disband')
}
</script>

<template>
  <div v-if="signedIn" class="clan-actions">
    <template v-if="editing">
      <BaseButton :disabled="busy" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="busy" @click="emit('save')">Save</BaseButton>
    </template>

    <template v-else-if="viewerRole">
      <BaseButton v-if="isFounder" @click="emit('edit')">Edit</BaseButton>
      <BaseDropdown :open="menuOpen" position="bottom-right" @update:open="menuOpen = $event">
        <template #trigger>
          <button type="button" class="clan-actions__menu-btn" aria-label="Clan menu" :aria-expanded="menuOpen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </template>
        <div class="menu-list" role="menu">
          <button type="button" class="menu-list__item" role="menuitem" @click="pick('leave')">Leave Clan</button>
          <button
            v-if="isFounder"
            type="button"
            class="menu-list__item menu-list__item--danger"
            role="menuitem"
            @click="pick('disband')"
          >
            Disband Clan
          </button>
        </div>
      </BaseDropdown>
    </template>

    <template v-else-if="invite">
      <BaseButton variant="primary" :loading="busy" @click="emit('resolve', 'accepted')">Accept Invite</BaseButton>
      <BaseButton :disabled="busy" @click="emit('resolve', 'declined')">Decline</BaseButton>
    </template>

    <template v-else-if="pendingRequest">
      <span class="field-label">Request sent</span>
      <BaseButton :loading="busy" @click="emit('resolve', 'cancelled')">Cancel</BaseButton>
    </template>

    <template v-else-if="!viewerInOtherClan">
      <BaseButton v-if="acceptingRequests" variant="primary" :loading="busy" @click="emit('request')">
        Request to Join
      </BaseButton>
      <BaseButton v-else disabled>Not Taking Requests</BaseButton>
    </template>

    <p v-if="error" class="clan-actions__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.clan-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.clan-actions__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-h);
  height: var(--control-h);
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.clan-actions__menu-btn:hover,
.clan-actions__menu-btn[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.clan-actions__error {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--text-caption);
  text-align: right;
  color: var(--error);
}
</style>
