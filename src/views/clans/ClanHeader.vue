<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import type { ClanResponse, ClanStandingResponse } from '@/types/api/clans'
import { cleanClanTag, formatStanding, isPacifist, type ClanProfileDraft } from '@/utils/clans'
import { clamp } from '@/utils/math'
import { computed } from 'vue'
import ClanBar from './ClanBar.vue'
import ClanPacifistBadge from './ClanPacifistBadge.vue'

const draft = defineModel<ClanProfileDraft>('draft')

const props = defineProps<{
  clan: ClanResponse
  standing: ClanStandingResponse | null
  maxLevel: number
  editing?: boolean
  uploadIcon?: (file: File) => Promise<void>
  removeIcon?: () => Promise<void>
  uploadBanner?: (file: File) => Promise<void>
  removeBanner?: () => Promise<void>
}>()

const emit = defineEmits<{ save: []; cancel: [] }>()

function patch(change: Partial<ClanProfileDraft>) {
  if (draft.value) draft.value = { ...draft.value, ...change }
}

const founded = computed(() =>
  new Date(props.clan.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)
const atMax = computed(() => props.maxLevel > 0 && props.clan.level.level >= props.maxLevel)
const progress = computed(() => (atMax.value ? 100 : clamp(props.clan.level.progressPercent, 0, 100)))
const xpLeft = computed(() =>
  Math.max(0, Math.round(props.clan.level.xpForNextLevel - props.clan.level.xpForCurrentLevel)),
)
</script>

<template>
  <header class="clan-header">
    <div class="clan-header__band" :class="{ 'clan-header__band--plain': !clan.clan.bannerUrl }">
      <div
        v-if="clan.clan.bannerUrl"
        class="clan-header__banner"
        :style="{ backgroundImage: `url(${clan.clan.bannerUrl})` }"
        aria-hidden="true"
      />
      <Transition name="fade">
        <ImageUploader
          v-if="editing && uploadBanner"
          class="clan-header__banner-edit"
          bare
          crop
          label="Banner"
          aspect-ratio="4 / 1"
          :image-url="clan.clan.bannerUrl ?? null"
          :upload-handler="uploadBanner"
          :remove-handler="removeBanner"
        />
      </Transition>
    </div>

    <div class="clan-header__identity">
      <div class="clan-header__crest">
        <ClanIcon :clan="clan.clan" :size="120" class="clan-header__icon" />
        <Transition name="fade">
          <ImageUploader
            v-if="editing && uploadIcon"
            class="clan-header__crest-edit"
            bare
            crop
            label="Icon"
            aspect-ratio="1 / 1"
            :image-url="clan.clan.iconUrl ?? null"
            :upload-handler="uploadIcon"
            :remove-handler="removeIcon"
          />
        </Transition>
      </div>
      <div class="clan-header__titles">
        <h1 class="clan-header__title">
          <ClanTag
            :clan="clan.clan"
            size="lg"
            effects
            class="clan-header__tag"
            :editable="!!draft"
            @update:tag="patch({ tag: cleanClanTag($event) })"
          />
          <input
            v-if="draft"
            class="inline-edit clan-header__name clan-header__name-input"
            :value="draft.name"
            maxlength="32"
            placeholder="Clan name"
            aria-label="Name"
            @input="patch({ name: ($event.target as HTMLInputElement).value })"
            @keydown.enter.prevent="emit('save')"
            @keydown.escape.prevent="emit('cancel')"
          />
          <ClanName v-else class="clan-header__name" :clan="clan.clan" />
          <ClanPacifistBadge v-if="isPacifist(clan)" />
        </h1>
        <label v-if="draft" class="clan-header__description clan-header__description-edit">
          <span aria-hidden="true">{{ draft.description }} </span>
          <textarea
            class="inline-edit"
            :value="draft.description"
            maxlength="500"
            rows="1"
            placeholder="Description"
            aria-label="Description"
            @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
          />
        </label>
        <p v-else-if="clan.description" class="clan-header__description">{{ clan.description }}</p>
        <p class="caption">
          Est. {{ founded }}<template v-if="draft"> · {{ draft.description.length }} / 500</template>
        </p>
      </div>
      <div class="clan-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <Transition name="collapse">
      <div v-if="editing" class="collapsible clan-header__editor">
        <div><slot name="editor" /></div>
      </div>
    </Transition>

    <div class="clan-header__stats">
      <StatBlock label="Level" :value="clan.level.level" :decimals="0">
        <ClanBar :value="progress" :max="100" />
        <span class="caption">{{ atMax ? 'Max level' : `${xpLeft.toLocaleString()} XP to level ${clan.level.level + 1}` }}</span>
      </StatBlock>
      <StatBlock label="Rank" :value="standing ? `#${standing.rank}` : '-'" />
      <StatBlock label="Standing" :value="formatStanding(clan.standing)" />
      <StatBlock label="Members" :value="`${clan.memberCount} / ${clan.memberCap}`" />
    </div>
  </header>
</template>

<style scoped>
.clan-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.clan-header__band {
  position: relative;
  height: 280px;
  margin: calc(-1 * var(--space-xl)) calc(-1 * var(--space-xl)) 0;
  overflow: hidden;
}

.clan-header__band--plain {
  height: 140px;
}

.clan-header__banner {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 55%, transparent 100%);
}

.clan-header__identity {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
  margin-top: -64px;
  min-width: 0;
}

.clan-header__banner-edit {
  position: absolute;
  top: var(--space-md);
  right: var(--space-xl);
}

.clan-header__crest {
  position: relative;
}

.clan-header__crest-edit {
  position: absolute;
  right: 0;
  bottom: 0;
}

.clan-header__name-input {
  flex: 1;
  width: 0;
  min-width: 160px;
  max-width: 420px;
  padding-top: 1px;
  font: inherit;
  color: var(--text-primary);
}

.clan-header__titles .clan-header__description-edit {
  display: grid;
  width: 100%;
  margin-bottom: -2px;
}

.clan-header__description-edit > * {
  grid-area: 1 / 1;
  min-width: 0;
  font: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.clan-header__description-edit > span {
  visibility: hidden;
  border-bottom: 2px solid transparent;
}

.clan-header__description-edit > textarea {
  color: inherit;
  resize: none;
  overflow: hidden;
}

.clan-header__editor {
  margin-bottom: calc(-1 * var(--space-md));
  padding-left: calc(120px + var(--space-lg));
}

.clan-header__editor > div {
  padding-bottom: var(--space-md);
}

.clan-header__icon {
  background: var(--bg-base);
  border-radius: var(--radius-avatar);
}

.clan-header__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding-bottom: var(--space-xs);
}

.clan-header__actions {
  flex-shrink: 0;
  padding-bottom: var(--space-sm);
}

.clan-header__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  min-width: 0;
  font-size: calc(var(--text-page-title) * 1.35);
  line-height: 1.15;
}

.clan-header__tag {
  font-size: 0.55em;
}

.clan-header__name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.clan-header__description {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.clan-header__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-lg);
}

.clan-header__stats > .stat-block {
  padding: 0;
}

@media (max-width: 767px) {
  .clan-header__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-md);
  }

  .clan-header__band {
    height: 200px;
    margin: calc(-1 * var(--space-md)) calc(-1 * var(--space-md)) 0;
  }

  .clan-header__band--plain {
    height: 112px;
  }

  .clan-header__identity {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-md);
    margin-top: -48px;
  }

  .clan-header__icon {
    width: 88px !important;
    height: 88px !important;
  }

  .clan-header__titles {
    flex-basis: 100%;
  }

  .clan-header__actions {
    position: absolute;
    top: 56px;
    right: 0;
  }

  .clan-header__editor {
    padding-left: 0;
  }

  .clan-header__title {
    font-size: var(--text-page-title);
  }
}
</style>
