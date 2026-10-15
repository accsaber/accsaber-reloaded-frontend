<script setup lang="ts">
import { messageTimeMillis } from '@/composables/useChat'
import { useClickOutside } from '@/composables/useClickOutside'
import { useRefetchOnFocus } from '@/composables/useRefetchOnFocus'
import { useWallSnap } from '@/composables/useWallSnap'
import type { PublicClanResponse } from '@/types/api/clans'
import ClanChatTab from '@/components/domain/ClanChatTab.vue'
import { useClanChat } from '@/composables/useClanChat'
import { computed, ref, watch } from 'vue'
import { clamp } from '@/utils/math'

const SIZE = 48
const INSET = 16
const GAP = 8
const PANEL_WIDTH = 340
const PANEL_HEIGHT = 460
const POLL_MS = 60000

const props = defineProps<{ clan: PublicClanResponse }>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const seenUntil = ref<string | null>(null)
const unreadCount = ref(0)

function close() {
  open.value = false
}

const clanId = computed<string | null>(() => props.clan.id)
const { chat, notices, status } = useClanChat(clanId, open, {
  onPresence: () => {},
  onRejected: close,
})

const { side, position, dragging, viewport, consumeDragClick, handlers } = useWallSnap(
  'clan-chat-bubble',
  SIZE,
  INSET,
)

function latestSeen(): string | null {
  const latest = chat.messages.value.reduce((max, m) => Math.max(max, messageTimeMillis(m.createdAt)), 0)
  return latest > 0 ? new Date(latest).toISOString() : seenUntil.value
}

const unread = computed(() => (open.value ? 0 : unreadCount.value))

async function poll() {
  const clanId = props.clan.id
  const since = seenUntil.value
  try {
    const { getClanChatUnread } = await import('@/api/clans')
    const res = await getClanChatUnread(clanId, since ?? new Date().toISOString())
    if (clanId !== props.clan.id || since !== seenUntil.value) return
    if (since === null) seenUntil.value = res.latestAt ?? new Date().toISOString()
    else unreadCount.value = res.count
  } catch {}
}

useRefetchOnFocus(() => {
  if (!open.value) void poll()
}, POLL_MS)

watch(() => props.clan.id, () => {
  seenUntil.value = null
  unreadCount.value = 0
  open.value = false
  void poll()
}, { immediate: true })

function toggle() {
  if (consumeDragClick()) return
  open.value = !open.value
}

watch(open, (isOpen) => {
  if (isOpen) return
  seenUntil.value = latestSeen()
  unreadCount.value = 0
})

useClickOutside(root, open, close)

const opensUp = computed(() => position.value.y + SIZE / 2 > viewport.value.height / 2)

const bubbleStyle = computed(() => ({
  transform: `translate3d(${position.value.x}px, ${position.value.y}px, 0)`,
}))

const panelStyle = computed(() => {
  const { y } = position.value
  const room = opensUp.value ? y - GAP - INSET : viewport.value.height - y - SIZE - GAP - INSET
  const style: Record<string, string> = {
    width: `min(${PANEL_WIDTH}px, calc(100vw - ${INSET * 2}px))`,
    '--chat-panel-height': `${clamp(room, 0, PANEL_HEIGHT)}px`,
    [side.value]: `${INSET}px`,
  }
  if (opensUp.value) style.bottom = `${viewport.value.height - y + GAP}px`
  else style.top = `${y + SIZE + GAP}px`
  return style
})

const label = computed(() =>
  unread.value > 0 ? `Clan chat, ${unread.value} unread` : open.value ? 'Close clan chat' : 'Open clan chat',
)
</script>

<template>
  <div ref="root">
    <button
      type="button"
      class="bubble"
      :class="{ 'bubble--dragging': dragging, 'bubble--open': open }"
      :style="bubbleStyle"
      :aria-label="label"
      :aria-expanded="open"
      v-on="handlers"
      @click="toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span v-if="unread > 0" class="bubble__badge" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
    </button>

    <div v-if="open" class="bubble-panel" :style="panelStyle">
      <ClanChatTab :chat="chat" :notices="notices" :status="status" :clan-slug="clan.slug" closable @close="close" />
    </div>
  </div>
</template>

<style scoped>
.bubble {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-avatar);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  transition:
    transform 220ms cubic-bezier(0.25, 1, 0.5, 1),
    color 120ms ease,
    border-color 120ms ease;
}

.bubble:hover,
.bubble--open {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.bubble:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.bubble--dragging {
  cursor: grabbing;
  transition: none;
}

.bubble__badge {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 14px;
  text-align: center;
  color: var(--bg-base);
  background: var(--accent);
  border: 2px solid var(--bg-base);
  border-radius: 999px;
}

.bubble-panel {
  position: fixed;
  z-index: 90;
}

@media (prefers-reduced-motion: reduce) {
  .bubble {
    transition: none;
  }
}
</style>
