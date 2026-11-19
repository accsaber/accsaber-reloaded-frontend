<script setup lang="ts">
import ReasonEdit from '@/components/domain/ReasonEdit.vue'
import { formatRelativeDate } from '@/utils/formatters'

defineProps<{
  at: string
  reason?: string
  save?: (reason: string) => Promise<void>
}>()
</script>

<template>
  <div class="deactivation">
    <span class="caption">Rejected {{ formatRelativeDate(at) }}</span>
    <ReasonEdit v-if="reason || save" :reason="reason" :save="save" />
  </div>
</template>

<style scoped>
.deactivation {
  display: flex;
  flex-basis: 100%;
  flex-direction: column;
  gap: 2px;
  max-width: 65ch;
}
</style>
