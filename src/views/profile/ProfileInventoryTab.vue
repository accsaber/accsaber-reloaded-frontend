<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import InventoryDetailPanel from '@/components/domain/InventoryDetailPanel.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { getUserInventory } from '@/api/items'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useThemeStore } from '@/stores/theme'
import type { ItemRarity, ItemTypeKey, UserItemResponse } from '@/types/api/items'
import type { Page } from '@/types/pagination'
import { RARITY_ORDER, readThemeValue } from '@/utils/items'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  userId: string
}>()

const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const itemTypeStore = useItemTypeStore()
const itemModifierStore = useItemModifierStore()
const themeStore = useThemeStore()

const isOwnProfile = computed(() => authStore.isLoggedIn && authStore.userId === props.userId)
const canOfferTrade = computed(() => authStore.isLoggedIn && !!authStore.userId && authStore.userId !== props.userId)

const typeKey = ref<string>('')
const rarity = ref<string>('')
const modifierKey = ref<string>('')
const search = ref('')

const { currentPage, sortState, paginationParams, setPage, setSort, resetPage } = usePageableRoute({
  defaultSort: 'date',
  defaultOrder: 'desc',
  defaultSize: 50,
  sortFieldMap: {
    date: 'awardedAt',
    name: 'item.name',
    type: 'item.type.key',
    serial: 'serialNumber',
    quantity: 'quantity',
    rarity: 'rarity',
  },
  secondarySort: null,
})

const sortOptions = [
  { value: 'date', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'quantity', label: 'Quantity' },
]

const typeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...itemTypeStore.itemTypes
    .filter((t) => t.active && !t.parentTypeId)
    .map((t) => ({ value: t.key, label: t.name })),
])

const rarityOptions = computed(() => [
  { value: '', label: 'All rarities' },
  ...RARITY_ORDER.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
])

const modifierOptions = computed(() => [
  { value: '', label: 'All modifiers' },
  ...itemModifierStore.modifiers.filter((m) => m.active).map((m) => ({ value: m.key, label: m.name })),
])

const data = ref<Page<UserItemResponse> | null>(null)
const loading = ref(false)
const selectedLinkId = ref<string | null>(null)
const actionBusy = ref(false)
const mobileDetailOpen = ref(false)

const items = computed<UserItemResponse[]>(() => data.value?.content ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 0)

const selectedItem = computed<UserItemResponse | null>(() => {
  if (!selectedLinkId.value) return null
  return items.value.find((u) => u.linkId === selectedLinkId.value) ?? null
})

const isSelectedEquipped = computed(() => {
  const it = selectedItem.value?.item
  if (!it) return false
  const slot = inventoryStore.equipped[it.typeKey]
  return !!slot && slot.item.id === it.id
})

function isEquipped(userItem: UserItemResponse): boolean {
  const slot = inventoryStore.equipped[userItem.item.typeKey]
  return !!slot && slot.item.id === userItem.item.id
}

async function fetchInventory() {
  loading.value = true
  try {
    const params = {
      ...paginationParams.value,
      typeKey: (typeKey.value || undefined) as ItemTypeKey | undefined,
      rarity: (rarity.value || undefined) as ItemRarity | undefined,
      modifierKey: modifierKey.value || undefined,
      search: search.value.trim() || undefined,
    }
    data.value = await getUserInventory(props.userId, params)
    if (selectedLinkId.value && !data.value.content.some((u) => u.linkId === selectedLinkId.value)) {
      selectedLinkId.value = data.value.content[0]?.linkId ?? null
    } else if (!selectedLinkId.value && data.value.content.length > 0) {
      selectedLinkId.value = data.value.content[0].linkId
    }
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

function selectItem(linkId: string) {
  selectedLinkId.value = linkId
  if (window.matchMedia('(max-width: 1023px)').matches) {
    mobileDetailOpen.value = true
  }
}

async function handleEquip(linkId: string) {
  const target = items.value.find((u) => u.linkId === linkId)
  if (!target) return
  actionBusy.value = true
  try {
    await inventoryStore.equip(target.linkId, props.userId)
    if (target.item.typeKey === 'theme') {
      const theme = readThemeValue(target.item.value)
      if (theme) themeStore.setThemeFromTokens(`item:${target.item.id}`, theme.tokens)
    }
  } catch {
  } finally {
    actionBusy.value = false
  }
}

async function handleUnequip(typeKeyArg: string) {
  actionBusy.value = true
  try {
    await inventoryStore.unequip(typeKeyArg as ItemTypeKey, props.userId)
  } catch {
  } finally {
    actionBusy.value = false
  }
}

watch([typeKey, rarity, modifierKey, search], () => {
  resetPage()
  selectedLinkId.value = null
})

watch(
  [() => props.userId, paginationParams, typeKey, rarity, modifierKey, search],
  () => { fetchInventory() },
  { immediate: true },
)

watch(() => props.userId, (id) => {
  if (id) inventoryStore.fetchEquipped(id)
}, { immediate: true })

onMounted(() => {
  itemTypeStore.fetchItemTypes()
  itemModifierStore.fetchModifiers()
})
</script>

<template>
  <div class="inv-tab">
    <div class="inv-tab__filters">
      <SearchBox v-model="search" placeholder="Search items..." class="inv-tab__search" />
      <BaseSelect v-model="typeKey" :options="typeOptions" placeholder="All types" />
      <BaseSelect v-model="rarity" :options="rarityOptions" placeholder="All rarities" />
      <BaseSelect v-model="modifierKey" :options="modifierOptions" placeholder="All modifiers" />
      <BaseSelect
        :model-value="sortState.key"
        :options="sortOptions"
        placeholder="Sort"
        @update:model-value="setSort"
      />
      <RouterLink v-if="isOwnProfile" :to="{ name: 'trade-offers' }" custom v-slot="{ navigate, href }">
        <BaseButton variant="primary" :href="href" @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
          Trade Offers
        </BaseButton>
      </RouterLink>
      <RouterLink
        v-else-if="canOfferTrade"
        :to="{ name: 'trade-new', query: { to: userId } }"
        custom
        v-slot="{ navigate, href }"
      >
        <BaseButton variant="primary" :href="href" @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
          Offer Trade
        </BaseButton>
      </RouterLink>
    </div>

    <div class="inv-tab__layout">
      <div class="inv-tab__main">
        <div v-if="loading" class="inv-tab__grid">
          <SkeletonLoader v-for="i in 12" :key="i" variant="card" />
        </div>

        <EmptyState v-else-if="items.length === 0" message="No items found." />

        <div v-else class="inv-tab__grid">
          <InventoryItemCell
            v-for="userItem in items"
            :key="userItem.linkId"
            :user-item="userItem"
            :selected="userItem.linkId === selectedLinkId"
            :equipped="isEquipped(userItem)"
            @select="selectItem"
          />
        </div>

        <PaginationControls
          v-if="totalPages > 1"
          :page="currentPage"
          :total-pages="totalPages"
          @update:page="setPage"
        />
      </div>

      <aside class="inv-tab__detail">
        <InventoryDetailPanel
          :user-item="selectedItem"
          :is-own-profile="isOwnProfile"
          :equipped="isSelectedEquipped"
          :busy="actionBusy"
          @equip="handleEquip"
          @unequip="handleUnequip"
        />
      </aside>
    </div>

    <BaseModal :open="mobileDetailOpen" :title="selectedItem?.item.name" @close="mobileDetailOpen = false">
      <InventoryDetailPanel
        :user-item="selectedItem"
        :is-own-profile="isOwnProfile"
        :equipped="isSelectedEquipped"
        :busy="actionBusy"
        @equip="handleEquip"
        @unequip="handleUnequip"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.inv-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.inv-tab__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}

.inv-tab__search {
  flex: 1 1 240px;
  min-width: 200px;
}

.inv-tab__layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-lg);
  align-items: start;
}

.inv-tab__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.inv-tab__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-sm);
}

.inv-tab__detail {
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
}

@media (max-width: 1023px) {
  .inv-tab__layout {
    grid-template-columns: 1fr;
  }

  .inv-tab__detail {
    display: none;
  }
}
</style>
