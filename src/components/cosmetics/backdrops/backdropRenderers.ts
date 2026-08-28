import HarvestBackdrop from '@/components/cosmetics/backdrops/HarvestBackdrop.vue'
import DarkHourBackdrop from '@/components/cosmetics/backdrops/DarkHourBackdrop.vue'
import ChurchBackdrop from '@/components/cosmetics/backdrops/ChurchBackdrop.vue'
import ForestBackdrop from '@/components/cosmetics/backdrops/ForestBackdrop.vue'
import GraveyardBackdrop from '@/components/cosmetics/backdrops/GraveyardBackdrop.vue'
import MineshaftBackdrop from '@/components/cosmetics/backdrops/MineshaftBackdrop.vue'
import WatchersBackdrop from '@/components/cosmetics/backdrops/WatchersBackdrop.vue'
import PixelFieldBackdrop from '@/components/cosmetics/backdrops/PixelFieldBackdrop.vue'
import StarfieldBackdrop from '@/components/cosmetics/backdrops/StarfieldBackdrop.vue'
import type { ThemeBackdropType } from '@/utils/cosmetics/themeBackdrop'
import type { Component } from 'vue'

export const BACKDROP_RENDERERS: Record<ThemeBackdropType, Component> = {
  starfield: StarfieldBackdrop,
  pixel_field: PixelFieldBackdrop,
  forest: ForestBackdrop,
  graveyard: GraveyardBackdrop,
  church: ChurchBackdrop,
  mineshaft: MineshaftBackdrop,
  watchers: WatchersBackdrop,
  dark_hour: DarkHourBackdrop,
  harvest: HarvestBackdrop,
}
