<script setup lang="ts">
import { messageTimeMillis } from '@/composables/useChat'
import { useClickOutside } from '@/composables/useClickOutside'
import { useRefetchOnFocus } from '@/composables/useRefetchOnFocus'
import { useWallSnap } from '@/composables/useWallSnap'
import { useAuthStore } from '@/stores/auth'
import type { PublicClanResponse } from '@/types/api/clans'
import ClanChatTab from '@/views/clans/ClanChatTab.vue'
import { useClanChat } from '@/views/clans/useClanChat'
import { computed, ref, watch } from 'vue'

const SIZE = 48
const INSET = 16
const GAP = 8
const PANEL_WIDTH = 340
const PANEL_HEIGHT = 460
const POLL_SIZE = 50
const POLL_MS = 60000

const props = defineProps<{ clan: PublicClanResponse }>()

const auth = useAuthStore()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const seenUntil = ref<number | null>(null)

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

function latestTime(): number {
  return chat.messages.value.reduce((max, m) => Math.max(max, messageTimeMillis(m.createdAt)), 0)
}

const unread = computed(() => {
  const since = seenUntil.value
  if (open.value || since === null) return 0
  return chat.messages.value.filter(
    (m) => m.author.id !== auth.userId && messageTimeMillis(m.createdAt) > since,
  ).length
})

async function poll() {
  try {
    const { getClanChat } = await import('@/api/clans')
    const page = await getClanChat(props.clan.id, { page: 0, size: POLL_SIZE })
    for (const m of [...page.content].reverse()) chat.ingest(m)
    seenUntil.value ??= latestTime()
  } catch {}
}

useRefetchOnFocus(() => {
  if (!open.value) void poll()
}, POLL_MS)

watch(() => props.clan.id, () => {
  seenUntil.value = null
  open.value = false
  void poll()
}, { immediate: true })

function toggle() {
  if (consumeDragClick()) return
  if (!open.value) void poll()
  open.value = !open.value
}

watch(open, (isOpen) => {
  if (!isOpen) seenUntil.value = latestTime()
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
    '--chat-panel-height': `${Math.max(0, Math.min(PANEL_HEIGHT, room))}px`,
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
