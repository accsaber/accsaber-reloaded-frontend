<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Rule } from '@/types/display'
import { ref } from 'vue'

defineProps<{
  title: string
  lead: string
  rules: Rule[]
  note: string
}>()

const open = ref(false)
</script>

<template>
  <BaseButton @click="open = true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
    Rules
  </BaseButton>

  <BaseModal :open="open" :title="title" max-width="480px" @close="open = false">
    <div class="rules">
      <p class="rules__text">{{ lead }}</p>
      <ul class="rules__list">
        <li v-for="rule in rules" :key="rule.title">
          <h3 class="card-title">{{ rule.title }}</h3>
          <p class="rules__text">{{ rule.text }}</p>
        </li>
      </ul>
      <p class="rules__text rules__note">{{ note }}</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.rules,
.rules__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.rules__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rules__text {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
  text-wrap: pretty;
}

.rules__note {
  color: var(--text-primary);
}
</style>
