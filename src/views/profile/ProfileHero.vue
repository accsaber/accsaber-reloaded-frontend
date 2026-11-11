<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import ImageCropModal from '@/components/common/ImageCropModal.vue'
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import PlayerTooltipTrigger from '@/components/domain/PlayerTooltipTrigger.vue'
import RelationActions from '@/components/domain/RelationActions.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useAppearance } from '@/composables/useAppearance'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { IMAGE_ACCEPT, useImagePick } from '@/composables/useImagePick'
import { useSyncSetting } from '@/composables/useSyncSetting'
import type { EquippedItemsResponse, UserItemResponse } from '@/types/api/items'
import type { SupporterStateResponse } from '@/types/api/supporters'
import type { LevelResponse, StatsDiffResponse, UserResponse } from '@/types/api/users'
import type { UserRefDisplay } from '@/types/display'
import NameHistoryPopover from '@/views/profile/NameHistoryPopover.vue'
import ProfileBadgesRow from '@/views/profile/ProfileBadgesRow.vue'
import ProfileXpTrend from '@/views/profile/ProfileXpTrend.vue'
import SupporterProfileSection from '@/views/profile/SupporterProfileSection.vue'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps<{
  user: UserResponse
  userId: string
  avatarUrl: string
  level: LevelResponse | null
  equipped: EquippedItemsResponse
  statsDiff: StatsDiffResponse | null
  badges: UserItemResponse[]
  supporterState: SupporterStateResponse | null
  isSelfProfile: boolean
  isBlockedByMe: boolean
  editing: boolean
  saving: boolean
  editError: string | null
}>()

const nameDraft = defineModel<string>('nameDraft', { required: true })

const emit = defineEmits<{
  edit: []
  save: []
  cancel: []
  'avatar-changed': [user: UserResponse]
}>()

const { hideReloadedProfileFeatures } = useAppearance()

const {
  titleValue,
  borderShapeValue,
  borderColorValue,
  titleEffects,
  borderEffects,
  thumbnailValue,
  thumbnailEffects,
} = useEquippedRenderProps(() => props.equipped, { previewable: true })

const thumbValue = computed(() => (hideReloadedProfileFeatures.value ? null : thumbnailValue.value))

const heroUser = computed<UserRefDisplay>(() => ({
  id: props.userId,
  name: props.user.name,
  avatarUrl: props.user.avatarUrl ?? null,
  cdnAvatarUrl: props.user.cdnAvatarUrl ?? null,
  country: props.user.country ?? null,
  clan: props.user.clan ?? null,
}))

const nameSync = reactive(useSyncSetting('sync.name'))
const avatarSync = reactive(useSyncSetting('sync.avatar'))
const syncs = [
  { label: 'Sync name from BeatLeader or ScoreSaber', setting: nameSync },
  { label: 'Sync avatar from BeatLeader or ScoreSaber', setting: avatarSync },
]

const avatarInput = ref<HTMLInputElement | null>(null)
const avatar = reactive(useImagePick(async (file) => {
  const { uploadMyAvatar } = await import('@/api/cdn')
  emit('avatar-changed', await uploadMyAvatar(file))
  avatarSync.fetch()
}, () => true))

watch(() => props.editing, (editing) => {
  avatar.error = null
  for (const { setting } of syncs) {
    if (editing) setting.fetch()
    else setting.reset()
  }
}, { immediate: true })
</script>

<template>
  <div class="profile-hero">
    <ThumbnailBackdrop class="profile-hero__thumb" :value="thumbValue" :effects="thumbnailEffects" />
    <div class="profile-hero__level-col">
      <PlayerTooltipTrigger class="profile-hero__badge-hover" :user="heroUser">
        <LevelBadge :level="level?.level ?? 0" :current-xp="level?.xpForCurrentLevel ?? 0"
          :required-xp="level?.xpForNextLevel ?? 1" :avatar-url="avatarUrl"
          :plain="hideReloadedProfileFeatures"
          :fallback-title="level?.title"
          :equipped-title="titleValue"
          :equipped-border-shape="borderShapeValue"
          :equipped-border-color="borderColorValue"
          :title-effects="titleEffects"
          :border-effects="borderEffects" />
      </PlayerTooltipTrigger>
      <template v-if="editing">
        <BaseButton size="sm" :loading="avatar.busy" @click="avatarInput?.click()">Change Avatar</BaseButton>
        <p v-if="avatar.error" class="profile-hero__error" role="alert">{{ avatar.error }}</p>
        <input ref="avatarInput" type="file" hidden :accept="IMAGE_ACCEPT" @change="avatar.pick" />
        <ImageCropModal :file="avatar.cropping" @confirm="avatar.send" @close="avatar.cropping = null" />
      </template>
      <ProfileXpTrend v-else-if="!user.banned && !hideReloadedProfileFeatures" :stats-diff="statsDiff" />
    </div>

    <div class="profile-hero__details">
      <div class="profile-hero__top-row">
        <div class="profile-hero__name-col">
          <template v-if="editing">
            <input v-model="nameDraft" type="text" maxlength="64" class="profile-hero__name profile-hero__name-input"
              :disabled="saving" aria-label="Display name" @keydown.enter.prevent="emit('save')"
              @keydown.escape.prevent="emit('cancel')" />
            <template v-for="sync in syncs" :key="sync.label">
              <BaseSwitch v-if="sync.setting.enabled !== null" :model-value="sync.setting.enabled"
                :label="sync.setting.resyncQueued ? `${sync.label}, resyncs at 4 AM` : sync.label"
                :disabled="sync.setting.saving" @update:model-value="sync.setting.set" />
            </template>
          </template>
          <template v-else>
            <UserChip :user="heroUser" hide-avatar name-tag="h1" clan-effects class="profile-hero__name">
              <NameHistoryPopover :user-id="userId" :current-name="user.name" />
            </UserChip>
            <p v-if="user.playerInactive && !user.banned" class="profile-hero__meta">Inactive</p>
          </template>
          <ProfileBadgesRow
            v-if="badges.length"
            :badges="badges"
            :primary-link-id="equipped['badge']?.linkId ?? null"
            class="profile-hero__badges"
          />
        </div>

        <div class="profile-hero__top-right">
          <div v-if="editing" class="profile-hero__links">
            <BaseButton size="sm" :disabled="saving" @click="emit('cancel')">Cancel</BaseButton>
            <BaseButton size="sm" variant="primary" :loading="saving" @click="emit('save')">Save</BaseButton>
          </div>
          <div v-else class="profile-hero__links profile-hero__links--icons">
            <BaseButton v-if="isSelfProfile" size="sm" aria-label="Edit profile" title="Edit profile"
              @click="emit('edit')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </BaseButton>
            <BaseButton size="sm" :href="`https://www.beatleader.com/u/${user.blId ?? user.id}`"
              aria-label="View on BeatLeader">
              <img src="https://beatleader.com/assets/favicon-32x32.png" alt="BeatLeader" width="16" height="16"
                class="profile-hero__platform-icon" decoding="async" />
            </BaseButton>
            <BaseButton size="sm" :href="`https://scoresaber.com/u/${user.ssId ?? user.id}`"
              aria-label="View on ScoreSaber">
              <img src="https://scoresaber.com/favicon-32x32.png" alt="ScoreSaber" width="16" height="16"
                class="profile-hero__platform-icon" decoding="async" />
            </BaseButton>
            <RelationActions :target-user-id="userId" :target-name="user.name" show-snipe />
          </div>
          <p v-if="editError" class="profile-hero__error" role="alert">{{ editError }}</p>
          <SupporterProfileSection
            v-if="supporterState"
            :state="supporterState"
            :is-self-profile="isSelfProfile"
            class="profile-hero__supporter"
          />
          <p v-if="user.hmd && !editing" class="profile-hero__meta">{{ user.hmd }}</p>
        </div>
      </div>

      <p v-if="user.banned || isBlockedByMe" class="profile-hero__error">
        {{ user.banned ? 'This account is banned' : 'You blocked this player' }}
      </p>

      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.profile-hero {
  --hero-avatar: 160px;
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: var(--space-xl);
  padding: var(--space-xl) 0 var(--space-lg);
}

.profile-hero > :not(.thumbnail-backdrop) {
  position: relative;
}

.profile-hero__thumb {
  inset: 0 auto 0 calc(-1 * var(--space-xl));
  width: min(calc(100% + var(--space-xl)), 960px);
  border-radius: 0;
  mask-image:
    linear-gradient(to right, transparent, rgb(0 0 0 / 0.5) 12%, rgb(0 0 0 / 0.25) 50%, transparent),
    linear-gradient(to bottom, transparent, black 20%, black 70%, transparent);
  mask-composite: intersect;
}

.profile-hero__level-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.profile-hero__level-col :deep(.level-badge__stack) {
  width: var(--hero-avatar);
  height: var(--hero-avatar);
}

.profile-hero__badge-hover {
  display: flex;
  justify-content: center;
}

.profile-hero__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.profile-hero__top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.profile-hero__name-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

.profile-hero__name {
  font-size: calc(var(--text-page-title) * 1.15);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.profile-hero .profile-hero__name :deep(.user-chip__clan) {
  font-size: 0.9375rem;
}

.profile-hero .profile-hero__name :deep(.user-chip__flag) {
  font-size: 1.875rem;
}

.profile-hero__name-input {
  width: min(100%, 420px);
  padding: 0;
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--bg-overlay);
  font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.profile-hero__name-input:focus {
  border-bottom-color: var(--accent);
}

.profile-hero__meta {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.profile-hero__error {
  margin: 0;
  font-size: var(--text-body);
  color: var(--error);
}

.profile-hero__badges {
  justify-content: flex-start !important;
  max-width: none !important;
}

.profile-hero__top-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
}

.profile-hero__links {
  display: flex;
  gap: var(--space-xs);
}

.profile-hero__links--icons :deep(.base-button) {
  padding: var(--space-sm);
}

.profile-hero__links--icons :deep(.base-button :is(svg, img)) {
  width: 18px;
  height: 18px;
}

.profile-hero .profile-hero__supporter {
  justify-content: flex-end;
  font-size: var(--text-card-title);
}

.profile-hero__platform-icon {
  border-radius: var(--radius-btn);
}

@media (max-width: 767px) {
  .profile-hero {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
    gap: var(--space-md);
    padding: var(--space-lg) 0 var(--space-md);
  }

  .profile-hero > .profile-hero__details {
    align-items: center;
    width: 100%;
  }

  .profile-hero__top-row {
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
  }

  .profile-hero__name-col {
    width: 100%;
    align-items: center;
  }

  .profile-hero__top-right {
    align-items: center;
  }

  .profile-hero__links {
    flex-wrap: wrap;
    justify-content: center;
  }

  .profile-hero .profile-hero__supporter {
    justify-content: center;
  }

  .profile-hero__badges {
    justify-content: center !important;
  }
}
</style>
