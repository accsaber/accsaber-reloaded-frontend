<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import UnusualEffectTile from '@/components/domain/UnusualEffectTile.vue'
import type { UnusualEffectResponse } from '@/types/api/items'
import { isSeeded, readTrait } from '@/utils/items'

defineProps<{
  open: boolean
  effect: UnusualEffectResponse | null
}>()

defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal :open="open" :title="effect?.name" max-width="340px" @close="$emit('close')">
    <div v-if="effect" class="epm">
      <UnusualEffectTile :name="effect.name" :effect-spec="effect.effectSpec" :size="220" />
      <p v-if="isSeeded(effect.effectSpec)" class="caption epm__text">Seeded · {{ readTrait(effect.effectSpec) }}</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.epm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.epm__text {
  margin: 0;
  text-align: center;
}

.epm :deep(.ue-tile__name) {
  display: none;
}
</style>
