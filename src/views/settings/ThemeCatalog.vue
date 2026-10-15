<script setup lang="ts">
import { equipItem, getItems, getUserItems } from '@/api/items'
import ThemeBackdropPreview from '@/components/cosmetics/backdrops/ThemeBackdropPreview.vue'
import { useAuthStore } from '@/stores/auth'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useThemeStore } from '@/stores/theme'
import type { ItemResponse, UserItemResponse } from '@/types/api/items'
import { buildEffectLayers } from '@/utils/cosmetics/effectLayers'
import { filterThemableTokens } from '@/utils/themeTokens'
import { readItemVariants, resolveItemVariant } from '@/utils/items'
import { readThemeValue } from '@/utils/cosmetics/readers'
import { computed, onMounted, ref, watch } from 'vue'

interface ThemeOption {
  key: string
  label: string | null
  tokens: Record<string, string> | null
  variantKey: string | null
}

interface ThemeCard {
  id: string
  themeKey: string
  name: string
  hint: string
  builtin: boolean
  owned: boolean
  options: ThemeOption[]
}

const authStore = useAuthStore()
const themeStore = useThemeStore()
const itemTypeStore = useItemTypeStore()

const BUILTIN_PREVIEW_TOKENS: Record<string, Record<string, string>> = {
  dark: { 'bg-base': '#08080d', 'bg-surface': '#11111c', 'bg-elevated': '#1a1929', 'accent': '#f5b800' },
  light: { 'bg-base': '#f3f2f7', 'bg-surface': '#fdfcff', 'bg-elevated': '#ebe9f1', 'accent': '#f5b800' },
}

const BUILTIN_THEMES: ThemeCard[] = ['Dark', 'Light'].map((name) => ({
  id: `builtin-${name.toLowerCase()}`,
  themeKey: name.toLowerCase(),
  name,
  hint: 'Default theme',
  builtin: true,
  owned: true,
  options: [{ key: 'default', label: null, tokens: BUILTIN_PREVIEW_TOKENS[name.toLowerCase()], variantKey: null }],
}))

const themeCatalog = ref<ItemResponse[]>([])
const ownedThemes = ref<UserItemResponse[]>([])
const themeBusy = ref<string | null>(null)

const ownedThemeByItemId = computed(() => new Map(ownedThemes.value.map((u) => [u.item.id, u])))
const activeTokensJson = computed(() => JSON.stringify(themeStore.activeTokens))

function modeLabel(tokens: Record<string, string>): string {
  return tokens.base === 'light' ? 'Light' : 'Dark'
}

function itemOptions(i: ItemResponse): ThemeOption[] {
  const variants = readItemVariants(i.value)
  if (variants) {
    return variants.map((v) => ({
      key: v.key,
      label: v.label,
      tokens: readThemeValue(resolveItemVariant(i.value as { variants?: typeof variants }, v.key))?.tokens ?? null,
      variantKey: v.key,
    }))
  }
  const theme = readThemeValue(i.value)
  if (!theme?.tokens) return []
  const modes = theme.altTokens ? [theme.tokens, theme.altTokens] : [theme.tokens]
  return modes.map((tokens, n) => ({
    key: String(n),
    label: modes.length > 1 ? modeLabel(tokens) : null,
    tokens,
    variantKey: null,
  }))
}

function itemCard(i: ItemResponse): ThemeCard {
  const owned = ownedThemeByItemId.value.has(i.id)
  return {
    id: i.id,
    themeKey: `item:${i.id}`,
    name: i.name,
    hint: owned ? i.description ?? 'Owned' : i.requirement ?? i.description ?? 'Locked theme.',
    builtin: false,
    owned,
    options: itemOptions(i).filter((o) => o.tokens != null),
  }
}

const themeCards = computed<ThemeCard[]>(() => {
  const cards = themeCatalog.value.filter((i) => i.active && !i.deprecated).map(itemCard).filter((c) => c.options.length > 0)
  const builtinNames = new Set(BUILTIN_THEMES.map((b) => b.name.toLowerCase()))
  const builtins = BUILTIN_THEMES.map((b) => cards.find((c) => c.owned && c.name.toLowerCase() === b.name.toLowerCase()) ?? b)
  return [...builtins, ...cards.filter((c) => !builtinNames.has(c.name.toLowerCase()))]
})

function previewVars(tokens: Record<string, string> | null): Record<string, string> {
  const t = tokens ? filterThemableTokens(tokens) : {}
  const out: Record<string, string> = {}
  if (t['bg-base']) out['--preview-base'] = t['bg-base']
  if (t['bg-surface']) out['--preview-surface'] = t['bg-surface']
  if (t['bg-elevated']) out['--preview-elevated'] = t['bg-elevated']
  const accent = t['accent'] ?? t['accent-overall']
  if (accent) out['--preview-accent'] = accent
  return out
}

function isActive(card: ThemeCard, option: ThemeOption): boolean {
  if (themeStore.theme !== card.themeKey) return false
  return card.options.length === 1 || activeTokensJson.value === JSON.stringify(option.tokens)
}

async function loadThemes() {
  await itemTypeStore.fetchItemTypes()
  const themeTypeId = itemTypeStore.byKey.get('theme')?.id
  const [catalog, owned] = await Promise.all([
    themeTypeId ? getItems({ typeId: themeTypeId }).catch(() => []) : [],
    authStore.userId ? getUserItems(authStore.userId, { typeKey: 'theme' }).catch(() => []) : [],
  ])
  themeCatalog.value = catalog
  ownedThemes.value = owned
}

async function pickTheme(card: ThemeCard, option: ThemeOption) {
  if (!card.owned || themeBusy.value) return
  themeBusy.value = card.id
  try {
    if (card.builtin) {
      themeStore.setTheme(card.themeKey)
      return
    }
    const owned = ownedThemeByItemId.value.get(card.id)
    if (!owned || !option.tokens) return
    await equipItem(option.variantKey ? { linkId: owned.linkId, variantKey: option.variantKey } : { linkId: owned.linkId })
    themeStore.setThemeFromTokens(card.themeKey, option.tokens, buildEffectLayers(owned.modifiers, owned.unusualEffect))
  } catch {
  } finally {
    themeBusy.value = null
  }
}

onMounted(loadThemes)
watch(() => authStore.userId, loadThemes)
</script>

<template>
  <div class="theme-grid" role="radiogroup" aria-label="Theme">
    <div v-for="card in themeCards" :key="card.id" class="theme-card" :class="{
      'theme-card--active': card.options.some((o) => isActive(card, o)),
      'theme-card--locked': !card.owned,
      'theme-card--multi': card.options.length > 1,
      'theme-card--wide': card.options.length > 2,
    }" :title="!card.owned ? card.hint : undefined">
      <button v-for="option in card.options" :key="option.key" type="button" class="theme-card__option"
        :class="{ 'theme-card__option--active': card.options.length > 1 && isActive(card, option) }" role="radio"
        :aria-checked="isActive(card, option)" :aria-label="option.label ? `${card.name} ${option.label}` : card.name"
        :disabled="!card.owned || themeBusy === card.id" @click="pickTheme(card, option)">
        <span class="theme-card__preview" :style="previewVars(option.tokens)">
          <ThemeBackdropPreview v-if="!card.builtin" :tokens="option.tokens" />
          <span class="theme-card__swatch theme-card__swatch--bg" />
          <span class="theme-card__swatch theme-card__swatch--surface" />
          <span class="theme-card__swatch theme-card__swatch--accent" />
        </span>
        <span v-if="card.options.length > 1" class="theme-card__option-label">{{ option.label }}</span>
      </button>
      <div class="theme-card__body">
        <span class="theme-card__name">{{ card.name }}</span>
        <span class="theme-card__hint">{{ card.hint }}</span>
      </div>
      <span v-if="card.options.some((o) => isActive(card, o))" class="theme-card__active-tag">Active</span>
      <span v-else-if="!card.owned" class="theme-card__lock-tag" aria-label="Locked">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
    </div>
  </div>
</template>

<style scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-sm);
}

.theme-card {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  transition: border-color 120ms ease, background-color 120ms ease;
}

.theme-card:hover:not(.theme-card--locked) {
  border-color: var(--text-tertiary);
}

.theme-card--active {
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 6%, var(--bg-base));
}

.theme-card--locked {
  opacity: 0.55;
}

.theme-card--multi .theme-card__body {
  order: -1;
  flex-basis: 100%;
  padding-right: var(--space-xl);
}

.theme-card--wide {
  grid-column: span 2;
}

.theme-card__option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
}

.theme-card:not(.theme-card--multi) .theme-card__option::after {
  content: '';
  position: absolute;
  inset: 0;
}

.theme-card__option:disabled {
  cursor: not-allowed;
}

.theme-card--multi .theme-card__option {
  padding: var(--space-xs);
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
}

.theme-card--multi .theme-card__option:hover:not(:disabled) {
  background: var(--bg-elevated);
}

.theme-card__option--active {
  border-color: var(--page-accent) !important;
  color: var(--page-accent);
}

.theme-card__preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 56px;
  height: 40px;
  flex-shrink: 0;
  padding: var(--space-xs);
  border-radius: var(--radius-btn);
  border: 1px solid color-mix(in srgb, var(--preview-surface, var(--bg-overlay)) 60%, transparent);
  background: var(--preview-base, var(--bg-base));
  overflow: hidden;
}

.theme-card__swatch {
  position: relative;
  z-index: 1;
  display: block;
  height: 6px;
  border-radius: var(--radius-xs);
}

.theme-card__swatch--bg { background: var(--preview-surface, var(--bg-elevated)); }
.theme-card__swatch--surface { background: var(--preview-elevated, var(--bg-overlay)); width: 70%; }
.theme-card__swatch--accent { background: var(--preview-accent, var(--page-accent)); width: 40%; }

.theme-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.theme-card__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.theme-card__hint {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.4;
}

.theme-card__active-tag {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--page-accent);
}

.theme-card__lock-tag {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  display: inline-flex;
  color: var(--text-tertiary);
}

@media (max-width: 520px) {
  .theme-card--wide {
    grid-column: auto;
  }
}
</style>
