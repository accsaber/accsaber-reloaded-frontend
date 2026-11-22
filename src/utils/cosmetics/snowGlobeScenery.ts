import type { SnowGlobeScene } from '@/types/cosmetics/border'
import { city } from '@/utils/cosmetics/snowGlobeCity'
import { elven } from '@/utils/cosmetics/snowGlobeElven'
import type { GlobeScene } from '@/utils/cosmetics/snowGlobeKit'
import { nordic } from '@/utils/cosmetics/snowGlobeNordic'

const SCENES: Record<SnowGlobeScene, () => GlobeScene> = { nordic, city, elven }

export function createGlobeScene(kind: SnowGlobeScene): GlobeScene {
  return SCENES[kind]()
}
