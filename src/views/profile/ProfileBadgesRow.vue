<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import type { UserItemResponse } from '@/types/api/items'
import { pickAssetUrl, readBadgeValue } from '@/utils/cosmetics/readers'
import { computed } from 'vue'

const props = defineProps<{
  badges: UserItemResponse[]
  primaryLinkId?: string | null
}>()

interface Rendered {
  linkId: string
  name: string
  label: string
  imageUrl: string | null
  altText: string
  description: string | null
  tint: string | null
  primary: boolean
}

const rendered = computed<Rendered[]>(() => {
  const mapped = props.badges
    .filter((u) => u.item.typeKey === 'badge')
    .map((u) => {
      const badgeValue = readBadgeValue(u.item.value)
      const assetUrl = badgeValue ? pickAssetUrl(badgeValue.asset) : null
      const { name, description } = u.item
      const primary = u.linkId === props.primaryLinkId
      return {
        linkId: u.linkId,
        name,
        label: `${primary ? 'Primary badge, ' : ''}${description ? `${name}: ${description}` : name}`,
        imageUrl: assetUrl ?? u.item.iconUrl ?? null,
        altText: badgeValue?.asset.altText ?? name,
        description,
        tint: badgeValue?.tint ?? null,
        primary,
      }
    })

  const primaryIndex = mapped.findIndex((b) => b.primary)
  if (primaryIndex > 0) {
    const [primary] = mapped.splice(primaryIndex, 1)
    mapped.unshift(primary)
  }
  return mapped
})
</script>

<template>
  <div v-if="rendered.length" class="badges-row" aria-label="Owned badges">
    <HintTooltip
      v-for="b in rendered"
      :key="b.linkId"
      as="span"
      variant="bare"
      align="center"
      class="badges-row__badge"
      :class="{ 'badges-row__badge--primary': b.primary }"
      :text="b.label"
      :style="b.tint ? { color: b.tint } : undefined"
    >
      <template #trigger>
        <img v-if="b.imageUrl" :src="b.imageUrl" :alt="b.altText" loading="lazy" decoding="async" />
        <span v-else class="badges-row__placeholder">{{ b.name.charAt(0).toUpperCase() }}</span>
      </template>
      <span class="badges-row__name">{{ b.name }}</span>
      <p v-if="b.description" class="caption">{{ b.description }}</p>
      <p v-if="b.primary" class="caption">Primary badge</p>
    </HintTooltip>
  </div>
</template>

<style scoped>
.badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  max-width: 480px;
}

.badges-row .badges-row__badge {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-btn);
  background: color-mix(in srgb, var(--bg-base) 60%, transparent);
  border: 1px solid var(--bg-overlay);
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.badges-row .badges-row__badge--primary {
  width: 48px;
  height: 48px;
  border-color: var(--page-accent, var(--accent));
}

.badges-row .badges-row__badge:hover,
.badges-row .badges-row__badge:focus-visible {
  transform: scale(1.1);
  outline: none;
  border-color: var(--text-tertiary);
}

.badges-row .badges-row__badge--primary:hover,
.badges-row .badges-row__badge--primary:focus-visible {
  border-color: var(--page-accent, var(--accent));
}

.badges-row__badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: inherit;
}

.badges-row__placeholder {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.badges-row__name {
  display: block;
  font-weight: 600;
}
</style>
