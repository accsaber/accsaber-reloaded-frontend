<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'info' | 'warning' | 'error' | 'success'
  dismissible?: boolean
  role?: 'status' | 'alert'
}>(), {
  variant: 'info',
  dismissible: true,
  role: 'status',
})

defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="banner" :class="`banner--${variant}`" :role="role">
    <span v-if="$slots.icon" class="banner__icon">
      <slot name="icon" />
    </span>
    <div class="banner__body">
      <slot />
    </div>
    <slot name="actions" />
    <button
      v-if="dismissible"
      type="button"
      class="banner__close"
      aria-label="Dismiss"
      @click="$emit('close')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.banner {
  position: relative;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  max-width: 960px;
  margin: 0 auto var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-left: 3px solid var(--banner-accent, var(--accent, var(--info)));
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.banner--info { --banner-accent: var(--info); }
.banner--warning { --banner-accent: var(--warning); }
.banner--error { --banner-accent: var(--error); }
.banner--success { --banner-accent: var(--success); }

.banner__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--banner-accent);
}

.banner__body {
  flex: 1;
  line-height: 1.5;
}

.banner__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  color: var(--text-secondary);
  border-radius: var(--radius-btn);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 120ms ease, background 120ms ease;
}

.banner__close:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}
</style>
