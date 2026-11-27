import { clamp } from '@/utils/math'
export interface StarfieldBackdropConfig {
  type: 'starfield'
  opacity: number
  starColor: string
  starDensity: number
  shooting: boolean
  shootingMinMs: number
  shootingMaxMs: number
  comets: boolean
  cometMinMs: number
  cometMaxMs: number
  nebulas: boolean
  nebulaCount: number
  nebulaColors: string[]
  nebulaOpacity: number
  nebulaSize: number
}

export interface PixelFieldBackdropConfig {
  type: 'pixel_field'
  opacity: number
  pixelSize: number
  fieldHeightPct: number
  fieldRows: number
  wheatColors: string[]
  skyColors: string[]
  sunColor: string
  leaves: boolean
  leafColors: string[]
  birds: boolean
  birdColor: string
  windSpeed: number
}

export interface ForestBackdropConfig {
  type: 'forest'
  opacity: number
  pixelSize: number
  canopyColors: string[]
  treeColors: string[]
  groundColors: string[]
  pathColor: string
  mushroomColors: string[]
  wisps: boolean
  wispColors: string[]
  fireflies: boolean
  fireflyColor: string
  eyes: boolean
  eyeColors: string[]
  spores: boolean
  bloom: boolean
  driftSpeed: number
}

export interface GraveyardBackdropConfig {
  type: 'graveyard'
  opacity: number
  skyColors: string[]
  groundColor: string
  stoneColor: string
  treeColor: string
  moonColor: string
  fogColor: string
  wispColor: string
  ghostColor: string
  batColor: string
}

export interface ChurchBackdropConfig {
  type: 'church'
  opacity: number
  wallTop: string
  wallBottom: string
  floorColor: string
  pewColor: string
  carpetColor: string
  glassColors: string[]
  candleColor: string
  figureColor: string
  faceColor: string
}

export interface MineshaftBackdropConfig {
  type: 'mineshaft'
  opacity: number
  timberColor: string
  timberDark: string
  railColor: string
  lanternColor: string
  dustColor: string
}

export interface DarkHourBackdropConfig {
  type: 'dark_hour'
  opacity: number
  skyColors: string[]
  moonColor: string
  cloudColor: string
  cityColor: string
  windowColor: string
  waterColor: string
}

export interface HarvestBackdropConfig {
  type: 'harvest'
  opacity: number
  skyColors: string[]
  moonColor: string
  moonShade: string
  flareColor: string
  fieldColor: string
  farmColor: string
  leafColors: string[]
  crowColor: string
  stars: boolean
}

export interface SnowfieldBackdropConfig {
  type: 'snowfield'
  opacity: number
  skyColors: string[]
  snowColor: string
  driftColor: string
  pineColor: string
  cabinColor: string
  roofColor: string
  capColor: string
  lightColor: string
  smokeColor: string
  starColor: string
  flakeColor: string
}

export interface AuroraBackdropConfig {
  type: 'aurora'
  opacity: number
  hues?: string[]
  skyColors: string[]
  colors: string[]
  starColor: string
  ridgeColor: string
}

export interface WatchersBackdropConfig {
  type: 'watchers'
  opacity: number
  count: number
}

export type ThemeBackdropConfig =
  | StarfieldBackdropConfig
  | GraveyardBackdropConfig
  | ChurchBackdropConfig
  | MineshaftBackdropConfig
  | WatchersBackdropConfig
  | DarkHourBackdropConfig
  | HarvestBackdropConfig
  | SnowfieldBackdropConfig
  | AuroraBackdropConfig
  | PixelFieldBackdropConfig
  | ForestBackdropConfig

export type ThemeBackdropType = ThemeBackdropConfig['type']

const HEX_RE = /^#[0-9a-f]{6}$/i

function readNumber(tokens: Record<string, string>, key: string, fallback: number): number {
  const v = parseFloat(tokens[key] ?? '')
  return Number.isFinite(v) ? v : fallback
}

function readFlag(tokens: Record<string, string>, key: string, fallback: boolean): boolean {
  const v = tokens[key]
  if (v === undefined) return fallback
  return v === '1' || v === 'true'
}

function readHex(tokens: Record<string, string>, key: string, fallback: string): string {
  const v = tokens[key]
  return v && HEX_RE.test(v) ? v : fallback
}

function readHexList(tokens: Record<string, string>, key: string, fallback: string[]): string[] {
  const v = tokens[key]
  if (!v) return fallback
  const list = v.split(',').map((s) => s.trim()).filter((s) => HEX_RE.test(s))
  return list.length ? list : fallback
}

function readOpacity(tokens: Record<string, string>): number {
  const v = readNumber(tokens, 'fx-backdrop-opacity', 1)
  return clamp(v, 0.05, 1)
}

function readMs(tokens: Record<string, string>, key: string, fallback: number): number {
  return readNumber(tokens, key, fallback) * 1000
}

function readCount(tokens: Record<string, string>, key: string, fallback: number): number {
  return Math.max(1, Math.round(readNumber(tokens, key, fallback)))
}

type BackdropField<V> = [read: (tokens: Record<string, string>, key: string, fallback: V) => V, key: string, fallback: V]

type BackdropTable<C> = { [K in Exclude<keyof C, 'type' | 'opacity'>]: BackdropField<C[K]> }

function tableParser<C extends ThemeBackdropConfig>(type: C['type'], table: BackdropTable<C>) {
  return (tokens: Record<string, string>): C => {
    const config: Record<string, unknown> = { type, opacity: readOpacity(tokens) }
    for (const field of Object.keys(table) as (keyof typeof table & string)[]) {
      const [read, key, fallback] = table[field]
      config[field] = read(tokens, key, fallback)
    }
    return config as C
  }
}

function parseSnowfield(tokens: Record<string, string>): SnowfieldBackdropConfig {
  return {
    type: 'snowfield',
    opacity: readOpacity(tokens),
    skyColors: readHexList(tokens, 'fx-snow-sky-colors', ['#070b16', '#111a2c']),
    snowColor: readHex(tokens, 'fx-snow-ground-color', '#1b2740'),
    driftColor: readHex(tokens, 'fx-snow-drift-color', '#131c30'),
    pineColor: readHex(tokens, 'fx-snow-pine-color', '#0c1420'),
    cabinColor: readHex(tokens, 'fx-snow-cabin-color', '#0a0f19'),
    roofColor: readHex(tokens, 'fx-snow-roof-color', '#141c2c'),
    capColor: readHex(tokens, 'fx-snow-cap-color', '#3a4a66'),
    lightColor: readHex(tokens, 'fx-snow-light-color', '#f5b556'),
    smokeColor: readHex(tokens, 'fx-snow-smoke-color', '#6c7a94'),
    starColor: readHex(tokens, 'fx-snow-star-color', '#c9d6ee'),
    flakeColor: readHex(tokens, 'fx-snow-flake-color', '#dfe8f5'),
  }
}

function parseAurora(tokens: Record<string, string>): AuroraBackdropConfig {
  return {
    type: 'aurora',
    opacity: readOpacity(tokens),
    skyColors: readHexList(tokens, 'fx-aurora-sky-colors', ['#050b1c', '#0c1c30']),
    colors: readHexList(tokens, 'fx-aurora-colors', ['#3fe0a0', '#39b8d8', '#8a6be0']),
    starColor: readHex(tokens, 'fx-aurora-star-color', '#e8f1ff'),
    ridgeColor: readHex(tokens, 'fx-aurora-ridge-color', '#070e1a'),
  }
}

const BACKDROP_PARSERS: Record<string, (tokens: Record<string, string>) => ThemeBackdropConfig> = {
  starfield: tableParser<StarfieldBackdropConfig>('starfield', {
    starColor: [readHex, 'fx-star-color', '#dbe4ff'],
    starDensity: [readNumber, 'fx-star-density', 1],
    shooting: [readFlag, 'fx-shooting', false],
    shootingMinMs: [readMs, 'fx-shooting-min-s', 2.5],
    shootingMaxMs: [readMs, 'fx-shooting-max-s', 6.5],
    comets: [readFlag, 'fx-comets', false],
    cometMinMs: [readMs, 'fx-comet-min-s', 25],
    cometMaxMs: [readMs, 'fx-comet-max-s', 55],
    nebulas: [readFlag, 'fx-nebulas', false],
    nebulaCount: [readNumber, 'fx-nebula-count', 3],
    nebulaColors: [readHexList, 'fx-nebula-colors', ['#312e81', '#155e75', '#4a1d6e']],
    nebulaOpacity: [readNumber, 'fx-nebula-opacity', 0.08],
    nebulaSize: [readNumber, 'fx-nebula-size', 1],
  }),
  pixel_field: tableParser<PixelFieldBackdropConfig>('pixel_field', {
    pixelSize: [readNumber, 'fx-field-pixel-size', 5],
    fieldHeightPct: [readNumber, 'fx-field-height-pct', 13],
    fieldRows: [readCount, 'fx-field-rows', 3],
    wheatColors: [readHexList, 'fx-field-wheat-colors', ['#d69a24', '#e0a82e', '#c9861d']],
    skyColors: [readHexList, 'fx-field-sky-colors', ['#7d6bb8', '#b56aa8', '#e06a9f', '#e88a52', '#cf8f1f']],
    sunColor: [readHex, 'fx-field-sun-color', '#f5b800'],
    leaves: [readFlag, 'fx-field-leaves', false],
    leafColors: [readHexList, 'fx-field-leaf-colors', ['#e0a82e', '#f472b6', '#d69a24']],
    birds: [readFlag, 'fx-field-birds', false],
    birdColor: [readHex, 'fx-field-bird-color', '#3d1f2e'],
    windSpeed: [readNumber, 'fx-field-wind', 1],
  }),
  forest: tableParser<ForestBackdropConfig>('forest', {
    pixelSize: [readNumber, 'fx-forest-pixel-size', 5],
    canopyColors: [readHexList, 'fx-forest-canopy-colors', ['#04060a', '#050b11', '#071118', '#08171c']],
    treeColors: [readHexList, 'fx-forest-tree-colors', ['#1c2624', '#231710', '#120a06']],
    groundColors: [readHexList, 'fx-forest-ground-colors', ['#081410', '#0a1c16', '#0d231b']],
    pathColor: [readHex, 'fx-forest-path-color', '#1a382b'],
    mushroomColors: [readHexList, 'fx-forest-mushroom-colors', ['#60a5fa', '#5eead4', '#c084fc']],
    wisps: [readFlag, 'fx-forest-wisps', false],
    wispColors: [readHexList, 'fx-forest-wisp-colors', ['#93c5fd', '#a5f3fc', '#ddd6fe']],
    fireflies: [readFlag, 'fx-forest-fireflies', false],
    fireflyColor: [readHex, 'fx-forest-firefly-color', '#d9f99d'],
    eyes: [readFlag, 'fx-forest-eyes', false],
    eyeColors: [readHexList, 'fx-forest-eye-colors', ['#fbbf24', '#5eead4', '#f472b6']],
    spores: [readFlag, 'fx-forest-spores', false],
    bloom: [readFlag, 'fx-forest-bloom', false],
    driftSpeed: [readNumber, 'fx-forest-drift', 1],
  }),
  graveyard: tableParser<GraveyardBackdropConfig>('graveyard', {
    skyColors: [readHexList, 'fx-grave-sky-colors', ['#05070f', '#0d1220']],
    groundColor: [readHex, 'fx-grave-ground-color', '#0a0e18'],
    stoneColor: [readHex, 'fx-grave-stone-color', '#1a2030'],
    treeColor: [readHex, 'fx-grave-tree-color', '#05070c'],
    moonColor: [readHex, 'fx-grave-moon-color', '#d8dce8'],
    fogColor: [readHex, 'fx-grave-fog-color', '#9aa6bf'],
    wispColor: [readHex, 'fx-grave-wisp-color', '#b6e34a'],
    ghostColor: [readHex, 'fx-grave-ghost-color', '#dfe6f5'],
    batColor: [readHex, 'fx-grave-bat-color', '#05070f'],
  }),
  church: tableParser<ChurchBackdropConfig>('church', {
    wallTop: [readHex, 'fx-church-wall-top', '#0a0916'],
    wallBottom: [readHex, 'fx-church-wall-bottom', '#1a1730'],
    floorColor: [readHex, 'fx-church-floor-color', '#13102a'],
    pewColor: [readHex, 'fx-church-pew-color', '#3a2617'],
    carpetColor: [readHex, 'fx-church-carpet-color', '#4a1418'],
    glassColors: [readHexList, 'fx-church-glass-colors', ['#c0392b', '#2e86c1', '#f2b552', '#7cb342', '#8e44ad']],
    candleColor: [readHex, 'fx-church-candle-color', '#f2b552'],
    figureColor: [readHex, 'fx-church-figure-color', '#05040c'],
    faceColor: [readHex, 'fx-church-face-color', '#d9cfc4'],
  }),
  mineshaft: tableParser<MineshaftBackdropConfig>('mineshaft', {
    timberColor: [readHex, 'fx-mine-timber-color', '#4a3420'],
    timberDark: [readHex, 'fx-mine-timber-dark', '#1e160e'],
    railColor: [readHex, 'fx-mine-rail-color', '#4a3a2a'],
    lanternColor: [readHex, 'fx-mine-lantern-color', '#f2b552'],
    dustColor: [readHex, 'fx-mine-dust-color', '#8a7150'],
  }),
  watchers: tableParser<WatchersBackdropConfig>('watchers', {
    count: [readCount, 'fx-watch-count', 10],
  }),
  dark_hour: tableParser<DarkHourBackdropConfig>('dark_hour', {
    skyColors: [readHexList, 'fx-hour-sky-colors', ['#02100a', '#0a2814', '#1a4a20']],
    moonColor: [readHex, 'fx-hour-moon-color', '#c9e88a'],
    cloudColor: [readHex, 'fx-hour-cloud-color', '#05170b'],
    cityColor: [readHex, 'fx-hour-city-color', '#020806'],
    windowColor: [readHex, 'fx-hour-window-color', '#7cb342'],
    waterColor: [readHex, 'fx-hour-water-color', '#3a0a0e'],
  }),
  harvest: tableParser<HarvestBackdropConfig>('harvest', {
    skyColors: [readHexList, 'fx-harvest-sky-colors', ['#b9a4cf', '#d09aa6', '#e8a25a', '#f2c27a']],
    moonColor: [readHex, 'fx-harvest-moon-color', '#e8781e'],
    moonShade: [readHex, 'fx-harvest-moon-shade', '#8a3a10'],
    flareColor: [readHex, 'fx-harvest-flare-color', '#ffe08a'],
    fieldColor: [readHex, 'fx-harvest-field-color', '#2a1a22'],
    farmColor: [readHex, 'fx-harvest-farm-color', '#321f2c'],
    leafColors: [readHexList, 'fx-harvest-leaf-colors', ['#b8531c', '#d9782e', '#7a3a10']],
    crowColor: [readHex, 'fx-harvest-crow-color', '#1a0f18'],
    stars: [readFlag, 'fx-harvest-stars', false],
  }),
  snowfield: parseSnowfield,
  aurora: parseAurora,
}

export function readBackdropConfig(
  tokens: Record<string, string> | null | undefined,
): ThemeBackdropConfig | null {
  if (!tokens) return null
  const parse = BACKDROP_PARSERS[tokens['fx-backdrop'] ?? '']
  return parse ? parse(tokens) : null
}
