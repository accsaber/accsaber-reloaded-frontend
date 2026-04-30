<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useAuthStore } from '@/stores/auth'
import { RelationBlockedError, useRelationsStore } from '@/stores/relations'
import type { UserRelationType } from '@/types/api/relations'
import { computed, ref } from 'vue'

const props = defineProps<{
  targetUserId: string
  targetName?: string
}>()

const authStore = useAuthStore()
const relationsStore = useRelationsStore()

const visible = computed(
  () =>
    authStore.isLoggedIn
    && !!authStore.userId
    && authStore.userId !== props.targetUserId,
)

const isFollower = computed(() =>
  relationsStore.hasRelation(props.targetUserId, 'follower'),
)
const isRival = computed(() => relationsStore.hasRelation(props.targetUserId, 'rival'))
const isBlocked = computed(() => relationsStore.hasRelation(props.targetUserId, 'blocked'))

const pending = ref<UserRelationType | null>(null)
const errorMessage = ref<string | null>(null)

const showBlockModal = ref(false)

async function performToggle(type: UserRelationType) {
  if (pending.value) return
  pending.value = type
  errorMessage.value = null
  try {
    if (type === 'blocked' && !isBlocked.value) {
      await relationsStore.add(props.targetUserId, 'blocked')
    } else {
      await relationsStore.toggle(props.targetUserId, type)
    }
  } catch (err) {
    if (err instanceof RelationBlockedError) {
      errorMessage.value = 'You cannot interact with this user.'
    } else {
      errorMessage.value = 'Action failed. Try again.'
    }
  } finally {
    pending.value = null
  }
}

function handleClick(type: UserRelationType) {
  if (type === 'blocked' && !isBlocked.value) {
    showBlockModal.value = true
    return
  }
  performToggle(type)
}

async function confirmBlock() {
  showBlockModal.value = false
  await performToggle('blocked')
}

function cancelBlockConfirm() {
  showBlockModal.value = false
}

function tooltip(type: UserRelationType): string {
  if (type === 'follower') return isFollower.value ? 'Unfollow' : 'Follow'
  if (type === 'rival') return isRival.value ? 'Stop rivaling' : 'Mark as rival'
  return isBlocked.value ? 'Unblock' : 'Block'
}

const targetLabel = computed(() => props.targetName || 'this user')
</script>

<template>
  <div v-if="visible" class="relation-actions">
    <BaseButton
      v-if="!isBlocked"
      size="sm"
      :variant="isFollower ? 'primary' : 'default'"
      :loading="pending === 'follower'"
      :aria-label="tooltip('follower')"
      :title="tooltip('follower')"
      :class="{ 'relation-actions__btn--active': isFollower }"
      @click="handleClick('follower')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    </BaseButton>

    <BaseButton
      v-if="!isBlocked"
      size="sm"
      :variant="isRival ? 'destructive' : 'default'"
      :loading="pending === 'rival'"
      :aria-label="tooltip('rival')"
      :title="tooltip('rival')"
      :class="{ 'relation-actions__btn--active': isRival }"
      @click="handleClick('rival')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m14.5 17.5 7-7" />
        <path d="m9.5 17.5-7-7" />
        <path d="M14.5 6.5 21 13" />
        <path d="M9.5 6.5 3 13" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
      </svg>
    </BaseButton>

    <BaseButton
      size="sm"
      :variant="isBlocked ? 'destructive' : 'default'"
      :loading="pending === 'blocked'"
      :aria-label="tooltip('blocked')"
      :title="tooltip('blocked')"
      :class="{ 'relation-actions__btn--active': isBlocked }"
      @click="handleClick('blocked')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    </BaseButton>

    <span v-if="errorMessage" class="relation-actions__error" role="alert">
      {{ errorMessage }}
    </span>

    <BaseModal
      :open="showBlockModal"
      title="Block this user?"
      max-width="420px"
      @close="cancelBlockConfirm"
    >
      <p class="relation-actions__confirm-text">
        You are about to block <strong>{{ targetLabel }}</strong>. Their stats and
        scores will be hidden from you, and any existing follow or rival relation
        between you both will be removed.
      </p>

      <template #footer>
        <BaseButton size="sm" @click="cancelBlockConfirm">Cancel</BaseButton>
        <BaseButton
          size="sm"
          variant="destructive"
          :loading="pending === 'blocked'"
          @click="confirmBlock"
        >
          Block
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.relation-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.relation-actions__btn--active {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.relation-actions__error {
  font-size: var(--text-caption);
  color: var(--error);
}

.relation-actions__confirm-text {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-primary);
  line-height: 1.5;
}

.relation-actions__confirm-text strong {
  color: var(--text-primary);
  font-weight: 600;
}
</style>
