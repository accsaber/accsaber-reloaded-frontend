<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  difficulty: MapDifficultyResponse
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const categoryStore = useCategoryStore()

const value = ref('')
const loading = ref(false)
const error = ref('')

const options = computed(() =>
  categoryStore.categories
    .filter((c) => c.code !== 'overall')
    .map((c) => ({ value: c.id, label: c.name })),
)

watch(() => props.open, (open) => {
  if (!open) return
  value.value = props.difficulty.categoryId
  error.value = ''
})

async function save() {
  if (!value.value) return
  loading.value = true
  error.value = ''
  try {
    const { updateMapCategory } = await import('@/api/ranking/maps')
    await updateMapCategory(props.difficulty.id, { categoryId: value.value })
    emit('saved')
  } catch (e) {
    error.value = parseApiError(e, 'Update failed.').message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" title="Change Category" max-width="400px" @close="emit('close')">
    <BaseSelect v-model="value" :options="options" label="Category" />
    <p v-if="error" class="error">{{ error }}</p>
    <template #footer>
      <div class="modal-actions">
        <BaseButton @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="loading" @click="save">Save</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.error {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}
</style>
