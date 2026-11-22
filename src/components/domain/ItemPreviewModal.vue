<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import BorderComposition from '@/components/domain/BorderComposition.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { useAuthStore } from '@/stores/auth'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse } from '@/types/api/items'
import { isTitleItem, itemVariantPreviews, rarityClass } from '@/utils/items'
import { readBorderColorValue, readBorderShapeValue } from '@/utils/cosmetics/readers'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  item: ItemResponse | null
}>()

const emit = defineEmits<{ close: [] }>()

const authStore = useAuthStore()
const avatarUrl = computed(() => authStore.userProfile?.avatarUrl ?? null)

const variants = computed(() => (props.item ? itemVariantPreviews(props.item) : null))
const activeVariant = ref('')

watch(
  () => [props.item, props.open] as const,
  () => {
    if (props.open) activeVariant.value = variants.value?.[0]?.key ?? ''
  },
  { immediate: true },
)

const previewItem = computed<ItemResponse | null>(() => {
  if (!props.item) return null
  if (!variants.value) return props.item
  const match = variants.value.find((v) => v.key === activeVariant.value) ?? variants.value[0]
  return match.item
})

const isBorder = computed(
  () =>
    previewItem.value?.typeKey === 'profile_border_shape' ||
    previewItem.value?.typeKey === 'profile_border_color',
)

const isTitle = computed(() => isTitleItem(previewItem.value?.typeKey))

const shapeValue = computed(() =>
  previewItem.value?.typeKey === 'profile_border_shape'
    ? readBorderShapeValue(previewItem.value.value)
    : null,
)
const colorValue = computed(() =>
  previewItem.value?.typeKey === 'profile_border_color'
    ? readBorderColorValue(previewItem.value.value)
    : null,
)

const itemTypeStore = useItemTypeStore()
const typeLabel = computed(() => (props.item ? itemTypeStore.typeLabel(props.item.typeKey) : ''))
</script>

<template>
  <BaseModal :open="open" :title="item?.name" max-width="460px" @close="emit('close')">
    <div v-if="item" class="ipm">
      <div class="ipm__art"
        :class="[rarityClass(item.rarity), { 'ipm__art--wide': isTitle, 'ipm__art--border': isBorder }]">
        <BorderComposition
          v-if="isBorder"
          :shape="shapeValue"
          :color="colorValue"
          :avatar-url="avatarUrl"
        />
        <ItemPreview v-else :item="previewItem ?? item" />
      </div>

      <span class="caption">
        <span class="rarity-text" :class="rarityClass(item.rarity)">{{ item.rarity }}</span> · {{ typeLabel }}
      </span>
      <p v-if="item.description" class="ipm__desc">{{ item.description }}</p>

      <BaseTabs v-if="variants" v-model="activeVariant" class="ipm__variants" :tabs="variants" variant="segmented"
        label="Variants" />

      <p v-if="isBorder && !avatarUrl" class="caption">Log in to preview this on your profile picture</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.ipm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  text-align: center;
}

.ipm__art {
  --cell-accent: var(--rarity-color, var(--text-tertiary));
  display: flex;
  align-items: center;
  justify-content: center;
  width: 172px;
  height: 172px;
  border-radius: var(--radius-card);
  background: var(--bg-base);
  overflow: hidden;
}

.ipm__art--wide {
  width: max-content;
  min-width: 200px;
  max-width: 100%;
  height: 104px;
  padding-inline: var(--space-lg);
}

.ipm__art--border {
  width: 208px;
  height: 208px;
  background: none;
  overflow: visible;
}

.ipm__art--wide :deep(.item-preview__title),
.ipm__art--wide :deep(.title-renderer__text) {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
}


.ipm__desc {
  margin: 0;
  max-width: 40ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.ipm__variants {
  justify-content: center;
}
</style>
