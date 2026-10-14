<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { PublicClanResponse } from '@/types/api/clans'

defineProps<{ clan: PublicClanResponse }>()
</script>

<template>
  <RouterLink class="clan-link" :to="{ name: 'clan-detail', params: { slugOrId: clan.slug } }">
    <ClanIcon :clan="clan" :size="32" />
    <ClanTag :clan="clan" size="md" effects />
    <span class="clan-link__name">{{ clan.name }}</span>
  </RouterLink>
</template>

<style scoped>
.clan-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
  color: var(--text-primary);
  text-decoration: none;
}

.clan-link__name {
  font-size: var(--text-body);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clan-link:hover .clan-link__name {
  color: var(--page-accent, var(--accent));
}
</style>
