<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useCategoryStore } from '@/stores/categories'
import type { SkillCategory, SkillResponse } from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { computed, ref, watch } from 'vue'
import { formatFixed } from '@/utils/formatters'

const props = defineProps<{
  userId: string
  category: CategoryCode
}>()

const categoryStore = useCategoryStore()

const {
  isOpen,
  triggerRef,
  panelRef,
  panelStyle,
  close,
  toggle,
  onTriggerEnter,
  onTriggerLeave,
  onPanelEnter,
  onPanelLeave,
} = useFloatingPanel({ width: 240, gap: 8, hover: { openDelay: 400, closeDelay: 150 } })

const skill = ref<SkillResponse | null>(null)
const loading = ref(false)
const failed = ref(false)
let fetchedUserId: string | null = null

function normalizeCode(code: string): string {
  return code.replace(/_acc$/, '')
}

function accentFor(code: string): string {
  return categoryStore.getAccent(code)
}

const categoryRows = computed(() => {
  if (!skill.value) return []
  const entries = skill.value.skills.filter(
    (s) => s.categoryCode !== 'overall' && s.categoryCode !== 'xp',
  )
  const toRow = (s: SkillCategory) => ({
    code: s.categoryCode,
    name: s.categoryName,
    ap: s.components.rawApForOneGain,
    accent: accentFor(s.categoryCode),
  })

  if (props.category === 'overall') {
    return entries
      .filter((s) => s.components.rawApForOneGain > 0)
      .map(toRow)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const target = normalizeCode(props.category)
  const match = entries.find((s) => normalizeCode(s.categoryCode) === target)
  if (!match || match.components.rawApForOneGain <= 0) return []
  return [toRow(match)]
})

async function ensureSkill() {
  if (fetchedUserId === props.userId && skill.value) return
  loading.value = true
  failed.value = false
  try {
    const { getUserSkill } = await import('@/api/users')
    const result = await getUserSkill(props.userId)
    skill.value = result
    fetchedUserId = props.userId
  } catch {
    skill.value = null
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(isOpen, (value) => {
  if (value) ensureSkill()
})

watch(
  () => props.userId,
  () => {
    fetchedUserId = null
    skill.value = null
    failed.value = false
  },
)

</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="ap-next-tip"
    aria-label="Raw AP needed to raise your total AP by 1"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @click.stop="toggle"
    @keydown.escape="close"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>

    <Teleport to="body">
      <Transition name="ap-next-tip">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="ap-next-tip__popup"
          :style="panelStyle"
          role="tooltip"
          @mouseenter="onPanelEnter"
          @mouseleave="onPanelLeave"
        >
          <div class="ap-next-tip__head">
            <span class="ap-next-tip__title">Next AP point</span>
          </div>

          <SkeletonLoader v-if="loading" variant="text" :lines="2" />

          <div v-else-if="failed" class="ap-next-tip__empty">
            Couldn't load skill data.
          </div>

          <ul v-else-if="categoryRows.length" class="ap-next-tip__rows">
            <li v-for="row in categoryRows" :key="row.code" class="ap-next-tip__row">
              <span class="ap-next-tip__name">{{ row.name }}</span>
              <span class="ap-next-tip__value" :style="{ color: row.accent }">
                {{ formatFixed(row.ap, 1) }} AP
              </span>
            </li>
          </ul>

          <div v-else class="ap-next-tip__empty">
            No ranked activity yet.
          </div>
        </div>
      </Transition>
    </Teleport>
  </button>
</template>

<style scoped>
.ap-next-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: help;
  line-height: 0;
  transition: color 120ms ease;
}

.ap-next-tip:hover,
.ap-next-tip:focus-visible {
  color: var(--accent);
  outline: none;
}
</style>

<style>
.ap-next-tip__popup {
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
}

.ap-next-tip__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ap-next-tip__title {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.ap-next-tip__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ap-next-tip__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.ap-next-tip__name {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.ap-next-tip__value {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  white-space: nowrap;
}

.ap-next-tip__empty {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.ap-next-tip-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.ap-next-tip-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.ap-next-tip-enter-from,
.ap-next-tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .ap-next-tip-enter-from,
  .ap-next-tip-leave-to {
    transform: none;
  }
}
</style>
