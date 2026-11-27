<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import type { ClanResponse, ClanStandingResponse, PublicClanResponse } from '@/types/api/clans'
import { cleanClanTag, formatStanding, isPacifist, type ClanProfileDraft } from '@/utils/clans'
import { clamp } from '@/utils/math'
import { computed } from 'vue'
import ClanBar from './ClanBar.vue'
import ClanPacifistBadge from './ClanPacifistBadge.vue'

const draft = defineModel<ClanProfileDraft>('draft')

const props = defineProps<{
  identity: PublicClanResponse
  clan: ClanResponse | null
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
  props.clan ? new Date(props.clan.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '',
)
const level = computed(() => props.clan?.level ?? null)
const atMax = computed(() => !!level.value && props.maxLevel > 0 && level.value.level >= props.maxLevel)
const progress = computed(() => (atMax.value ? 100 : clamp(level.value?.progressPercent ?? 0, 0, 100)))
const xpLeft = computed(() =>
  level.value ? Math.max(0, Math.round(level.value.xpForNextLevel - level.value.xpForCurrentLevel)) : 0,
)
</script>

<template>
  <header class="clan-header">
    <div class="clan-header__band" :class="{ 'clan-header__band--plain': !identity.bannerUrl }">
      <div
        v-if="identity.bannerUrl"
        class="clan-header__banner"
        :style="{ backgroundImage: `url(${identity.bannerUrl})` }"
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
          :image-url="identity.bannerUrl ?? null"
          :upload-handler="uploadBanner"
          :remove-handler="removeBanner"
        />
      </Transition>
    </div>

    <div class="clan-header__identity">
      <div class="clan-header__crest">
        <ClanIcon :clan="identity" :size="120" class="clan-header__icon" />
        <Transition name="fade">
          <ImageUploader
            v-if="editing && uploadIcon"
            class="clan-header__crest-edit"
            bare
            crop
            label="Icon"
            aspect-ratio="1 / 1"
            :image-url="identity.iconUrl ?? null"
            :upload-handler="uploadIcon"
            :remove-handler="removeIcon"
          />
        </Transition>
      </div>
      <div class="clan-header__titles">
        <h1 class="clan-header__title">
          <ClanTag
            :clan="identity"
            size="lg"
            effects
            data-shared-target
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
          <ClanName v-else class="clan-header__name" :clan="identity" />
          <ClanPacifistBadge v-if="clan && isPacifist(clan)" />
        </h1>
        <p class="caption clan-header__line">
          <template v-if="clan">Est. {{ founded }}</template><template v-if="draft"> · {{ draft.description.length }} / 500</template>
        </p>
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
        <p v-else class="clan-header__description">{{ clan?.description }}</p>
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
      <StatBlock label="Level" :value="clan ? clan.level.level : ''" :decimals="0">
        <ClanBar :value="progress" :max="100" />
        <span class="caption clan-header__line">
          <template v-if="clan">{{ atMax ? 'Max level' : `${xpLeft.toLocaleString()} XP to level ${clan.level.level + 1}` }}</template>
        </span>
      </StatBlock>
      <StatBlock label="Rank" :value="standing ? `#${standing.rank}` : clan ? '-' : ''" />
      <StatBlock label="Standing" :value="clan ? formatStanding(clan.standing) : ''" />
      <StatBlock label="Members" :value="clan ? `${clan.memberCount} / ${clan.memberCap}` : ''" />
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

.clan-header__icon:where(.clan-icon--plain) {
  background: var(--bg-base);
  border-radius: var(--radius-avatar);
}

.clan-header__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-xs);
  align-self: flex-start;
  min-width: 0;
  padding-top: var(--space-lg);
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
  min-height: 1.22em;
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
  min-height: 2lh;
  color: var(--text-secondary);
}

.clan-header__line {
  display: block;
  min-height: 1lh;
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
    padding-top: 0;
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
