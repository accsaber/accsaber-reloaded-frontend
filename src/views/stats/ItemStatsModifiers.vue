<script setup lang="ts">
import ModifierChip from '@/components/domain/ModifierChip.vue'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { resolveModifierRefs } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  modifiers: unknown
  unusualEffect?: string | null
}>()

const modifierStore = useItemModifierStore()
const resolved = computed(() => resolveModifierRefs(props.modifiers, modifierStore.byKey))
</script>

<template>
  <div class="modifiers-cell">
    <template v-if="resolved.length || unusualEffect">
      <ModifierChip v-for="mod in resolved" :key="mod.id" :modifier="mod" />
      <span v-if="unusualEffect" class="modifiers-cell__unusual">{{ unusualEffect }}</span>
    </template>
    <span v-else class="modifiers-cell__none">None</span>
  </div>
</template>

<style scoped>
.modifiers-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.modifiers-cell__unusual {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--tier-gold) 50%, transparent);
  background: color-mix(in srgb, var(--tier-gold) 10%, transparent);
  color: var(--tier-gold);
}

.modifiers-cell__none {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
