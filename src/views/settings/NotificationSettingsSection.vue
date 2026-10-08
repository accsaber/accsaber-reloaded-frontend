<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { NotificationSettings } from '@/types/api/settings'
import { onMounted, ref } from 'vue'
import SettingsPicker from './SettingsPicker.vue'

const NOTIFICATION_DEFAULTS: NotificationSettings = {
  'notifications.tradeOffer': true,
  'notifications.tradeResolved': true,
  'notifications.marketSold': true,
  'notifications.marketBid': true,
  'notifications.marketOutbid': true,
  'notifications.itemEarned': true,
  'notifications.server': true,
  'notifications.clanMembership': true,
  'notifications.clanAlliance': true,
  'notifications.clanWar': true,
}

const CONTROLS: { key: keyof NotificationSettings & string; title: string }[] = [
  {
    key: 'notifications.tradeOffer',
    title: 'New trade offers',
  },
  {
    key: 'notifications.tradeResolved',
    title: 'Trade offers accepted or declined',
  },
  {
    key: 'notifications.marketSold',
    title: 'Your market item sells',
  },
  {
    key: 'notifications.marketBid',
    title: 'Someone bids on your listing',
  },
  {
    key: 'notifications.marketOutbid',
    title: 'You get outbid on a listing',
  },
  {
    key: 'notifications.itemEarned',
    title: 'You receive a new item',
  },
  {
    key: 'notifications.clanMembership',
    title: 'Clan membership',
  },
  {
    key: 'notifications.clanAlliance',
    title: 'Clan alliances and rivals',
  },
  {
    key: 'notifications.clanWar',
    title: 'Clan wars',
  },
  {
    key: 'notifications.server',
    title: 'Server announcements',
  },
]

const ON_OFF_OPTIONS = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
]

const settings = ref<NotificationSettings | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const { getMySettingsGroup } = await import('@/api/settings')
    const res = await getMySettingsGroup<NotificationSettings>('notifications')
    settings.value = { ...NOTIFICATION_DEFAULTS, ...res }
  } catch {
    error.value = "Couldn't load notification settings."
  }
})

async function setToggle(key: keyof NotificationSettings & string, value: boolean) {
  const current = settings.value
  if (!current || saving.value || current[key] === value) return
  const previous = current[key]
  settings.value = { ...current, [key]: value }
  saving.value = true
  error.value = null
  try {
    const { patchMySettingsGroup } = await import('@/api/settings')
    const fresh = await patchMySettingsGroup<NotificationSettings>('notifications', {
      [key]: value,
    })
    settings.value = { ...NOTIFICATION_DEFAULTS, ...fresh }
  } catch {
    settings.value = { ...current, [key]: previous }
    error.value = "Couldn't save notification setting."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="settings-card">
    <header class="settings-card__header">
      <h2 class="settings-card__title">Notifications</h2>
    </header>

    <template v-if="settings === null && !error">
      <div v-for="i in CONTROLS.length" :key="i" class="settings-card__skeleton">
        <SkeletonLoader variant="text" :lines="2" />
      </div>
    </template>

    <template v-else-if="settings !== null">
      <div v-for="control in CONTROLS" :key="control.key" class="settings-row">
        <div class="settings-row__label">
          <span class="settings-row__title">{{ control.title }}</span>
        </div>
        <SettingsPicker :model-value="settings[control.key] as boolean" :options="ON_OFF_OPTIONS"
          :aria-label="control.title" :disabled="saving"
          @update:model-value="(v) => setToggle(control.key, v as boolean)" />
      </div>
    </template>

    <p v-if="error" class="settings-card__error">{{ error }}</p>

  </section>
</template>

<style scoped>
.settings-card__skeleton {
  padding: var(--space-sm) 0;
}
</style>
