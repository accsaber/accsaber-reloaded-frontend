<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SortDirectionToggle from '@/components/common/SortDirectionToggle.vue'
import ItemFilterPanel, { type ItemFilterCollectionOption } from '@/components/domain/ItemFilterPanel.vue'
import { useItemFilterOptions } from '@/composables/useItemFilterOptions'
import type { ItemRarity, ItemResponse } from '@/types/api/items'
import type { SortState } from '@/types/display'
import { ESSENCE_GLYPH, formatEssenceAmount } from '@/utils/essence'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  userId: string
  sortState: SortState
  collections: ItemResponse[]
  isOwnProfile: boolean
  canOfferTrade: boolean
  selectMode: boolean
  balance: number | null
}>()

defineEmits<{
  sort: [key: string]
  'toggle-select': []
}>()

const search = defineModel<string>('search', { required: true })
const showUnowned = defineModel<boolean>('showUnowned', { required: true })
const typeKeys = defineModel<string[]>('typeKeys', { required: true })
const rarities = defineModel<ItemRarity[]>('rarities', { required: true })
const modifierKeys = defineModel<string[]>('modifierKeys', { required: true })
const collectionIds = defineModel<string[]>('collectionIds', { required: true })

const sortOptions = [
  { value: 'date', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'crate', label: 'Collection' },
]

const { typeGroups, modifierOptions } = useItemFilterOptions({
  hiddenModifierKeys: ['decorated'],
})

const filtersOpen = ref(false)

const collectionOptions = computed<ItemFilterCollectionOption[]>(() =>
  props.collections.map((c) => ({ id: c.id, label: c.name, iconUrl: c.iconUrl })),
)

const hasActiveFilters = computed(
  () =>
    typeKeys.value.length > 0 ||
    rarities.value.length > 0 ||
    modifierKeys.value.length > 0 ||
    collectionIds.value.length > 0,
)

function clearFilters() {
  typeKeys.value = []
  rarities.value = []
  modifierKeys.value = []
  collectionIds.value = []
}
</script>

<template>
  <div class="inv-toolbar" :class="{ 'inv-toolbar--selecting': selectMode }">
    <SearchBox v-model="search" placeholder="Search items..." class="inv-toolbar__search" />
    <BaseButton v-if="isOwnProfile" size="sm" :disabled="showUnowned" @click="$emit('toggle-select')">
      {{ selectMode ? 'Done' : 'Select' }}
    </BaseButton>
    <BaseSwitch v-model="showUnowned" label="Unowned" aria-label="Show unowned items" />
    <slot v-if="selectMode" name="selection" />

    <div class="inv-toolbar__end">
      <span v-if="isOwnProfile && balance !== null" class="inv-toolbar__wallet"
        :aria-label="`Essence balance: ${formatEssenceAmount(balance)}`" title="Item essence">
        <span class="inv-toolbar__glyph" aria-hidden="true">{{ ESSENCE_GLYPH }}</span>
        {{ formatEssenceAmount(balance) }}
      </span>
      <BaseSelect :model-value="sortState.key" :options="sortOptions" placeholder="Sort"
        @update:model-value="$emit('sort', $event)" />
      <SortDirectionToggle :direction="sortState.direction" @toggle="$emit('sort', sortState.key)" />
      <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
        <template #trigger>
          <FilterButton :active="filtersOpen || hasActiveFilters" :has-indicator="hasActiveFilters" />
        </template>
        <ItemFilterPanel v-model:rarities="rarities" v-model:type-keys="typeKeys"
          v-model:modifier-keys="modifierKeys" v-model:collection-ids="collectionIds" :type-groups="typeGroups"
          :modifier-options="modifierOptions" :collection-options="collectionOptions"
          :has-active-filters="hasActiveFilters" @clear="clearFilters" />
      </FilterPopover>
      <RouterLink v-if="isOwnProfile" :to="{ name: 'market' }" custom v-slot="{ navigate, href }">
        <BaseButton variant="primary" size="sm" :href="href"
          @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
          Market Hub
        </BaseButton>
      </RouterLink>
      <RouterLink v-else-if="canOfferTrade" :to="{ name: 'trade-new', query: { to: userId } }" custom
        v-slot="{ navigate, href }">
        <BaseButton variant="primary" size="sm" :href="href"
          @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
          Offer Trade
        </BaseButton>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.inv-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.inv-toolbar > :not(.inv-toolbar__end),
.inv-toolbar__end > *,
.inv-toolbar :deep(.filter-button),
.inv-toolbar :deep(.base-select__trigger) {
  height: var(--control-h);
}

.inv-toolbar :deep(.base-button) {
  height: var(--control-h);
  padding: 0 var(--space-md);
  font-size: var(--text-body);
}

.inv-toolbar__search {
  flex: 0 1 320px;
  min-width: 140px;
  transition: flex-basis var(--dur-enter) var(--ease-in-out);
}

.inv-toolbar--selecting .inv-toolbar__search {
  flex-basis: 140px;
}

.inv-toolbar__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}

.inv-toolbar__end :deep(.base-select) {
  flex: 0 0 auto;
}

.inv-toolbar__end :deep(.base-select__trigger) {
  min-width: 150px;
  padding: 0 var(--space-sm);
}

.inv-toolbar__wallet {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.inv-toolbar__glyph {
  color: var(--tier-gold);
  line-height: 1;
}
</style>
