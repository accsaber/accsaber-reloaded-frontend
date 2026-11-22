<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import SwapList from '@/components/common/SwapList.vue'
import type { CratePool } from '@/components/domain/CratePoolPreview.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse } from '@/types/api/items'
import { rarityClass } from '@/utils/items'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { defineAsyncComponent, onMounted, ref } from 'vue'

const CratePoolPreview = defineAsyncComponent(() => import('@/components/domain/CratePoolPreview.vue'))
const CratePreviewOpenOverlay = defineAsyncComponent(() => import('./CratePreviewOpenOverlay.vue'))

usePageMeta({
  title: 'Crates | AccSaber Creatives',
  description: 'Crate authoring tools for AccSaber creatives.',
})

const COUNT_KEY = 'creatives-crates'

const itemTypeStore = useItemTypeStore()

const crates = ref<ItemResponse[]>([])
const loading = ref(true)
const errored = ref(false)

const selectedCrate = ref<ItemResponse | null>(null)
const previewOpen = ref(false)
const rolling = ref<CratePool | null>(null)

function statusOf(crate: ItemResponse): string | null {
  if (crate.deprecated) return 'Deprecated'
  if (!crate.active) return 'Draft'
  return null
}

async function load() {
  loading.value = true
  errored.value = false
  try {
    const [{ getAdminItems }] = await Promise.all([
      import('@/api/admin/items'),
      itemTypeStore.fetchItemTypes(),
    ])
    const typeId = itemTypeStore.byKey.get('crate')?.id
    crates.value = typeId ? await getAdminItems({ typeId, includeInactive: true }) : []
    rememberCount(COUNT_KEY, crates.value.length)
  } catch {
    errored.value = true
  } finally {
    loading.value = false
  }
}

function openPreview(crate: ItemResponse) {
  selectedCrate.value = crate
  previewOpen.value = true
}

onMounted(load)
</script>

<template>
  <div class="crates">
    <h1>Crates</h1>

    <EmptyState v-if="errored" message="Could not load the crates" action-label="Try again" @action="load" />
    <EmptyState v-else-if="!loading && !crates.length" message="No crates yet" />

    <SwapList v-else class="crates__grid" :items="crates" :item-key="(crate) => crate.id" :loading="loading"
      :placeholders="knownCount(COUNT_KEY, 4)">
      <template #placeholder>
        <div class="crates__ghost card-ghost placeholder" aria-hidden="true" />
      </template>
      <template #default="{ item, swap }">
        <button type="button" class="crate-card pressable" v-bind="swap" @click="openPreview(item)">
          <span class="crate-card__art">
            <ItemPreview :item="item" />
          </span>
          <span class="crate-card__body">
            <span class="crate-card__line card-title">{{ item.name || 'Untitled crate' }}</span>
            <span class="crate-card__line caption">
              <span class="rarity-text" :class="rarityClass(item.rarity)">{{ item.rarity }}</span>
              <template v-if="statusOf(item)"> · {{ statusOf(item) }}</template>
            </span>
          </span>
        </button>
      </template>
    </SwapList>

    <template v-if="selectedCrate">
      <CratePoolPreview :open="previewOpen" :crate="selectedCrate" staff @close="previewOpen = false"
        @preview-open="rolling = $event" />
      <CratePreviewOpenOverlay v-if="rolling" :crate="selectedCrate" :contents="rolling.contents"
        :crate-modifiers="rolling.modifiers" :unusual-effects="rolling.effects"
        @close="rolling = null" />
    </template>
  </div>
</template>

<style scoped>
.crates {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.crates__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}

.crates__ghost {
  --ghost-body: 78px;
}

.crate-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.crate-card:hover {
  border-color: var(--text-tertiary);
}

.crate-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.crate-card__art {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: var(--bg-base);
}

.crate-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding: var(--space-md);
}

.crate-card__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


@media (max-width: 767px) {
  .crates__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
