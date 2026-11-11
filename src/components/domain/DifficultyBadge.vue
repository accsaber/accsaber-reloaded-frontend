<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  difficulty: string
}>()

const COLOR_BY_DIFFICULTY: Record<string, string> = {
  EASY: 'difficulty-badge--easy',
  NORMAL: 'difficulty-badge--normal',
  HARD: 'difficulty-badge--hard',
  EXPERT: 'difficulty-badge--expert',
  EXPERT_PLUS: 'difficulty-badge--expert-plus',
}

const LABEL_BY_DIFFICULTY: Record<string, string> = {
  EASY: 'Easy',
  NORMAL: 'Normal',
  HARD: 'Hard',
  EXPERT: 'Expert',
  EXPERT_PLUS: 'Expert+',
}

const colorClass = computed(
  () => COLOR_BY_DIFFICULTY[props.difficulty] ?? 'difficulty-badge--expert-plus',
)
const label = computed(
  () => LABEL_BY_DIFFICULTY[props.difficulty] ?? props.difficulty,
)
</script>

<template>
  <span class="difficulty-badge" :class="colorClass">{{ label }}</span>
</template>

<style scoped>
.difficulty-badge {
  display: inline-flex;
  align-items: center;
  color: var(--badge-color);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.difficulty-badge--easy { --badge-color: var(--diff-easy); }
.difficulty-badge--normal { --badge-color: var(--diff-normal); }
.difficulty-badge--hard { --badge-color: var(--diff-hard); }
.difficulty-badge--expert { --badge-color: var(--diff-expert); }
.difficulty-badge--expert-plus { --badge-color: var(--diff-expert-plus); }
</style>
