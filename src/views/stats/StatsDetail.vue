<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import { onMounted, ref } from 'vue'

defineProps<{
  title: string
  back: string
  failed?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const root = ref<HTMLElement | null>(null)

onMounted(() => {
  if (root.value && root.value.getBoundingClientRect().top < 0) root.value.scrollIntoView()
})
</script>

<template>
  <section ref="root" class="stats-detail stats-section">
    <header class="stats-detail__head">
      <IconButton icon="back" :label="back" @click="emit('close')" />
      <div class="stats-detail__title">
        <h2 class="card-title">{{ title }}</h2>
        <p class="caption">
          <slot name="meta" />
        </p>
      </div>
    </header>
    <p v-if="failed" class="caption" role="alert">Could not load this. Try again in a moment.</p>
    <slot v-else />
  </section>
</template>

<style scoped>
.stats-detail {
  scroll-margin-top: calc(var(--navbar-height) + var(--space-md));
  overflow-anchor: none;
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}

.stats-detail__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--control-h);
}

.stats-detail__title {
  min-width: 0;
}
</style>
