<script setup lang="ts">
import type { GlintPosition } from '@/components/common/GlintOverlay.vue';
import GlintOverlay from '@/components/common/GlintOverlay.vue';
import { tierKey as toTierKey } from '@/stores/levels';
import { computed } from 'vue';

const BORDER_SPARKLES: GlintPosition[] = [
  { top: '-2px', left: '20%', delay: '0s', duration: '2.6s' },
  { top: '-2px', right: '15%', delay: '1.2s', duration: '3s' },
  { top: '25%', right: '-2px', delay: '0.4s', duration: '2.8s' },
  { bottom: '20%', right: '-2px', delay: '1.8s', duration: '3.2s' },
  { bottom: '-2px', right: '25%', delay: '0.8s', duration: '2.5s' },
  { bottom: '-2px', left: '20%', delay: '2.2s', duration: '3.4s' },
  { top: '65%', left: '-2px', delay: '1.5s', duration: '2.7s' },
  { top: '15%', left: '-2px', delay: '0.6s', duration: '3.1s' },
]

const props = defineProps<{
  level: number
  currentXp: number
  requiredXp: number
  avatarUrl?: string
  title?: string
  hideProgress?: boolean
}>()

const tierKey = computed(() => props.title ? toTierKey(props.title) : 'newcomer')

const tierColor = computed(() => `var(--tier-${tierKey.value})`)

const progressPercent = computed(() => {
  if (props.requiredXp <= 0) return 100
  return Math.min((props.currentXp / props.requiredXp) * 100, 100)
})

</script>

<template>
  <div class="level-badge">
    <div class="level-badge__frame" :class="`level-badge__frame--${tierKey}`">
      <div v-if="avatarUrl" class="level-badge__avatar-wrap">
        <img class="level-badge__avatar" :src="avatarUrl" alt="Avatar" loading="lazy" />
      </div>
      <GlintOverlay v-if="tierKey === 'ascendant'" :positions="BORDER_SPARKLES" :count="8" />
    </div>

    <div class="level-badge__below">
      <span class="level-badge__title-line" :style="{ color: tierColor }">
        <span class="level-badge__level">Lv. {{ level }}</span>
        <span v-if="title" class="level-badge__title">{{ title }}</span>
      </span>
      <div v-if="!hideProgress" class="level-badge__bar-wrap">
        <div class="level-badge__bar">
          <div class="level-badge__fill" :style="{
            width: progressPercent + '%',
            backgroundColor: tierColor,
          }" />
        </div>
        <span class="level-badge__xp">{{ Math.round(currentXp).toLocaleString() }} / {{
          Math.round(requiredXp).toLocaleString() }} XP</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.level-badge__frame {
  position: relative;
  padding: 3px;
  border-radius: var(--radius-avatar);
}

.level-badge__frame--newcomer {
  background: #6b7280;
}

.level-badge__frame--apprentice {
  background: #3b82f6;
}

.level-badge__frame--adept {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.3);
}

.level-badge__frame--skilled {
  background: linear-gradient(135deg, #92400e, #cd7f32, #e8a84c, #cd7f32, #92400e);
  box-shadow: 0 0 8px rgba(205, 127, 50, 0.35);
}

.level-badge__frame--expert {
  background: linear-gradient(135deg, #9090a0, #c0c0d0, #f0f0ff, #c0c0d0, #9090a0);
  box-shadow: 0 0 10px rgba(192, 192, 210, 0.4);
}

.level-badge__frame--master {
  background: linear-gradient(135deg, #a16207, #fbbf24, #fde68a, #fbbf24, #a16207);
  box-shadow:
    0 0 10px rgba(251, 191, 36, 0.35),
    0 0 22px rgba(251, 191, 36, 0.12);
}

.level-badge__frame--grandmaster {
  padding: 4px;
  background: linear-gradient(var(--angle, 135deg), #6d28d9, #8b5cf6, #a78bfa, #8b5cf6, #6d28d9);
  box-shadow:
    0 0 12px rgba(139, 92, 246, 0.45),
    0 0 24px rgba(139, 92, 246, 0.15);
  animation: frame-rotate 6s linear infinite;
}

.level-badge__frame--legend {
  padding: 4px;
  background: linear-gradient(var(--angle, 0deg), #c2410c, #f97316, #fdba74, #f97316, #c2410c);
  box-shadow:
    0 0 14px rgba(249, 115, 22, 0.45),
    0 0 28px rgba(249, 115, 22, 0.15);
  animation: frame-rotate 5s linear infinite;
}

.level-badge__frame--transcendent {
  padding: 4px;
  background: linear-gradient(var(--angle, 0deg), #0891b2, #22d3ee, #a5f3fc, #22d3ee, #0891b2);
  box-shadow:
    0 0 14px rgba(34, 211, 238, 0.5),
    0 0 28px rgba(34, 211, 238, 0.2),
    inset 0 0 1px rgba(255, 255, 255, 0.3);
  animation: frame-rotate 4s linear infinite;
}

.level-badge__frame--mythic {
  padding: 4px;
  background: linear-gradient(var(--angle, 0deg), #7f1d1d, #dc2626, #f97316, #fbbf24, #f97316, #dc2626, #7f1d1d);
  box-shadow:
    0 0 14px rgba(220, 38, 38, 0.6),
    0 0 28px rgba(249, 115, 22, 0.25);
  animation: frame-rotate 3s linear infinite;
}

.level-badge__frame--mythic::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: calc(var(--radius-avatar) + 3px);
  background:
    radial-gradient(ellipse at 30% 15%, rgba(251, 191, 36, 0.4), transparent 45%),
    radial-gradient(ellipse at 75% 85%, rgba(251, 191, 36, 0.35), transparent 45%);
  animation: ember-a 3.5s ease-in-out infinite;
  pointer-events: none;
}

.level-badge__frame--mythic::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: calc(var(--radius-avatar) + 3px);
  background:
    radial-gradient(ellipse at 80% 25%, rgba(249, 115, 22, 0.3), transparent 45%),
    radial-gradient(ellipse at 15% 70%, rgba(249, 115, 22, 0.25), transparent 45%);
  animation: ember-b 4.7s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ember-a {

  0%,
  100% {
    opacity: 0.3;
  }

  40% {
    opacity: 1;
  }

  70% {
    opacity: 0.5;
  }
}

@keyframes ember-b {

  0%,
  100% {
    opacity: 0.6;
  }

  30% {
    opacity: 0.2;
  }

  60% {
    opacity: 0.9;
  }

  85% {
    opacity: 0.35;
  }
}

.level-badge__frame--ascendant {
  padding: 5px;
  background: linear-gradient(var(--angle, 0deg), #f472b6, #a78bfa, #818cf8, #60a5fa, #a78bfa, #e879f9, #f472b6);
  box-shadow:
    0 0 18px rgba(244, 114, 182, 0.5),
    0 0 36px rgba(167, 139, 250, 0.25),
    0 0 54px rgba(129, 140, 248, 0.1);
  animation: frame-rotate 2.5s linear infinite;
}


@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes frame-rotate {
  to {
    --angle: 360deg;
  }
}

.level-badge__avatar-wrap {
  width: 96px;
  height: 96px;
  border-radius: calc(var(--radius-avatar) - 1px);
  overflow: hidden;
  background: var(--bg-base);
}

.level-badge__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.level-badge__below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.level-badge__title-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-weight: 700;
  white-space: nowrap;
}

.level-badge__level {
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.level-badge__title {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.level-badge__bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 0 var(--space-xs);
}

.level-badge__bar {
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
}

.level-badge__fill {
  height: 100%;
  border-radius: 2px;
  transition: width 300ms ease-out;
}

.level-badge__xp {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {

  .level-badge__frame--grandmaster,
  .level-badge__frame--legend,
  .level-badge__frame--transcendent,
  .level-badge__frame--mythic,
  .level-badge__frame--mythic::before,
  .level-badge__frame--mythic::after,
  .level-badge__frame--ascendant {
    animation: none;
  }

  .level-badge__fill {
    transition: none;
  }
}
</style>
