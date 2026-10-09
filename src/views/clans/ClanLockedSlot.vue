<script setup lang="ts">
import type { ClanRole } from '@/types/api/clans'
import { CLAN_ROLE_LABEL } from '@/utils/clans'

defineProps<{
  role: ClanRole
  level: number
}>()
</script>

<template>
  <article class="locked" :class="`locked--${role}`">
    <span class="locked__portrait" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    </span>
    <div class="locked__body">
      <span class="locked__role">{{ CLAN_ROLE_LABEL[role] }}</span>
      <span class="locked__when">Unlocks at clan level {{ level }}</span>
    </div>
  </article>
</template>

<style scoped>
.locked {
  --portrait: 64px;
  display: grid;
  grid-template-columns: var(--portrait) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-md);
  border: 1px dashed var(--bg-overlay);
  border-radius: var(--radius-card);
}

.locked--commander {
  --portrait: 96px;
  grid-column: span 6;
}

.locked--officer {
  grid-column: span 4;
}

@media (max-width: 767px) {
  .locked--commander {
    grid-column: span 12;
  }

  .locked--officer {
    grid-column: span 6;
  }
}

.locked__portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--portrait);
  height: var(--portrait);
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border-radius: var(--radius-avatar);
}

.locked__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.locked__role {
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-secondary);
}

.locked__when {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
