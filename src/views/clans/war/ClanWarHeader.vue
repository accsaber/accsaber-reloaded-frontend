<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import { CLAN_ARENA_LABEL, CLAN_RULESET_LABEL, CLAN_WAR_STATUS_LABEL, warClock } from '@/utils/clans'
import { computed, ref } from 'vue'
import ClanWarSide from './ClanWarSide.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
  canRetreat: boolean
}>()

const emit = defineEmits<{
  retreat: []
}>()

const menuOpen = ref(false)
const clock = computed(() => warClock(props.war, props.now))

function retreat() {
  menuOpen.value = false
  emit('retreat')
}
</script>

<template>
  <header class="war-header">
    <ClanWarSide :side="war.attacker" role="attacker" />

    <div class="war-header__middle">
      <span class="war-header__status" :class="`war-header__status--${war.status}`">
        {{ CLAN_WAR_STATUS_LABEL[war.status] }}
      </span>
      <span class="war-header__clock-label">{{ clock.label }}</span>
      <span v-if="clock.value" class="war-header__clock">{{ clock.value }}</span>
      <span class="war-header__mode">{{ CLAN_ARENA_LABEL[war.arena] }}</span>
      <span class="war-header__mode">{{ CLAN_RULESET_LABEL[war.ruleset] }}</span>

      <BaseDropdown v-if="canRetreat" :open="menuOpen" position="bottom-right" @update:open="menuOpen = $event">
        <template #trigger>
          <button type="button" class="war-header__menu-btn" aria-label="War menu" :aria-expanded="menuOpen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </template>
        <div class="war-header__menu" role="menu">
          <button type="button" class="war-header__item" role="menuitem" @click="retreat">Retreat</button>
        </div>
      </BaseDropdown>
    </div>

    <ClanWarSide :side="war.defender" role="defender" />
  </header>
</template>

<style scoped>
.war-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: stretch;
}

.war-header__middle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  min-width: 160px;
  padding: var(--space-md);
  text-align: center;
}

.war-header__status {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.war-header__status--active {
  color: var(--success);
}

.war-header__status--picking,
.war-header__status--preparing {
  color: var(--warning);
}

.war-header__clock-label {
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-header__clock {
  font-family: var(--font-mono);
  font-size: var(--text-page-title);
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-primary);
}

.war-header__mode {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.war-header__mode:first-of-type {
  margin-top: var(--space-sm);
}

.war-header__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: var(--space-sm);
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.war-header__menu-btn:hover,
.war-header__menu-btn[aria-expanded='true'] {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.war-header__menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: var(--space-xs);
}

.war-header__item {
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  font-size: var(--text-body);
  text-align: left;
  color: var(--error);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
}

.war-header__item:hover {
  background: color-mix(in srgb, var(--error) 12%, transparent);
}

@media (max-width: 720px) {
  .war-header {
    grid-template-columns: minmax(0, 1fr);
  }

  .war-header__middle {
    order: -1;
    padding: var(--space-sm) 0;
  }
}
</style>
