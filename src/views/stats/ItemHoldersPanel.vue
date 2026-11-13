<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import IconButton from '@/components/common/IconButton.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import ModifierChip from '@/components/domain/ModifierChip.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemHolderResponse, ItemHolderSort } from '@/types/api/items'
import { resolveModifierRefs } from '@/utils/items'
import { clamp } from '@/utils/math'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  itemId: string
  ownerCount: number
  locked: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const PAGE_SIZE = 8

const authStore = useAuthStore()
const modifierStore = useItemModifierStore()

const holders = ref<ItemHolderResponse[]>([])
const page = ref(0)
const totalElements = ref(props.ownerCount)
const last = ref(true)
const loading = ref(true)
const loadingMore = ref(false)

const sort = ref<ItemHolderSort>('RECENT')
const selectedModifiers = ref<string[]>([])
const search = ref('')

const sortTabs = computed(() => [
  { key: 'RECENT', label: 'Recent' },
  { key: 'RANK', label: 'Rank' },
  ...(authStore.isLoggedIn ? [{ key: 'FOLLOWING', label: 'Following' }] : []),
])

const modifierToggles = computed(() =>
  modifierStore.modifiers.map((m) => ({ key: m.key, label: m.name, color: m.colorHex || undefined })),
)

const remaining = computed(() => Math.max(0, totalElements.value - holders.value.length))
const filtered = computed(() => !!search.value || selectedModifiers.value.length > 0)
const filterKey = computed(() => JSON.stringify([props.itemId, sort.value, selectedModifiers.value, search.value]))

function toggleModifier(key: string) {
  const active = selectedModifiers.value
  selectedModifiers.value = active.includes(key) ? active.filter((k) => k !== key) : [...active, key]
}

let requestId = 0

async function load(reset: boolean) {
  if (reset) {
    page.value = 0
    loading.value = true
  } else {
    if (last.value || loadingMore.value) return
    page.value += 1
    loadingMore.value = true
  }
  const id = ++requestId
  try {
    const { getItemHolders } = await import('@/api/items')
    const result = await getItemHolders(props.itemId, {
      page: page.value,
      size: PAGE_SIZE,
      sort: sort.value,
      modifier: selectedModifiers.value.length ? selectedModifiers.value : undefined,
      search: search.value || undefined,
    })
    if (id !== requestId) return
    holders.value = reset ? result.content : [...holders.value, ...result.content]
    totalElements.value = result.totalElements
    last.value = result.last
  } catch {
    if (id !== requestId) return
    if (reset) holders.value = []
    else page.value -= 1
  }
  if (id !== requestId) return
  loading.value = false
  loadingMore.value = false
}

onMounted(() => modifierStore.fetchModifiers())

watch(filterKey, () => load(true), { immediate: true })
</script>

<template>
  <div class="holders-panel" role="dialog" aria-label="Item holders">
    <header class="holders-panel__head">
      <span class="field-label">Owned By {{ totalElements.toLocaleString() }}</span>
      <IconButton v-if="locked" icon="close" label="Close" @click.stop="emit('close')" />
    </header>

    <template v-if="locked">
      <SearchBox v-model="search" placeholder="Search players" />
      <BaseTabs variant="segmented" label="Sort holders" :tabs="sortTabs" :model-value="sort"
        @update:model-value="sort = $event as ItemHolderSort" />
      <ChartToggleGroup v-if="modifierToggles.length" :toggles="modifierToggles" :active="selectedModifiers"
        label="Modifiers" @select="toggleModifier" />
    </template>

    <p v-if="!loading && holders.length === 0" class="caption holders-panel__empty">
      {{ filtered ? 'No holders match those filters' : 'No one owns this yet' }}
    </p>

    <SwapList v-else class="holders-panel__list" :items="holders" :item-key="(h) => h.player.id" :loading="loading"
      :placeholders="clamp(ownerCount, 1, PAGE_SIZE)">
      <template #placeholder>
        <SkeletonLoader class="placeholder" height="36px" />
      </template>
      <template #default="{ item, swap }">
        <RouterLink class="holders-panel__row" v-bind="swap"
          :to="{ name: 'player-profile', params: { userId: item.player.id } }">
          <span class="holders-panel__who">
            <span class="holders-panel__name">
              <UserChip :user="item.player" size="sm" />
              <svg v-if="item.following" class="holders-panel__follow" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                role="img" aria-label="Following">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span v-if="item.modifiers.length" class="holders-panel__mods">
              <ModifierChip v-for="mod in resolveModifierRefs(item.modifiers, modifierStore.byKey)" :key="mod.id"
                :modifier="mod" />
            </span>
          </span>
          <span class="caption holders-panel__stats">
            <span v-if="item.ranking != null">#{{ item.ranking.toLocaleString() }}</span>
            <span v-if="item.quantity > 1" class="holders-panel__qty">x{{ item.quantity }}</span>
            <span v-if="item.lowestSerial != null">No. {{ item.lowestSerial }}</span>
          </span>
        </RouterLink>
      </template>
    </SwapList>

    <BaseButton v-if="locked && !last" :loading="loadingMore" @click.stop="load(false)">Show More</BaseButton>
    <p v-else-if="!locked && remaining > 0" class="caption">
      and {{ remaining.toLocaleString() }} more, click to search
    </p>
  </div>
</template>

<style scoped>
.holders-panel {
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.holders-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.holders-panel__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 76px;
  margin: 0 calc(-1 * var(--space-sm));
  overflow-y: auto;
  scrollbar-width: thin;
}

.holders-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  gap: var(--space-sm);
  min-height: 36px;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-btn);
  text-decoration: none;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.holders-panel__row:hover {
  background: var(--bg-overlay);
}

.holders-panel__who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.holders-panel__name,
.holders-panel__mods,
.holders-panel__stats {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.holders-panel__mods {
  flex-wrap: wrap;
}

.holders-panel__follow {
  flex: none;
  color: var(--accent);
}

.holders-panel__stats {
  flex: none;
  gap: var(--space-sm);
  font-family: var(--font-mono);
}

.holders-panel__qty {
  color: var(--text-primary);
}

.holders-panel__empty {
  padding: var(--space-md) 0;
  text-align: center;
}
</style>
