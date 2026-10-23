<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'

defineProps<{
  saving: boolean
}>()

const emit = defineEmits<{
  auto: []
}>()
</script>

<template>
  <BaseBanner class="war-halt" variant="warning" role="alert" :dismissible="false">
    Your commander halted your attacks. Your plays won't hit anyone until they lift it.
    <template #actions>
      <BaseButton size="sm" :loading="saving" @click="emit('auto')">Switch to auto</BaseButton>
    </template>
  </BaseBanner>
</template>

<style scoped>
.war-halt {
  max-width: none;
  margin: 0;
}
</style>
