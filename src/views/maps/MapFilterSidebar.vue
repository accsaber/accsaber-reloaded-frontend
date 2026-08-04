<script setup lang="ts">
import RangeSlider from '@/components/common/RangeSlider.vue'
import { useCategoryStore } from '@/stores/categories'
import { computed, ref, useId, watch } from 'vue'

const props = withDefaults(defineProps<{
  selectedCategory: string | null
  complexityRange: [number, number]
  unplayedOnly?: boolean
  showUnplayed?: boolean
  showComplexity?: boolean
}>(), {
  showComplexity: true,
})

const emit = defineEmits<{
  'update:selectedCategory': [categoryId: string | null]
  'update:complexityRange': [range: [number, number]]
  'update:unplayedOnly': [value: boolean]
}>()

const categoryStore = useCategoryStore()

const categoryGroup = useId()

const filterableCategories = computed(() =>
  categoryStore.categoryInfoList.filter((c) => c.code !== 'overall' && c.code !== 'xp')
)

const localRange = ref<[number, number]>([...props.complexityRange])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.complexityRange, (val) => {
  localRange.value = [...val]
})

function onRangeChange(val: [number, number]) {
  localRange.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:complexityRange', val)
  }, 400)
}

function selectCategory(code: string) {
  emit('update:selectedCategory', categoryStore.getCategoryId(code) ?? null)
}

function isSelected(code: string) {
  return props.selectedCategory !== null && props.selectedCategory === categoryStore.getCategoryId(code)
}
</script>

<template>
  <div class="map-filters">
    <h3 class="map-filters__title">Filters</h3>

    <div class="map-filters__section">
      <h4 class="map-filters__heading">Category</h4>
      <div class="map-filters__categories">
        <label class="map-filters__cat-label">
          <input
            type="radio"
            class="map-filters__control"
            :name="categoryGroup"
            :checked="selectedCategory === null"
            @change="emit('update:selectedCategory', null)"
          />
          <span class="map-filters__cat-dot map-filters__cat-dot--all" />
          <span>All</span>
        </label>
        <label
          v-for="info in filterableCategories"
          :key="info.code"
          class="map-filters__cat-label"
        >
          <input
            type="radio"
            class="map-filters__control"
            :name="categoryGroup"
            :checked="isSelected(info.code)"
            @change="selectCategory(info.code)"
          />
          <span class="map-filters__cat-dot" :style="{ background: info.accent }" />
          <span>{{ info.name }}</span>
        </label>
      </div>
    </div>

    <div v-if="showComplexity" class="map-filters__section">
      <RangeSlider
        label="Complexity"
        :min="0"
        :max="20"
        :step="0.5"
        :model-value="localRange"
        @update:model-value="onRangeChange"
      />
    </div>

    <div v-if="showUnplayed" class="map-filters__section">
      <h4 class="map-filters__heading">Player</h4>
      <label class="map-filters__cat-label">
        <input
          type="checkbox"
          class="map-filters__control"
          :checked="unplayedOnly"
          @change="emit('update:unplayedOnly', !unplayedOnly)"
        />
        <span class="map-filters__cat-dot map-filters__cat-dot--unplayed" />
        <span>Unplayed only</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.map-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.map-filters__title {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.map-filters__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.map-filters__heading {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.map-filters__categories {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.map-filters__cat-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-primary);
  cursor: pointer;
}

.map-filters__control {
  accent-color: var(--accent);
  cursor: pointer;
}

.map-filters__cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-filters__cat-dot--all {
  border: 1px solid var(--text-tertiary);
}

.map-filters__cat-dot--unplayed {
  background: var(--info);
}
</style>
