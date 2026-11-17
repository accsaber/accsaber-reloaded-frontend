<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseTabs from '@/components/common/BaseTabs.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { Tab } from '@/types/display'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  categoryCode: string
  editable: boolean
}>()

const emit = defineEmits<{
  updated: [difficulty: MapDifficultyResponse]
}>()

const categoryStore = useCategoryStore()

const picking = ref(false)
const saving = ref(false)
const error = ref('')

const name = computed(() => categoryStore.getCategoryInfo(props.categoryCode)?.name ?? props.categoryCode)

const tabs = computed<Tab[]>(() =>
  categoryStore.categories
    .filter((c) => c.code !== 'overall')
    .map((c) => ({ key: c.id, label: categoryStore.getShortName(c.code), accentColor: categoryStore.getAccent(c.code) })),
)

watch(() => props.difficulty.id, () => {
  picking.value = false
  error.value = ''
})

async function pick(categoryId: string) {
  picking.value = false
  if (categoryId === props.difficulty.categoryId) return
  saving.value = true
  error.value = ''
  try {
    const { updateMapCategory } = await import('@/api/ranking/maps')
    emit('updated', await updateMapCategory(props.difficulty.id, { categoryId }))
  } catch (err) {
    error.value = parseApiError(err, 'Could not change the category').message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <span class="category" @keydown.escape="picking = false">
    <BaseTabs v-if="picking" class="category__tabs" variant="segmented" label="Category" :tabs="tabs"
      :model-value="difficulty.categoryId" @update:model-value="pick" />
    <button v-else-if="editable" type="button" class="category__name pressable" :disabled="saving"
      :style="{ color: categoryStore.getAccent(categoryCode) }"
      :aria-label="`Change category, ${name}`" @click="picking = true">
      {{ name }}
    </button>
    <span v-else class="category__name" :style="{ color: categoryStore.getAccent(categoryCode) }">
      {{ name }}
    </span>
    <span v-if="error" class="caption category__error" role="alert">{{ error }}</span>
  </span>
</template>

<style scoped>
.category {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.category__name {
  padding: 0;
  font: inherit;
  font-weight: 600;
  background: none;
  border: none;
}

button.category__name {
  cursor: pointer;
}

.category__tabs :deep(.base-tabs__tab--active) {
  color: var(--tab-accent);
}

.category__error {
  color: var(--error);
}
</style>
