<script setup lang="ts">
withDefaults(
  defineProps<{
    amount: number
    label: string
    size?: number
  }>(),
  { size: 80 },
)
</script>

<template>
  <div
    class="amount-tile"
    :style="{ '--tile-size': `${size}px` }"
    :title="`${amount.toLocaleString()} ${label}`"
  >
    <span class="amount-tile__amount">{{ amount.toLocaleString() }}</span>
    <span class="amount-tile__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.amount-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: var(--tile-size);
  height: var(--tile-size);
  padding: 0 var(--space-sm);
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--tier-gold) 45%, transparent);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--tier-gold) 8%, var(--bg-base));
  color: var(--tier-gold);
}

.amount-tile__amount {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1;
}

.amount-tile__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
