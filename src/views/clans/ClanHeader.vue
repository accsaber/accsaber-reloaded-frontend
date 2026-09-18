<script setup lang="ts">
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanResponse, ClanStandingResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { formatFullDate } from '@/utils/formatters'
import { pickAssetUrl, pickVideoOrAssetUrl, readBackgroundValue, readClanCosmetics } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  clan: ClanResponse
  standing: ClanStandingResponse | null
}>()

const banner = computed(() => {
  const item = props.clan.clan.equipped.find((i) => i.typeKey === 'clan_banner')
  return item ? readBackgroundValue(item.value) : null
})
const bannerUrl = computed(() => pickVideoOrAssetUrl(banner.value?.asset))
const bannerIsVideo = computed(() => !!banner.value?.asset.video)
const bannerImageUrl = computed(() => pickAssetUrl(banner.value?.asset))
const bannerStyle = computed<Record<string, string> | undefined>(() => {
  const value = banner.value
  if (!value) return undefined
  const style: Record<string, string> = {}
  if (value.opacity != null) style.opacity = String(value.opacity)
  if (value.blendMode) style.mixBlendMode = value.blendMode
  return style
})
const bannerFitClass = computed(() => (banner.value?.fit ? `clan-header__banner--${banner.value.fit}` : ''))

const emblemUrl = computed(() => pickAssetUrl(readClanCosmetics(props.clan.clan.equipped).emblem?.asset))
const level = computed(() => props.clan.level)
const progress = computed(() => Math.max(0, Math.min(100, level.value.progressPercent)))
</script>

<template>
  <header class="clan-header">
    <div v-if="bannerUrl" class="clan-header__bleed" aria-hidden="true">
      <video
        v-if="bannerIsVideo"
        class="clan-header__banner"
        :class="bannerFitClass"
        :src="bannerUrl"
        :style="bannerStyle"
        autoplay
        loop
        muted
        playsinline
      />
      <div
        v-else-if="bannerImageUrl"
        class="clan-header__banner"
        :class="bannerFitClass"
        :style="{ ...bannerStyle, backgroundImage: `url(${bannerImageUrl})` }"
      />
    </div>

    <div class="clan-header__card">
      <div class="clan-header__identity">
        <img v-if="emblemUrl" class="clan-header__emblem" :src="emblemUrl" alt="" decoding="async" />
        <div class="clan-header__titles">
          <h1 class="clan-header__title">
            <ClanTag :clan="clan.clan" size="lg" effects :emblem="!emblemUrl" class="clan-header__tag" />
            <span class="clan-header__name">{{ clan.clan.name }}</span>
          </h1>
          <p v-if="clan.description" class="clan-header__description">{{ clan.description }}</p>
        </div>
      </div>

      <dl class="clan-header__facts">
        <div class="clan-header__fact clan-header__fact--level">
          <dt>Level</dt>
          <dd>
            <span class="clan-header__number">{{ level.level }}</span>
            <span class="clan-header__bar" aria-hidden="true">
              <span class="clan-header__fill" :style="{ width: `${progress}%` }" />
            </span>
          </dd>
        </div>
        <div class="clan-header__fact">
          <dt>Standing</dt>
          <dd>
            <span class="clan-header__number clan-header__number--accent">{{ formatStanding(clan.standing) }}</span>
            <span v-if="standing" class="clan-header__rank">#{{ standing.rank }}</span>
          </dd>
        </div>
        <div class="clan-header__fact">
          <dt>Members</dt>
          <dd><span class="clan-header__number">{{ clan.memberCount }}<span class="clan-header__cap">/{{ clan.memberCap }}</span></span></dd>
        </div>
        <div class="clan-header__fact clan-header__fact--founder">
          <dt>Founded</dt>
          <dd class="clan-header__founder">
            <UserChip v-if="clan.founder" :user="clan.founder" size="sm" link tooltip />
            <span class="clan-header__date">{{ formatFullDate(clan.createdAt) }}</span>
          </dd>
        </div>
      </dl>
    </div>
  </header>
</template>

<style scoped>
.clan-header {
  position: relative;
  padding-top: var(--space-2xl);
}

.clan-header__bleed {
  position: absolute;
  top: calc(-1 * var(--space-xl));
  left: calc(-1 * var(--space-xl));
  right: calc(-1 * var(--space-xl));
  height: 420px;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}

.clan-header__banner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  object-fit: cover;
}

.clan-header__banner--contain {
  background-size: contain;
  object-fit: contain;
}

.clan-header__banner--tile {
  background-size: auto;
  background-repeat: repeat;
}

.clan-header__banner--center {
  background-size: auto;
  object-fit: none;
}

.clan-header__card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-xl);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
}

.clan-header__identity {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  min-width: 0;
}

.clan-header__emblem {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-avatar);
  object-fit: contain;
}

.clan-header__titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.clan-header__title {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin: 0;
  min-width: 0;
  font-size: calc(var(--text-page-title) * 1.35);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.clan-header__tag {
  font-size: 0.7em;
}

.clan-header__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clan-header__description {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.clan-header__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-md);
  margin: 0;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

.clan-header__fact {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.clan-header__fact dt {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.clan-header__fact dd {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0;
  min-width: 0;
}

.clan-header__number {
  font-family: var(--font-mono);
  font-size: var(--text-page-title);
  font-weight: 600;
  line-height: 1;
  color: var(--text-primary);
}

.clan-header__number--accent {
  color: var(--page-accent, var(--accent));
}

.clan-header__cap {
  font-size: var(--text-card-title);
  color: var(--text-tertiary);
}

.clan-header__rank {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-secondary);
}

.clan-header__bar {
  flex: 1;
  height: 4px;
  min-width: 48px;
  max-width: 140px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
  align-self: center;
}

.clan-header__fill {
  display: block;
  height: 100%;
  background: var(--page-accent, var(--accent));
}

.clan-header__founder {
  flex-wrap: wrap;
  align-items: center;
}

.clan-header__date {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .clan-header {
    padding-top: var(--space-lg);
  }

  .clan-header__bleed {
    top: calc(-1 * var(--space-md));
    left: calc(-1 * var(--space-md));
    right: calc(-1 * var(--space-md));
    height: 300px;
  }

  .clan-header__card {
    padding: var(--space-lg) var(--space-md);
  }

  .clan-header__identity {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }

  .clan-header__title {
    flex-wrap: wrap;
    font-size: var(--text-page-title);
  }

  .clan-header__name {
    white-space: normal;
  }

  .clan-header__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
