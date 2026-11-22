<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import PreviewModifierPicker from '@/components/domain/PreviewModifierPicker.vue'
import PreviewPicker from '@/components/domain/PreviewPicker.vue'
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { PHONE_MEDIA_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import { usePreviewTheme } from '@/composables/usePreviewTheme'
import { useAuthStore } from '@/stores/auth'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { PREVIEW_SLOTS, usePreviewStore, type PreviewSlotKey } from '@/stores/preview'
import type { ItemResponse, UnusualEffectResponse } from '@/types/api/items'
import { itemVariantPreviews, variantColumns } from '@/utils/items'
import { thumbnailHostAttrs } from '@/utils/cosmetics/readers'
import { computed, onMounted, ref } from 'vue'

const preview = usePreviewStore()
const authStore = useAuthStore()
const modifierStore = useItemModifierStore()

usePreviewTheme()

const expanded = ref(false)
const phone = useMediaQuery(PHONE_MEDIA_QUERY)
const items = ref<ItemResponse[]>([])
const effects = ref<UnusualEffectResponse[]>([])

onMounted(async () => {
  try {
    const [{ getAdminItems }, { getAdminUnusualEffects }] = await Promise.all([
      import('@/api/admin/items'),
      import('@/api/admin/unusual-effects'),
    ])
    const [itemList, effectList] = await Promise.all([
      getAdminItems({ includeInactive: true }),
      getAdminUnusualEffects(true),
      modifierStore.fetchModifiers(),
    ])
    items.value = itemList
    effects.value = effectList
  } catch {
    items.value = []
    effects.value = []
  }
})

const rows = computed(() =>
  PREVIEW_SLOTS.map((slot) => {
    const state = preview.slots[slot.key]
    return {
      ...slot,
      state,
      items: items.value.filter((item) => item.typeKey === slot.typeKey),
      variants: (state.item && itemVariantPreviews(state.item)) || [],
    }
  }),
)

function pickItem(key: PreviewSlotKey, id: string) {
  const item = items.value.find((candidate) => candidate.id === id) ?? null
  preview.slots[key].item = item
  preview.slots[key].variant = (item && itemVariantPreviews(item)?.[0]?.key) ?? null
}

function pickEffect(key: PreviewSlotKey, id: string) {
  preview.slots[key].effect = effects.value.find((effect) => effect.id === id) ?? null
}

const availableModifiers = computed(() =>
  modifierStore.modifiers.filter((m) => m.key !== 'unusual'),
)

const {
  titleValue,
  borderShapeValue,
  borderColorValue,
  titleEffects,
  borderEffects,
  thumbnailValue,
  thumbnailEffects,
} = useEquippedRenderProps(() => preview.overrides)

const thumbAttrs = computed(() => thumbnailHostAttrs(thumbnailValue.value))

const summary = computed(() =>
  rows.value
    .flatMap(({ state }) => [
      state.item?.name,
      state.effect && (state.effect.name || state.effect.key),
      ...state.modifiers.map((m) => m.name),
    ])
    .filter(Boolean)
    .join(', '),
)
</script>

<template>
  <div class="preview-dock" role="region" aria-label="Cosmetic preview">
    <Transition name="collapse">
      <div v-if="expanded" class="collapsible">
        <div class="preview-dock__panel">
          <div class="preview-dock__stage" v-bind="thumbAttrs">
            <ThumbnailBackdrop :value="thumbnailValue" :effects="thumbnailEffects" />
            <LevelBadge :level="30" :current-xp="600" :required-xp="1000"
              :avatar-url="authStore.userProfile?.avatarUrl || undefined" fallback-title="Preview"
              :equipped-title="titleValue" :equipped-border-shape="borderShapeValue"
              :equipped-border-color="borderColorValue" :title-effects="titleEffects" :border-effects="borderEffects"
              hide-progress />
          </div>

          <div class="preview-dock__rows">
            <template v-for="row in rows" :key="row.key">
              <span class="field-label">{{ row.label }}</span>
              <PreviewPicker class="preview-dock__item" :model-value="row.state.item?.id ?? ''" :items="row.items"
                placeholder="None" @update:model-value="pickItem(row.key, $event)" />
              <PreviewPicker :model-value="row.state.effect?.id ?? ''" :effects="effects" placeholder="No effect"
                @update:model-value="pickEffect(row.key, $event)" />
              <PreviewModifierPicker v-model="row.state.modifiers" :modifiers="availableModifiers" />
              <Transition name="collapse">
                <div v-if="row.variants.length" class="preview-dock__variants collapsible">
                  <div>
                    <BaseTabs variant="segmented" :columns="variantColumns(row.variants.length, phone)"
                      :label="`${row.label} variant`" :tabs="row.variants" :model-value="row.state.variant ?? ''"
                      @update:model-value="row.state.variant = $event" />
                  </div>
                </div>
              </Transition>
            </template>
          </div>
        </div>
      </div>
    </Transition>

    <button type="button" class="preview-dock__bar" :aria-expanded="expanded" @click="expanded = !expanded">
      <span class="card-title">Preview</span>
      <span class="preview-dock__summary caption">{{ summary }}</span>
      <svg class="preview-dock__chevron" :class="{ 'preview-dock__chevron--open': expanded }" width="16" height="16"
        viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.preview-dock {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  z-index: 95;
  width: min(880px, calc(100vw - 2 * var(--space-md)));
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-bottom: none;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
}

.preview-dock__panel {
  display: flex;
  align-items: flex-start;
  gap: var(--space-lg);
  max-height: calc(100vh - 160px);
  padding: var(--space-md) var(--space-lg) var(--space-sm);
  overflow-y: auto;
}

.preview-dock__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.preview-dock__stage :deep(.level-badge) {
  position: relative;
}

.preview-dock__rows {
  display: grid;
  grid-template-columns: max-content minmax(0, 3fr) minmax(0, 3fr) minmax(0, 2fr);
  align-items: center;
  column-gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.preview-dock__rows > :not(.preview-dock__variants) {
  margin-top: var(--space-sm);
}

.preview-dock__variants > div {
  padding-top: var(--space-sm);
}

.preview-dock__rows :deep(.base-select__trigger) {
  min-width: 0;
  padding-inline: var(--space-sm);
}

.preview-dock__variants {
  grid-column: 2 / -1;
}

.preview-dock__bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  height: calc(var(--control-h) + var(--space-sm));
  padding: 0 var(--space-lg);
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.preview-dock__summary {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-dock__chevron {
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform var(--dur-enter) var(--ease-in-out);
}

.preview-dock__chevron--open {
  transform: rotate(180deg);
}

.preview-dock__bar:hover .preview-dock__chevron {
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .preview-dock__stage {
    display: none;
  }

  .preview-dock__rows {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-dock__rows > .field-label,
  .preview-dock__item,
  .preview-dock__variants {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .preview-dock__chevron {
    transition: none;
  }
}
</style>
