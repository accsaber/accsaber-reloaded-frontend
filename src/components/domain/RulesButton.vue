<script setup lang="ts">
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
  <button type="button" class="rules-btn" @click="open = true">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
    Rules
  </button>

  <BaseModal :open="open" :title="title" max-width="480px" @close="open = false">
    <div class="rules">
      <p class="rules__lead">{{ lead }}</p>
      <ol class="rules__list">
        <li v-for="(rule, i) in rules" :key="rule.title" class="rules__rule">
          <span class="rules__num" aria-hidden="true">{{ i + 1 }}</span>
          <span class="rules__text">
            <strong>{{ rule.title }}</strong> {{ rule.text }}
          </span>
        </li>
      </ol>
      <p class="rules__note">{{ note }}</p>
      <div v-if="$slots.default" class="rules__aside">
        <slot />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.rules-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 3px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.rules-btn:hover {
  color: var(--text-primary);
}

.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.rules__lead {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.rules__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rules__rule {
  display: flex;
  gap: var(--space-sm);
  align-items: baseline;
}

.rules__num {
  flex-shrink: 0;
  min-width: 16px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-align: right;
}

.rules__text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.rules__text strong {
  font-weight: 600;
  color: var(--text-primary);
}

.rules__note {
  margin: var(--space-sm) 0 0;
  padding: var(--space-md);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
  border-radius: 4px;
}

.rules__aside {
  margin-top: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.rules__aside :deep(p) {
  margin: 0;
}

.rules__aside :deep(h3) {
  margin: 0 0 var(--space-xs);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
