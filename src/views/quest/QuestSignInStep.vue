<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { UserRefDisplay } from '@/types/display'

defineProps<{
  user: UserRefDisplay | null
}>()

defineEmits<{
  'sign-in': []
}>()
</script>

<template>
  <div class="sign-in">
    <template v-if="user">
      <div class="sign-in__identity">
        <UserChip :user="user" link />
        <BaseButton size="sm" @click="$emit('sign-in')">Not you?</BaseButton>
      </div>
      <p class="sign-in__note">
        The mod you generate next is tied to this account.
      </p>
    </template>

    <EmptyState v-else message="Sign in to generate a mod linked to your AccSaber account."
      action-label="Sign in" @action="$emit('sign-in')" />
  </div>
</template>

<style scoped>
.sign-in {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.sign-in__identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.sign-in__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}
</style>
