<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  complexity: number
  difficulty?: string
}>()

const colorClass = computed(() => {
  if (props.difficulty) {
    const map: Record<string, string> = {
      EASY: 'complexity-badge--easy',
      NORMAL: 'complexity-badge--normal',
      HARD: 'complexity-badge--hard',
      EXPERT: 'complexity-badge--expert',
      EXPERT_PLUS: 'complexity-badge--expert-plus',
    }
    return map[props.difficulty] ?? 'complexity-badge--expert-plus'
  }
  const c = props.complexity
  if (c < 3) return 'complexity-badge--easy'
  if (c < 6) return 'complexity-badge--normal'
  if (c < 9) return 'complexity-badge--hard'
  if (c < 12) return 'complexity-badge--expert'
  return 'complexity-badge--expert-plus'
})

const formatted = computed(() => props.complexity.toFixed(1))
</script>

<template>
  <span class="complexity-badge" :class="colorClass">
    {{ formatted }}
  </span>
</template>

<style scoped>
.complexity-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-sm);
  border: 1px solid var(--badge-color);
  border-radius: var(--radius-pill);
  color: var(--badge-color);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  line-height: 1.4;
}

.complexity-badge--easy {
  --badge-color: var(--diff-easy);
}

.complexity-badge--normal {
  --badge-color: var(--diff-normal);
}

.complexity-badge--hard {
  --badge-color: var(--diff-hard);
}

.complexity-badge--expert {
  --badge-color: var(--diff-expert);
}

.complexity-badge--expert-plus {
  --badge-color: var(--diff-expert-plus);
}
</style>
