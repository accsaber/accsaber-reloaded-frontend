<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseBanner from '@/components/common/BaseBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import InventoryDetailPanel from '@/components/domain/InventoryDetailPanel.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import InventoryLayout from '@/components/domain/InventoryLayout.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanItemResponse, ClanResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { CLAN_ITEM_SOURCE_LABEL } from '@/utils/clans'
import { asUserItem } from '@/utils/items'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ clan: ClanResponse; canCustomize?: boolean }>()

const emit = defineEmits<{ changed: [] }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'acquiredAt',
  defaultOrder: 'desc',
  defaultSize: 50,
  secondarySort: null,
})

const pageData = ref<Page<ClanItemResponse> | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const mobileDetailOpen = ref(false)

const entries = computed(() => pageData.value?.content ?? [])
const items = computed(() =>
  entries.value.map((e) => asUserItem(e.item, { awardedAt: e.acquiredAt })),
)
const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const selectedEntry = computed(() => entries.value.find((e) => e.item.id === selectedId.value) ?? null)
const selectedItem = computed(() => items.value.find((u) => u.linkId === selectedId.value) ?? null)
const selectedVariantKey = computed(
  () => props.clan.clan.equipped.find((i) => i.id === selectedId.value)?.variantKey ?? null,
)

function isEquipped(itemId: string): boolean {
  return entries.value.some((e) => e.item.id === itemId && e.equipped)
}

async function fetchItems() {
  loading.value = true
  try {
    const { getClanItems } = await import('@/api/clans')
    pageData.value = await getClanItems(props.clan.clan.id, { page: paginationParams.value.page, size: 50 })
    if (!selectedEntry.value) selectedId.value = entries.value[0]?.item.id ?? null
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

function selectItem(itemId: string) {
  selectedId.value = itemId
  if (window.matchMedia('(max-width: 1023px)').matches) mobileDetailOpen.value = true
}

async function run(action: (clanId: string) => Promise<void>) {
  busy.value = true
  error.value = null
  try {
    await action(props.clan.clan.id)
    await fetchItems()
    emit('changed')
  } catch (err) {
    error.value = parseApiError(err, 'Could not change that cosmetic.').message
  } finally {
    busy.value = false
  }
}

function equip(itemId: string, variantKey?: string) {
  return run(async (clanId) => {
    const { equipClanItem } = await import('@/api/clans')
    await equipClanItem(clanId, { itemId, variantKey })
  })
}

function unequip(typeKey: string) {
  return run(async (clanId) => {
    const { unequipClanItem } = await import('@/api/clans')
    await unequipClanItem(clanId, typeKey)
  })
}

watch(() => route.query.page, fetchItems, { immediate: true })
</script>

<template>
  <section class="cosmetics">
    <BaseBanner v-if="error" variant="error" role="alert" @close="error = null">{{ error }}</BaseBanner>

    <InventoryLayout
      :detail-open="mobileDetailOpen"
      :detail-title="selectedItem?.item.name"
      @close-detail="mobileDetailOpen = false"
    >
      <template v-if="loading && items.length === 0">
        <SkeletonLoader v-for="i in 10" :key="i" variant="card" />
      </template>
      <template v-else>
        <InventoryItemCell
          v-for="userItem in items"
          :key="userItem.linkId"
          :user-item="userItem"
          :selected="userItem.linkId === selectedId"
          :equipped="isEquipped(userItem.linkId)"
          @select="selectItem"
        />
      </template>

      <template v-if="!loading && items.length === 0" #empty>
        <EmptyState message="This clan has not earned any cosmetics yet." />
      </template>

      <template #footer>
        <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
      </template>

      <template #detail>
        <InventoryDetailPanel
          :user-item="selectedItem"
          :can-manage="!!canCustomize"
          can-unequip
          :source-label="selectedEntry ? CLAN_ITEM_SOURCE_LABEL[selectedEntry.source] : undefined"
          :equipped="!!selectedEntry?.equipped"
          :equipped-variant-key="selectedVariantKey"
          :busy="busy"
          @equip="equip"
          @select-variant="equip"
          @unequip="unequip"
        />
      </template>
    </InventoryLayout>
  </section>
</template>

<style scoped>
.cosmetics {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
</style>
