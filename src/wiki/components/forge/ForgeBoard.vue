<script setup lang="ts">
import type { LeaderboardEntry } from '@/wiki/missionSim'

export interface ForgeBoardEntry extends LeaderboardEntry {
  viable: boolean
  picked: boolean
  reason: string | null
}

defineProps<{
  entries: ForgeBoardEntry[]
  target: number
  floor: number
  cap: number
  userSkill: number
  maxSkillDistance: number
}>()
</script>

<template>
  <div class="board">
    <div class="board__legend">
      <span class="board__legend-item">
        Window <strong>{{ Math.round(floor).toLocaleString() }}</strong> to
        <strong>{{ Math.round(cap).toLocaleString() }}</strong> AP
      </span>
      <span class="board__legend-item">
        Aiming at <strong>{{ Math.round(target).toLocaleString() }}</strong>
      </span>
      <span class="board__legend-item">
        Within <strong>{{ maxSkillDistance }}</strong> skill of your
        <strong>{{ Math.round(userSkill) }}</strong>
      </span>
    </div>

    <ul class="board__list">
      <li
        v-for="entry in entries"
        :key="entry.userId"
        class="board__row"
        :class="{
          'board__row--viable': entry.viable && !entry.picked,
          'board__row--picked': entry.picked,
        }"
      >
        <span class="board__name">{{ entry.name }}</span>
        <span class="board__ap">{{ Math.round(entry.ap).toLocaleString() }}</span>
        <span class="board__skill">
          <template v-if="entry.skillLevel !== null">skill {{ Math.round(entry.skillLevel) }}</template>
        </span>
        <span class="board__verdict">
          <template v-if="entry.picked">picked</template>
          <template v-else-if="entry.viable">in range</template>
          <template v-else>{{ entry.reason }}</template>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.board__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.board__legend-item strong {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
}

.board__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.board__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto minmax(0, 1.1fr);
  align-items: center;
  gap: var(--space-md);
  padding: 6px var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  background: var(--bg-surface);
}

.board__row + .board__row {
  border-top: 1px solid var(--bg-overlay);
}

.board__row--viable {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.board__row--picked {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-elevated));
}

.board__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board__row--picked .board__name {
  font-weight: 700;
}

.board__ap,
.board__skill {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  white-space: nowrap;
}

.board__verdict {
  text-align: right;
  font-size: 0.6875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board__row--picked .board__verdict {
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@media (max-width: 640px) {
  .board__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 2px;
  }

  .board__skill {
    display: none;
  }

  .board__verdict {
    grid-column: 1 / -1;
    text-align: left;
  }
}
</style>
