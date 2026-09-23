<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import type { ClanJoinRequestResponse, ClanRole } from '@/types/api/clans'
import { hasClanRole } from '@/utils/clans'
import { computed, ref } from 'vue'

const props = defineProps<{
  signedIn: boolean
  viewerRole: ClanRole | null
  ownRole: ClanRole | null
  viewerInOtherClan: boolean
  acceptingRequests: boolean
  pendingRequest: ClanJoinRequestResponse | null
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{
  request: []
  resolve: [status: 'accepted' | 'declined' | 'cancelled']
  edit: []
  leave: []
  disband: []
  'propose-alliance': []
  'call-rival': []
  'declare-war': []
}>()

const menuOpen = ref(false)
const isFounder = computed(() => hasClanRole(props.viewerRole, 'founder'))
const invite = computed(() => props.pendingRequest?.direction === 'invite')
const canPropose = computed(() => hasClanRole(props.ownRole, 'founder'))
const canRival = computed(() => hasClanRole(props.ownRole, 'commander'))

function pick(action: 'leave' | 'disband' | 'propose-alliance' | 'call-rival' | 'declare-war') {
  menuOpen.value = false
  if (action === 'leave') emit('leave')
  else if (action === 'disband') emit('disband')
  else if (action === 'propose-alliance') emit('propose-alliance')
  else if (action === 'call-rival') emit('call-rival')
  else emit('declare-war')
}
</script>

<template>
  <div v-if="signedIn" class="clan-actions">
    <template v-if="viewerRole">
      <BaseButton v-if="isFounder" size="sm" @click="emit('edit')">Edit</BaseButton>
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
        <div class="clan-actions__menu" role="menu">
          <button type="button" class="clan-actions__item" role="menuitem" @click="pick('leave')">Leave clan</button>
          <button
            v-if="isFounder"
            type="button"
            class="clan-actions__item clan-actions__item--danger"
            role="menuitem"
            @click="pick('disband')"
          >
            Disband clan
          </button>
        </div>
      </BaseDropdown>
    </template>

    <template v-else-if="invite">
      <BaseButton variant="primary" size="sm" :loading="busy" @click="emit('resolve', 'accepted')">Accept invite</BaseButton>
      <BaseButton size="sm" :disabled="busy" @click="emit('resolve', 'declined')">Decline</BaseButton>
    </template>

    <template v-else-if="pendingRequest">
      <span class="clan-actions__state">Request sent</span>
      <BaseButton size="sm" :loading="busy" @click="emit('resolve', 'cancelled')">Cancel</BaseButton>
    </template>

    <BaseDropdown
      v-else-if="canRival"
      :open="menuOpen"
      position="bottom-right"
      @update:open="menuOpen = $event"
    >
      <template #trigger>
        <BaseButton size="sm" :loading="busy">Diplomacy</BaseButton>
      </template>
      <div class="clan-actions__menu" role="menu">
        <button
          v-if="canPropose"
          type="button"
          class="clan-actions__item"
          role="menuitem"
          @click="pick('propose-alliance')"
        >
          Propose alliance
        </button>
        <button type="button" class="clan-actions__item" role="menuitem" @click="pick('call-rival')">
          Call rival
        </button>
        <button
          type="button"
          class="clan-actions__item clan-actions__item--danger"
          role="menuitem"
          @click="pick('declare-war')"
        >
          Declare war
        </button>
      </div>
    </BaseDropdown>

    <template v-else-if="!viewerInOtherClan">
      <BaseButton v-if="acceptingRequests" variant="primary" size="sm" :loading="busy" @click="emit('request')">
        Request to join
      </BaseButton>
      <BaseButton v-else size="sm" disabled>Not taking requests</BaseButton>
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

.clan-actions__state {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.clan-actions__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background-color 120ms ease;
}

.clan-actions__menu-btn:hover,
.clan-actions__menu-btn[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.clan-actions__menu {
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: var(--space-xs);
}

.clan-actions__item {
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

.clan-actions__item:hover {
  background: var(--bg-overlay);
}

.clan-actions__item--danger {
  color: var(--error);
}

.clan-actions__item--danger:hover {
  background: color-mix(in srgb, var(--error) 12%, transparent);
}

.clan-actions__error {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--text-caption);
  text-align: right;
  color: var(--error);
}

@media (prefers-reduced-motion: reduce) {
  .clan-actions__menu-btn {
    transition: none;
  }
}
</style>
