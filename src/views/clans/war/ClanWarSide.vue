<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarSideResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import WarBar from './WarBar.vue'

defineProps<{
  side: ClanWarSideResponse
  role: 'attacker' | 'defender'
}>()
</script>

<template>
  <section class="war-side" :class="`war-side--${role}`">
    <span class="war-side__role">{{ role }}</span>
    <RouterLink class="war-side__identity" :to="{ name: 'clan-detail', params: { slugOrId: side.clan.slug } }">
      <ClanIcon :clan="side.clan" :size="64" />
      <span class="war-side__titles">
        <ClanTag :clan="side.clan" effects class="war-side__tag" />
        <ClanName class="war-side__name" :clan="side.clan" />
      </span>
    </RouterLink>
    <div class="war-side__stake">
      <span class="war-side__numbers">
        <span class="war-side__remaining">{{ formatStanding(side.stakeRemaining) }}</span>
        <span class="war-side__total">/ {{ formatStanding(side.stake) }}</span>
      </span>
      <WarBar :value="side.stakeRemaining" :max="side.stake" :tone="role" size="lg" />
    </div>
    <dl class="war-side__facts">
      <div class="war-side__fact">
        <dt>Lead</dt>
        <dd>
          <UserChip v-if="side.lead" :user="side.lead" size="sm" link tooltip />
          <span v-else class="war-side__none">Nobody yet</span>
        </dd>
      </div>
      <div class="war-side__fact">
        <dt>Standing at declare</dt>
        <dd class="war-side__mono">{{ formatStanding(side.standingAtDeclare) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.war-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-top: 3px solid var(--war-side-accent);
  border-radius: var(--radius-card);
}

.war-side--attacker {
  --war-side-accent: var(--error);
}

.war-side--defender {
  --war-side-accent: var(--info);
}

.war-side__role {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--war-side-accent);
}

.war-side__identity {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}

.war-side__titles {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

.war-side__tag {
  font-size: var(--text-card-title);
}

.war-side__name {
  font-size: var(--text-section-heading);
  font-weight: 700;
}

.war-side__stake {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.war-side__numbers {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-family: var(--font-mono);
}

.war-side__remaining {
  font-size: var(--text-page-title);
  font-weight: 600;
  line-height: 1;
  color: var(--text-primary);
}

.war-side__total {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.war-side__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
  margin: 0;
}

.war-side__fact {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.war-side__fact dt {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.war-side__fact dd {
  margin: 0;
}

.war-side__mono {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.war-side__none {
  font-size: var(--text-body);
  color: var(--text-tertiary);
}
</style>
