<script setup lang="ts">
import UserChip from '@/components/domain/UserChip.vue'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { useUserSearch } from '@/composables/useUserSearch'
import { getUser } from '@/api/users'
import type { LeaderboardResponse } from '@/types/api/users'
import type { UserRefDisplay } from '@/types/display'
import { toUserRef } from '@/utils/mappers'
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string | null
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Search players by name...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  select: [user: { userId: string; userName: string } | null]
}>()

const { query: search, active, results, loading } = useUserSearch({ size: 12, sort: 'ranking,ASC' }, 2)
const { isOpen, triggerRef, panelRef, panelStyle, open, close } = useFloatingPanel({ width: 'trigger', gap: 4 })

const focusedIndex = ref(-1)
const selected = ref<UserRefDisplay | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const showResults = computed(() => isOpen.value && active.value)

watch(results, (list) => {
  focusedIndex.value = list.length > 0 ? 0 : -1
})

function pick(user: LeaderboardResponse) {
  selected.value = toUserRef(user)
  emit('update:modelValue', user.userId)
  emit('select', { userId: user.userId, userName: user.userName })
  close()
  search.value = ''
}

function clear() {
  selected.value = null
  emit('update:modelValue', null)
  emit('select', null)
  search.value = ''
  nextTick(() => inputRef.value?.focus())
}

function onKeydown(e: KeyboardEvent) {
  if (!showResults.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = Math.min(results.value.length - 1, focusedIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = Math.max(0, focusedIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const choice = results.value[focusedIndex.value]
    if (choice) pick(choice)
  }
}

watch(() => props.modelValue, async (val) => {
  if (!val) {
    selected.value = null
    return
  }
  if (selected.value?.id === val) return
  try {
    const u = await getUser(val)
    selected.value = toUserRef(u)
    emit('select', { userId: u.id, userName: u.name })
  } catch {
    selected.value = null
  }
}, { immediate: true })
</script>

<template>
  <div ref="triggerRef" class="user-picker">
    <div v-if="selected" class="user-picker__selected">
      <UserChip :user="selected" size="sm" class="user-picker__name" />
      <button type="button" class="user-picker__clear" :disabled="disabled" aria-label="Clear selection" @click="clear">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <input
      v-else
      ref="inputRef"
      v-model="search"
      type="text"
      class="user-picker__input"
      :placeholder="placeholder"
      :disabled="disabled"
      @focus="open"
      @input="open"
      @keydown="onKeydown"
    />

    <Teleport to="body">
      <div v-if="showResults" ref="panelRef" class="user-picker__panel" :style="panelStyle">
        <div v-if="loading" class="user-picker__status">Searching...</div>
        <div v-else-if="results.length === 0" class="user-picker__status">No players found</div>
        <button
          v-for="(user, i) in results"
          :key="user.userId"
          type="button"
          class="user-picker__option"
          :class="{ 'user-picker__option--focused': i === focusedIndex }"
          @mouseenter="focusedIndex = i"
          @click="pick(user)"
        >
          <UserChip :user="toUserRef(user)" size="sm" class="user-picker__option-name" />
          <span class="user-picker__option-rank">#{{ user.ranking }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.user-picker {
  position: relative;
  width: 100%;
}

.user-picker__input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  outline: none;
  transition: border-color 120ms ease;
}

.user-picker__input:focus {
  border-color: var(--accent);
}

.user-picker__input::placeholder {
  color: var(--text-tertiary);
}

.user-picker__selected {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-base);
}

.user-picker__name {
  flex: 1;
}

.user-picker__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-btn);
  transition: color 120ms ease;
}

.user-picker__clear:hover:not(:disabled) {
  color: var(--text-primary);
}
</style>

<style>
.user-picker__panel {
  z-index: 1000;
  background: var(--bg-elevated);
  border: 1px solid var(--text-tertiary);
  border-radius: var(--radius-card);
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-picker__status {
  padding: var(--space-md);
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-align: center;
}

.user-picker__option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  cursor: pointer;
  text-align: left;
  transition: background-color 80ms ease;
}

.user-picker__option--focused,
.user-picker__option:hover {
  background: var(--bg-overlay);
}

.user-picker__option-name {
  flex: 1;
}

.user-picker__option-rank {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
