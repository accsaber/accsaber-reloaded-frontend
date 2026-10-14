<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { ClanResponse } from '@/types/api/clans'
import { ref, watch } from 'vue'

const MIN_CHARS = 2
const PAGE_SIZE = 8

const props = defineProps<{
  excludeIds?: string[]
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  select: [clan: ClanResponse]
}>()

const search = ref('')
const debounced = useDebouncedRef(search, 250)
const results = ref<ClanResponse[]>([])
const loading = ref(false)
let requestId = 0

async function runSearch(query: string) {
  const id = ++requestId
  loading.value = true
  try {
    const { getClans } = await import('@/api/clans')
    const page = await getClans({ page: 0, size: PAGE_SIZE, sort: 'name,asc', search: query })
    if (id !== requestId) return
    const excluded = new Set(props.excludeIds ?? [])
    results.value = page.content.filter((c) => !excluded.has(c.clan.id))
  } catch {
    if (id === requestId) results.value = []
  } finally {
    if (id === requestId) loading.value = false
  }
}

function pick(clan: ClanResponse) {
  search.value = ''
  results.value = []
  emit('select', clan)
}

watch(debounced, (value) => {
  const query = value.trim()
  if (query.length < MIN_CHARS) {
    requestId++
    results.value = []
    return
  }
  void runSearch(query)
})
</script>

<template>
  <div class="clan-picker">
    <input
      v-model="search"
      type="text"
      class="clan-picker__input"
      :placeholder="placeholder ?? 'Search clans by name or tag...'"
      :disabled="disabled"
      aria-label="Search clans"
    />
    <ul v-if="search.trim().length >= MIN_CHARS" class="clan-picker__results">
      <li v-if="loading" class="clan-picker__status">Searching...</li>
      <li v-else-if="results.length === 0" class="clan-picker__status">No clans found</li>
      <li v-for="result in results" v-else :key="result.clan.id">
        <button type="button" class="clan-picker__option" :disabled="disabled" @click="pick(result)">
          <ClanIcon :clan="result.clan" :size="24" />
          <ClanTag :clan="result.clan" size="md" />
          <span class="clan-picker__name">{{ result.clan.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.clan-picker {
  position: relative;
  width: 100%;
  max-width: 360px;
}

.clan-picker__input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  color: var(--text-primary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
}

.clan-picker__input:focus {
  outline: none;
  border-color: var(--page-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent, var(--accent)) 20%, transparent);
}

.clan-picker__results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: var(--space-xs);
  list-style: none;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.clan-picker__status {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.clan-picker__option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm);
  font: inherit;
  font-size: var(--text-body);
  text-align: left;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.clan-picker__option:hover {
  background: var(--bg-overlay);
}

.clan-picker__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
