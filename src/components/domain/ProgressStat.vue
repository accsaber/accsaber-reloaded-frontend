<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
import StatBlock from '@/components/common/StatBlock.vue'

defineProps<{
  label: string
  value: number
  ratio?: number | null
  note?: string
}>()
</script>

<template>
  <StatBlock class="progress-stat" :label="label" :value="value" :decimals="0">
    <div v-if="ratio != null" class="progress-stat__bar">
      <ProgressBar :value="ratio" />
    </div>
    <p v-if="note" class="caption">{{ note }}</p>
  </StatBlock>
</template>

<style scoped>
.stat-block.progress-stat {
  padding: 0;
}

.progress-stat__bar {
  display: flex;
}
</style>
