<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

defineProps<{
  detailOpen: boolean
  detailTitle?: string
}>()

defineEmits<{ closeDetail: [] }>()
</script>

<template>
  <div class="inv-layout">
    <div class="inv-layout__main">
      <slot v-if="$slots.empty" name="empty" />
      <div v-else class="inv-layout__grid">
        <slot />
      </div>
      <slot name="footer" />
    </div>

    <aside class="inv-layout__detail">
      <slot name="detail" />
    </aside>

    <BaseModal :open="detailOpen" :title="detailTitle" @close="$emit('closeDetail')">
      <slot name="detail" />
    </BaseModal>
  </div>
</template>

<style scoped>
.inv-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-lg);
  align-items: start;
}

.inv-layout__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.inv-layout__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-md);
}

.inv-layout__detail {
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
}

@media (max-width: 1023px) {
  .inv-layout {
    grid-template-columns: 1fr;
  }

  .inv-layout__grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .inv-layout__detail {
    display: none;
  }
}

@media (max-width: 639px) {
  .inv-layout__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
