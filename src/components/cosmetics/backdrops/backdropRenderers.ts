import type { ThemeBackdropType } from '@/utils/cosmetics/themeBackdrop'
import { defineAsyncComponent, type Component } from 'vue'

export const BACKDROP_RENDERERS: Record<ThemeBackdropType, Component> = {
  starfield: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/StarfieldBackdrop.vue')),
  pixel_field: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/PixelFieldBackdrop.vue')),
  forest: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/ForestBackdrop.vue')),
  graveyard: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/GraveyardBackdrop.vue')),
  church: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/ChurchBackdrop.vue')),
  mineshaft: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/MineshaftBackdrop.vue')),
  watchers: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/WatchersBackdrop.vue')),
  dark_hour: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/DarkHourBackdrop.vue')),
  harvest: defineAsyncComponent(() => import('@/components/cosmetics/backdrops/HarvestBackdrop.vue')),
}

export const LANDSCAPE_BACKDROPS: ReadonlySet<ThemeBackdropType> = new Set([
  'forest',
  'graveyard',
  'church',
  'mineshaft',
  'dark_hour',
  'harvest',
])
