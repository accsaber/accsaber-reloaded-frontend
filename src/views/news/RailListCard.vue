<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    imageUrl?: string | null
    meta?: string | null
    badge?: string | null
    accent?: string
    active?: boolean
    pinned?: boolean
  }>(),
  {
    imageUrl: null,
    meta: null,
    badge: null,
    accent: 'var(--accent)',
    active: false,
    pinned: false,
  },
)

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="rail-card pressable"
    :class="{ 'rail-card--active': active }"
    :style="{ '--card-accent': accent }"
    :aria-pressed="active"
    @click="emit('select')"
  >
    <span class="rail-card__thumb">
      <img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy" decoding="async" />
      <slot v-else name="fallback" />
    </span>

    <span class="rail-card__body">
      <span class="rail-card__title">{{ title }}</span>
      <span class="caption rail-card__meta">
        <span v-if="badge" class="rail-card__badge">{{ badge }}</span>
        <template v-if="pinned"> · Pinned</template>
        <template v-if="meta && meta !== badge"> · {{ meta }}</template>
      </span>
    </span>
  </button>
</template>

<style scoped>
.rail-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  min-height: 56px;
  padding: var(--space-sm);
  text-align: left;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.rail-card:hover {
  border-color: var(--text-tertiary);
}

.rail-card--active {
  background: var(--bg-elevated);
  border-color: var(--text-secondary);
}

.rail-card__thumb {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
  color: var(--card-accent);
  overflow: hidden;
}

.rail-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rail-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rail-card__title {
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-card__meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-card__badge {
  font-weight: 600;
  color: var(--card-accent);
}
</style>
