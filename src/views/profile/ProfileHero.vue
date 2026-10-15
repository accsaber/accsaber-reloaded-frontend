<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import PlayerTooltipTrigger from '@/components/domain/PlayerTooltipTrigger.vue'
import RelationActions from '@/components/domain/RelationActions.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useAppearance } from '@/composables/useAppearance'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { useSyncSetting } from '@/composables/useSyncSetting'
import type { EquippedItemsResponse, UserItemResponse } from '@/types/api/items'
import type { SupporterStateResponse } from '@/types/api/supporters'
import type { LevelResponse, StatsDiffResponse, UserResponse } from '@/types/api/users'
import type { UserRefDisplay } from '@/types/display'
import NameHistoryPopover from '@/views/profile/NameHistoryPopover.vue'
import ProfileBadgesRow from '@/views/profile/ProfileBadgesRow.vue'
import ProfileXpTrend from '@/views/profile/ProfileXpTrend.vue'
import SupporterProfileSection from '@/views/profile/SupporterProfileSection.vue'
import { computed, ref, watch } from 'vue'

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
}>()

const editMode = defineModel<boolean>('editMode', { required: true })

const emit = defineEmits<{
  renamed: [name: string]
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

const nameDraft = ref('')
const nameSaving = ref(false)
const nameError = ref<string | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

const {
  enabled: syncEnabled,
  saving: syncSaving,
  resyncQueued: syncResyncQueued,
  fetch: fetchSyncSetting,
  set: setSyncName,
  reset: resetSyncNotice,
} = useSyncSetting('sync.name')

watch(editMode, (editing) => {
  nameError.value = null
  if (editing) {
    nameDraft.value = props.user.name
    fetchSyncSetting()
  } else {
    resetSyncNotice()
  }
}, { immediate: true })

function nameValidationError(name: string): string | null {
  if (!name) return 'Name cannot be empty.'
  if (name.length > 64) return 'Name must be 64 characters or fewer.'
  return null
}

async function saveName() {
  const trimmed = nameDraft.value.trim()
  nameError.value = nameValidationError(trimmed)
  if (nameError.value) return
  if (trimmed === props.user.name) {
    nameInputRef.value?.blur()
    return
  }
  nameSaving.value = true
  try {
    const { updateMyProfile } = await import('@/api/users')
    await updateMyProfile({ name: trimmed })
    emit('renamed', trimmed)
    nameInputRef.value?.blur()
    fetchSyncSetting()
  } catch (err) {
    nameError.value = parseApiError(err, 'Could not save your name.').message
  } finally {
    nameSaving.value = false
  }
}

function cancelNameEdit() {
  nameDraft.value = props.user.name
  nameError.value = null
  nameInputRef.value?.blur()
}
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
      <ProfileXpTrend v-if="!user.banned && !hideReloadedProfileFeatures" :stats-diff="statsDiff" />
    </div>

    <div class="profile-hero__details">
      <div class="profile-hero__top-row">
        <div class="profile-hero__name-col">
          <div class="profile-hero__name-row">
            <template v-if="editMode && isSelfProfile">
              <input ref="nameInputRef" v-model="nameDraft" type="text" maxlength="64"
                class="profile-hero__name profile-hero__name-input"
                :class="{ 'profile-hero__name-input--error': !!nameError }"
                :disabled="nameSaving" aria-label="Edit display name"
                @keydown.enter.prevent="saveName" @keydown.escape.prevent="cancelNameEdit" />
            </template>
            <UserChip v-else :user="heroUser" hide-avatar name-tag="h1" clan-effects class="profile-hero__name">
              <NameHistoryPopover :user-id="userId" :current-name="user.name" />
            </UserChip>
            <span v-if="user.playerInactive && !user.banned" class="profile-hero__inactive-badge">Inactive</span>
          </div>
          <p v-if="editMode && nameError" class="profile-hero__name-error">{{ nameError }}</p>
          <p v-else-if="editMode && isSelfProfile" class="profile-hero__name-hint">Press Enter to save your name.</p>

          <div v-if="editMode && isSelfProfile && syncEnabled !== null" class="profile-hero__sync">
            <label class="profile-hero__sync-row">
              <input type="checkbox" class="profile-hero__sync-check"
                :checked="syncEnabled" :disabled="syncSaving"
                @change="setSyncName(($event.target as HTMLInputElement).checked)" />
              <span class="profile-hero__sync-label">Sync display name from BeatLeader / ScoreSaber</span>
            </label>
            <p v-if="syncResyncQueued" class="profile-hero__sync-notice">Resyncs at 4 AM.</p>
          </div>
          <ProfileBadgesRow
            v-if="badges.length"
            :badges="badges"
            :primary-link-id="equipped['badge']?.linkId ?? null"
            class="profile-hero__badges"
          />
          <p v-if="user.hmd" class="profile-hero__hmd">{{ user.hmd }}</p>
          <SupporterProfileSection
            v-if="supporterState"
            :state="supporterState"
            :is-self-profile="isSelfProfile"
            class="profile-hero__supporter"
          />
        </div>

        <div class="profile-hero__top-right">
          <div class="profile-hero__links">
            <BaseButton v-if="isSelfProfile" size="sm"
              :aria-label="editMode ? 'Exit edit mode' : 'Edit profile'"
              :title="editMode ? 'Exit edit mode' : 'Edit profile'"
              :variant="editMode ? 'primary' : 'default'"
              @click="editMode = !editMode">
              <svg v-if="editMode" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
        </div>
      </div>

      <div v-if="user.banned || isBlockedByMe" class="profile-hero__banned">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <span>{{ user.banned ? 'This account is banned.' : 'You blocked this player.' }}</span>
      </div>

      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.profile-hero {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: stretch;
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

.profile-hero__top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.profile-hero__top-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.profile-hero__name-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.profile-hero__badges {
  justify-content: flex-start !important;
  max-width: none !important;
}

.profile-hero__hmd {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.profile-hero__supporter {
  margin-top: var(--space-sm);
  align-self: flex-start;
}

.profile-hero__level-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.profile-hero__badge-hover {
  display: flex;
  justify-content: center;
}

.profile-hero__details {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-md);
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

.profile-hero__name-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-sm);
}

.profile-hero__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--space-xs);
}

.profile-hero__name {
  font-size: calc(var(--text-page-title) * 1.15);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.profile-hero__name-input {
  display: inline-block;
  min-width: 200px;
  padding: 0;
  background: transparent;
  border: none;
  border-bottom: 2px dashed var(--bg-overlay);
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 120ms ease;
}

.profile-hero__name-input:focus,
.profile-hero__name-input:hover {
  border-bottom-color: var(--accent);
}

.profile-hero__name-input--error,
.profile-hero__name-input--error:focus {
  border-bottom-color: var(--error);
}

.profile-hero__name-hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.profile-hero__name-error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.profile-hero__sync {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
  max-width: 480px;
}

.profile-hero__sync-row {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.profile-hero__sync-check {
  accent-color: var(--accent);
  cursor: pointer;
}

.profile-hero__sync-check:disabled {
  cursor: progress;
}

.profile-hero__sync-label {
  font-weight: 500;
}

.profile-hero__sync-notice {
  margin: 0;
  padding-left: 22px;
  font-size: var(--text-caption);
  color: var(--accent);
}

.profile-hero__banned {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: var(--radius-card);
  color: var(--error);
  font-size: var(--text-body);
  font-weight: 500;
}

.profile-hero__inactive-badge {
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--bg-overlay) 60%, transparent);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  border: 1px solid var(--bg-overlay);
  letter-spacing: 0.03em;
}

.profile-hero__platform-icon {
  border-radius: var(--radius-btn);
}

@media (max-width: 767px) {
  .profile-hero {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: var(--space-md);
    padding: calc(var(--space-xl) + 36px) 0 var(--space-md);
  }

  .profile-hero > .profile-hero__details {
    position: static;
  }

  .profile-hero__top-right {
    position: absolute;
    top: var(--space-sm);
    right: 0;
    width: auto;
  }

  .profile-hero__details {
    align-items: center;
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

  .profile-hero__name-row {
    justify-content: center;
  }

  .profile-hero__supporter {
    align-self: center;
    justify-content: center;
  }

  .profile-hero__badges {
    justify-content: center !important;
  }

  .profile-hero__links {
    flex-wrap: nowrap;
    justify-content: flex-end;
  }
}
</style>
