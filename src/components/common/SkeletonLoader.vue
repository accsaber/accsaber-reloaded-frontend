<script setup lang="ts">
defineProps<{
  variant?: 'text' | 'avatar' | 'card' | 'table-row' | 'stat-block'
  lines?: number
  width?: string
  height?: string
}>()
</script>

<template>
  <div class="skeleton" :class="`skeleton--${variant ?? 'text'}`" :style="{ width: width, height: height }">
    <template v-if="(variant ?? 'text') === 'text'">
      <div v-for="i in (lines ?? 1)" :key="i" class="skeleton__line"
        :style="{ width: i === (lines ?? 1) ? '60%' : '100%' }" />
    </template>

    <template v-else-if="variant === 'avatar'">
      <div class="skeleton__avatar" />
    </template>

    <template v-else-if="variant === 'card'">
      <div class="skeleton__card-image" />
      <div class="skeleton__card-body">
        <div class="skeleton__line" style="width: 70%" />
        <div class="skeleton__line" style="width: 50%" />
        <div class="skeleton__line" style="width: 40%" />
      </div>
    </template>

    <template v-else-if="variant === 'table-row'">
      <div class="skeleton__table-row">
        <div class="skeleton__cell" style="width: 40px" />
        <div class="skeleton__cell skeleton__cell--avatar" />
        <div class="skeleton__cell" style="flex: 1" />
        <div class="skeleton__cell" style="width: 80px" />
        <div class="skeleton__cell" style="width: 60px" />
      </div>
    </template>

    <template v-else-if="variant === 'stat-block'">
      <div class="skeleton__stat">
        <div class="skeleton__line" style="width: 60%; height: 10px" />
        <div class="skeleton__line" style="width: 80%; height: 20px" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.skeleton {
  overflow: hidden;
}

.skeleton__line,
.skeleton__avatar,
.skeleton__card-image,
.skeleton__cell {
  background: linear-gradient(90deg,
      var(--bg-overlay) 25%,
      var(--bg-elevated) 50%,
      var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: var(--radius-btn);
}

.skeleton__line {
  height: 12px;
  margin-bottom: var(--space-sm);
}

.skeleton__line:last-child {
  margin-bottom: 0;
}

.skeleton__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-avatar);
}

.skeleton--card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.skeleton__card-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0;
}

.skeleton__card-body {
  padding: var(--space-md);
}

.skeleton__table-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  height: 48px;
}

.skeleton__cell {
  height: 14px;
}

.skeleton__cell--avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-avatar);
  flex-shrink: 0;
}

.skeleton__stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {

  .skeleton__line,
  .skeleton__avatar,
  .skeleton__card-image,
  .skeleton__cell {
    animation: none;
    background: var(--bg-overlay);
  }
}
</style>
