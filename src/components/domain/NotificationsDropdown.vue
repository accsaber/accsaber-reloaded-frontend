<script setup lang="ts">
import NavbarPopover from '@/components/layout/NavbarPopover.vue'
import { useNotificationsStore } from '@/stores/notifications'
import type { NotificationResponse } from '@/types/api/notifications'
import { defineAsyncComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const NotificationsPanel = defineAsyncComponent(
  () => import('@/components/domain/NotificationsPanel.vue'),
)

const store = useNotificationsStore()
const router = useRouter()
const open = ref(false)

watch(open, (value) => {
  if (value) void store.refresh()
})

function onSelect(notification: NotificationResponse) {
  open.value = false
  if (!notification.read) void store.markRead(notification.id)
  if (notification.linkTo) void router.push(notification.linkTo)
}
</script>

<template>
  <NavbarPopover v-model:open="open" width="400px"
    :label="store.unreadCount > 0 ? `Notifications, ${store.unreadCount} unread` : 'Notifications'">
    <template #trigger>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="store.unreadCount > 0" class="notifications-badge">{{ store.badgeLabel }}</span>
    </template>

    <NotificationsPanel :notifications="store.feed" :loading="store.feedLoading"
      :unread-count="store.unreadCount" :degraded="store.degraded" @select="onSelect"
      @mark-all="store.markAllRead()" />
  </NavbarPopover>
</template>

<style scoped>
.notifications-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  border-radius: var(--radius-btn);
  color: var(--bg-base);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
  pointer-events: none;
}
</style>
