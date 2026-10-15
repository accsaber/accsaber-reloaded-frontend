import { useAuthStore } from '@/stores/auth'
import type { ItemVariant } from '@/types/cosmetics/common'
import { applyThemeTokens, clearThemeTokens } from '@/utils/themeTokens'
import type { EffectLayer } from '@/utils/cosmetics/effectLayers'
import { readStored, readStoredString, writeStored, writeStoredString } from '@/utils/storage'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type BuiltinTheme = 'dark' | 'light'
export type Theme = BuiltinTheme | string

const TOKENS_STORAGE_KEY = 'theme:tokens'
const EFFECTS_STORAGE_KEY = 'theme:effects'

type ItemVariantValue = { variants?: ItemVariant[] }

function getInitialTheme(): Theme {
  const stored = readStoredString('theme')
  if (stored) return stored
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

function loadStoredTokens(): Record<string, string> | null {
  return readStored(
    TOKENS_STORAGE_KEY,
    (raw) => (raw && typeof raw === 'object' ? (raw as Record<string, string>) : null),
    null,
  )
}

function loadStoredEffects(): EffectLayer[] | null {
  return readStored(
    EFFECTS_STORAGE_KEY,
    (raw) => (Array.isArray(raw) && raw.length ? (raw as EffectLayer[]) : null),
    null,
  )
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(getInitialTheme())
  const activeTokens = ref<Record<string, string> | null>(loadStoredTokens())
  const activeEffects = ref<EffectLayer[] | null>(loadStoredEffects())

  function setActiveEffects(effects: EffectLayer[] | null | undefined) {
    activeEffects.value = effects?.length ? effects : null
    if (activeEffects.value) writeStored(EFFECTS_STORAGE_KEY, activeEffects.value)
    else writeStoredString(EFFECTS_STORAGE_KEY, null)
  }

  const resolvedBase = computed<BuiltinTheme>(() => {
    if (activeTokens.value) return activeTokens.value.base === 'light' ? 'light' : 'dark'
    return theme.value === 'light' ? 'light' : 'dark'
  })

  let transitionTimer: ReturnType<typeof setTimeout> | null = null

  function applyResolvedBase(animated = true) {
    const root = document.documentElement
    if (animated) {
      root.classList.add('theme-transitioning')
      if (transitionTimer) clearTimeout(transitionTimer)
      transitionTimer = setTimeout(() => {
        root.classList.remove('theme-transitioning')
        transitionTimer = null
      }, 220)
    }
    root.setAttribute('data-theme', resolvedBase.value)
  }

  function setTheme(value: Theme) {
    if (activeTokens.value) {
      clearThemeTokens(activeTokens.value)
      activeTokens.value = null
      writeStoredString(TOKENS_STORAGE_KEY, null)
    }
    setActiveEffects(null)
    theme.value = value
  }

  function setThemeFromTokens(
    themeKey: string,
    tokens: Record<string, string>,
    effects?: EffectLayer[],
  ) {
    if (activeTokens.value) clearThemeTokens(activeTokens.value)
    activeTokens.value = tokens
    writeStored(TOKENS_STORAGE_KEY, tokens)
    applyThemeTokens(tokens)
    setActiveEffects(effects)
    theme.value = themeKey
  }

  function previewThemeTokens(
    tokens: Record<string, string> | null,
    effects: EffectLayer[] | null = null,
  ) {
    if (activeTokens.value) clearThemeTokens(activeTokens.value)
    activeTokens.value = tokens
    if (tokens) applyThemeTokens(tokens)
    activeEffects.value = effects?.length ? effects : null
  }

  function toggle() {
    setTheme(resolvedBase.value === 'dark' ? 'light' : 'dark')
  }

  function resetToBuiltin() {
    setTheme(resolvedBase.value)
  }

  watch(theme, (value) => {
    writeStoredString('theme', value)
  }, { immediate: true })

  watch(resolvedBase, (_, prev) => {
    applyResolvedBase(prev !== undefined)
  }, { immediate: true })

  if (activeTokens.value) {
    applyThemeTokens(activeTokens.value)
  }

  const hasBackdrop = computed(() => !!activeTokens.value?.['fx-backdrop'])

  async function syncEquippedTheme(uid: string): Promise<void> {
    const [{ useInventoryStore }, { readThemeValue }, { buildEffectLayers }, { resolveItemVariant }] = await Promise.all([
      import('@/stores/inventory'),
      import('@/utils/cosmetics/readers'),
      import('@/utils/cosmetics/effectLayers'),
      import('@/utils/items'),
    ])
    const inventory = useInventoryStore()
    await inventory.fetchEquipped(uid)

    const slot = inventory.equipped.theme
    if (!slot) {
      resetToBuiltin()
      return
    }
    const themeKey = `item:${slot.item.id}`
    if (theme.value === themeKey) return
    const value = readThemeValue(resolveItemVariant(slot.item.value as ItemVariantValue, slot.variantKey))
    if (!value) return
    setThemeFromTokens(themeKey, value.tokens, buildEffectLayers(slot.modifiers, slot.unusualEffect))
  }

  const authStore = useAuthStore()

  watch(() => authStore.authMe, (me) => {
    if (me) void syncEquippedTheme(me.player.id)
  }, { immediate: true })

  watch(() => authStore.hasPlayerSession, (active) => {
    if (!active) resetToBuiltin()
  })

  return { theme, activeTokens, activeEffects, resolvedBase, hasBackdrop, toggle, setTheme, resetToBuiltin, setThemeFromTokens, previewThemeTokens }
})
