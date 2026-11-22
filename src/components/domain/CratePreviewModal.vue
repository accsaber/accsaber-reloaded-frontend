<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import EffectPreviewModal from '@/components/domain/EffectPreviewModal.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import ItemPreviewModal from '@/components/domain/ItemPreviewModal.vue'
import ModifierChip from '@/components/domain/ModifierChip.vue'
import UnusualEffectTile from '@/components/domain/UnusualEffectTile.vue'
import VariantSplitPreview from '@/components/domain/VariantSplitPreview.vue'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type {
  CrateContentResponse,
  CrateModifierResponse,
  ItemResponse,
  UnusualEffectResponse,
} from '@/types/api/items'
import {
  groupCrateContentsByRarity,
  itemVariantPreviews,
  obtainableUntilSentence,
  rarityClass,
  type ItemVariantPreview,
} from '@/utils/items'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { formatChancePercent } from '@/utils/modifiers'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  crate: ItemResponse | null
  contents: CrateContentResponse[]
  contentsLoading?: boolean
  modifiers: CrateModifierResponse[]
  modifiersLoading?: boolean
  effects: UnusualEffectResponse[]
  effectsLoading?: boolean
  ownedItemIds?: Set<string>
  allowOpen?: boolean
}>()

defineEmits<{
  close: []
  previewOpen: []
}>()

const canPreviewOpen = computed(
  () => !!props.allowOpen && !props.contentsLoading && props.contents.length > 0,
)

const obtainableSentence = computed(() =>
  props.crate ? obtainableUntilSentence(props.crate) : null,
)

const modifierStore = useItemModifierStore()

const groups = computed(() => groupCrateContentsByRarity(props.contents))

interface FlatTile {
  content: CrateContentResponse
  label: { rarity: string; chance: number } | null
  runEnd: boolean
  variants: ItemVariantPreview[] | null
}

const flatTiles = computed<FlatTile[]>(() =>
  groups.value.flatMap((g) =>
    g.items.map((content, i) => ({
      content,
      label: i === 0 ? { rarity: g.rarity, chance: g.chance } : null,
      runEnd: i === g.items.length - 1,
      variants: itemVariantPreviews(content.rewardItem),
    })),
  ),
)

const countKey = computed(() => `crate-pool:${props.crate?.id}`)
const ghostTiles = computed(() => knownCount(countKey.value, 12))

watch(
  () => props.contents,
  (contents) => {
    if (contents.length) rememberCount(countKey.value, contents.length)
  },
)

function typeName(typeKey: string): string {
  return typeKey.replace(/^profile_/, '').replace(/_/g, ' ')
}

const hasUnusualModifier = computed(() =>
  props.modifiers.some((cm) => cm.modifier.key === 'unusual'),
)

function modifierDescription(key: string): string | null {
  return modifierStore.byKey.get(key)?.description ?? null
}

function isOwned(itemId: string): boolean {
  return props.ownedItemIds?.has(itemId) ?? false
}

const selectedItem = ref<ItemResponse | null>(null)
const itemOpen = ref(false)
const selectedEffect = ref<UnusualEffectResponse | null>(null)
const effectOpen = ref(false)

function openItem(item: ItemResponse) {
  selectedItem.value = item
  itemOpen.value = true
}

function openEffect(effect: UnusualEffectResponse) {
  selectedEffect.value = effect
  effectOpen.value = true
}

onMounted(() => {
  modifierStore.fetchModifiers()
})
</script>

<template>
  <BaseModal :open="open" :title="crate?.name" max-width="1200px" height="calc(100vh - var(--space-xl) * 2)"
    @close="$emit('close')">
    <div v-if="crate" class="crate-preview">
      <aside class="crate-preview__identity">
        <div class="crate-preview__art">
          <ItemPreview :item="crate" />
        </div>
        <span class="caption rarity-text" :class="rarityClass(crate.rarity)">
          {{ crate.rarity }}
        </span>
        <p v-if="crate.description" class="caption">{{ crate.description }}</p>
        <p v-if="obtainableSentence" class="caption">{{ obtainableSentence }}</p>
      </aside>

      <aside class="crate-preview__modifiers" aria-label="Possible modifiers">
        <span class="field-label">Modifiers</span>

        <ul v-if="modifiersLoading" class="crate-preview__modifiers-body">
          <li v-for="i in 3" :key="i">
            <SkeletonLoader width="180px" :lines="2" />
          </li>
        </ul>

        <p v-else-if="!modifiers.length" class="caption">No modifiers roll on this crate</p>

        <ul v-else class="crate-preview__modifiers-body">
          <li v-for="cm in modifiers" :key="cm.modifier.id" class="crate-preview__modifier-row">
            <span class="crate-preview__modifier-head">
              <ModifierChip :modifier="cm.modifier" />
              <span class="caption">{{ formatChancePercent(cm.dropChance) }}</span>
            </span>
            <span v-if="modifierDescription(cm.modifier.key)" class="caption">
              {{ modifierDescription(cm.modifier.key) }}
            </span>
          </li>
        </ul>
      </aside>

      <section class="crate-preview__items" aria-label="Possible items">
        <span class="field-label">
          Items<template v-if="!contentsLoading && contents.length"> · {{ contents.length }}</template>
        </span>

        <div v-if="contentsLoading" class="crate-preview__items-body">
          <span v-for="i in ghostTiles" :key="i" class="crate-preview__tile crate-preview__tile--ghost placeholder">
            <span class="crate-preview__tile-art" />
            <span class="crate-preview__tile-line">&nbsp;</span>
            <span class="crate-preview__tile-line">&nbsp;</span>
          </span>
        </div>

        <p v-else-if="!contents.length" class="caption">Its contents are a mystery for now</p>

        <div v-else class="crate-preview__items-body">
          <button
            v-for="t in flatTiles"
            :key="t.content.rewardItem.id"
            type="button"
            class="crate-preview__tile pressable"
            :class="[rarityClass(t.content.rewardItem.rarity), { 'crate-preview__tile--run-end': t.runEnd }]"
            :title="`${t.content.rewardItem.name} · ${formatChancePercent(t.content.dropChance)}`"
            @click="openItem(t.content.rewardItem)"
          >
            <span v-if="t.label" class="crate-preview__run-label">
              <span class="caption rarity-text">{{ t.label.rarity }}</span>
              <span class="caption">{{ formatChancePercent(t.label.chance) }}</span>
            </span>
            <span class="crate-preview__tile-art">
              <VariantSplitPreview
                v-if="t.variants"
                :item="t.content.rewardItem"
                :variants="t.variants"
              />
              <ItemPreview v-else :item="t.content.rewardItem" />
              <span v-if="t.variants" class="crate-preview__tile-mark crate-preview__tile-variants">
                {{ t.variants.length }} variants
              </span>
              <span
                v-if="isOwned(t.content.rewardItem.id)"
                class="crate-preview__tile-mark crate-preview__tile-owned"
                role="img"
                aria-label="You own this"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </span>
            <span class="crate-preview__tile-line crate-preview__tile-name">{{ t.content.rewardItem.name }}</span>
            <span class="crate-preview__tile-line crate-preview__tile-meta">{{ typeName(t.content.rewardItem.typeKey) }}</span>
          </button>
        </div>
      </section>

      <section
        v-if="hasUnusualModifier"
        class="crate-preview__effects"
        aria-label="Possible unusual effects"
      >
        <span class="field-label">
          Unusual Effects<template v-if="!effectsLoading && effects.length"> · Equal chance</template>
        </span>

        <div v-if="effectsLoading" class="crate-preview__effects-grid">
          <SkeletonLoader v-for="i in 10" :key="i" width="96px" height="118px" />
        </div>

        <p v-else-if="!effects.length" class="caption">Rolls the default Unusual sparkle</p>

        <ul v-else class="crate-preview__effects-grid">
          <li v-for="effect in effects" :key="effect.id">
            <button
              type="button"
              class="crate-preview__effect-btn pressable"
              :title="effect.name"
              @click="openEffect(effect)"
            >
              <UnusualEffectTile :name="effect.name" :effect-spec="effect.effectSpec" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <ItemPreviewModal :open="itemOpen" :item="selectedItem" @close="itemOpen = false" />
    <EffectPreviewModal :open="effectOpen" :effect="selectedEffect" @close="effectOpen = false" />

    <template v-if="allowOpen" #footer>
      <BaseButton variant="primary" :disabled="!canPreviewOpen" @click="$emit('previewOpen')">
        Preview open
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.crate-preview {
  display: flow-root;
}

.crate-preview__identity {
  float: left;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0 var(--space-xl) var(--space-lg) 0;
}

.crate-preview__art {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  background: var(--bg-base);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.crate-preview__art :deep(img),
.crate-preview__tile-art :deep(img) {
  max-width: 75%;
  max-height: 75%;
  object-fit: contain;
}


.crate-preview__items {
  min-width: 0;
}

.crate-preview__items-body {
  min-width: 0;
  margin-top: var(--space-sm);
  font-size: 0;
}

.crate-preview__modifiers {
  float: right;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0 0 var(--space-lg) var(--space-xl);
}

.crate-preview__modifiers-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.crate-preview__modifier-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.crate-preview__modifier-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.crate-preview__run-label {
  position: absolute;
  top: -22px;
  left: 0;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
  white-space: nowrap;
}

.crate-preview__tile {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 116px;
  min-width: 0;
  vertical-align: top;
  margin: 26px var(--space-sm) var(--space-sm) 0;
  padding: var(--space-xs) 0 0;
  appearance: none;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.crate-preview__tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: calc(-1 * var(--space-sm));
  height: 1px;
  background: var(--rarity-color, var(--text-tertiary));
}

.crate-preview__tile--run-end::before {
  right: 0;
}

.crate-preview__tile--ghost::before {
  content: none;
}

.crate-preview__tile-art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-base);
  border: 1px solid transparent;
  border-radius: var(--radius-input);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.crate-preview__tile:hover .crate-preview__tile-art {
  border-color: var(--text-tertiary);
}

.crate-preview__tile-mark {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  background: var(--bg-base);
  border-radius: var(--radius-pill);
}

.crate-preview__tile-owned {
  top: var(--space-xs);
  right: var(--space-xs);
  width: 16px;
  color: var(--success);
}

.crate-preview__tile-variants {
  left: var(--space-xs);
  bottom: var(--space-xs);
  padding: 0 var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.crate-preview__tile-line {
  font-size: var(--text-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crate-preview__tile-name {
  color: var(--text-primary);
}

.crate-preview__tile-meta {
  color: var(--text-tertiary);
  text-transform: capitalize;
}

.crate-preview__effects {
  clear: both;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
}

.crate-preview__effects-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.crate-preview__effect-btn {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  display: block;
}

.crate-preview__effect-btn:hover :deep(.ue-tile__frame) {
  border-color: var(--text-tertiary);
}

@media (max-width: 767px) {
  .crate-preview__identity,
  .crate-preview__modifiers {
    float: none;
    width: auto;
    margin: 0 0 var(--space-lg);
  }

  .crate-preview__art {
    max-width: 200px;
  }
}
</style>
