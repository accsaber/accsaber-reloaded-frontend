<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import UnusualEffectTile from '@/components/domain/UnusualEffectTile.vue'
import type { ItemResponse, UnusualEffectResponse } from '@/types/api/items'
import { rarityClass } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  placeholder: string
  items?: ItemResponse[]
  effects?: UnusualEffectResponse[]
}>()

const model = defineModel<string>({ required: true })

const itemsById = computed(() => new Map(props.items?.map((item) => [item.id, item])))
const effectsById = computed(() => new Map(props.effects?.map((effect) => [effect.id, effect])))

const options = computed(() => [
  { value: '', label: props.placeholder },
  ...(props.items?.map((item) => ({ value: item.id, label: item.name || 'Untitled' })) ?? []),
  ...(props.effects?.map((effect) => ({ value: effect.id, label: effect.name || effect.key })) ?? []),
])
</script>

<template>
  <BaseSelect v-model="model" :options="options" searchable>
    <template v-for="name in ['value', 'option'] as const" :key="name" #[name]="{ option }">
      <template v-if="option">
        <span class="preview-picker__thumb">
          <ItemPreview v-if="itemsById.get(option.value)" :item="itemsById.get(option.value)!" />
          <UnusualEffectTile v-else-if="effectsById.get(option.value)" :name="option.label"
            :effect-spec="effectsById.get(option.value)!.effectSpec" :size="24" />
        </span>
        <span class="preview-picker__label">{{ option.label }}</span>
        <span v-if="name === 'option' && itemsById.get(option.value)" class="caption rarity-text"
          :class="rarityClass(itemsById.get(option.value)!.rarity)">
          {{ itemsById.get(option.value)!.rarity }}
        </span>
      </template>
    </template>
  </BaseSelect>
</template>

<style>
.preview-picker__thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-input);
  overflow: hidden;
}

.preview-picker__thumb .ue-tile__name {
  display: none;
}

.preview-picker__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
