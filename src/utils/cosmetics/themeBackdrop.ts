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
  wisps: boolean
  wispColor: string
  ghosts: boolean
  ghostColor: string
  bats: boolean
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
  dust: boolean
  figure: boolean
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
  dust: boolean
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
  face: boolean
  windmill: boolean
  stars: boolean
}

export interface WatchersBackdropConfig {
  type: 'watchers'
  opacity: number
  count: number
  blink: boolean
}

export type ThemeBackdropConfig =
  | StarfieldBackdropConfig
  | GraveyardBackdropConfig
  | ChurchBackdropConfig
  | MineshaftBackdropConfig
  | WatchersBackdropConfig
  | DarkHourBackdropConfig
  | HarvestBackdropConfig
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
  return Math.min(1, Math.max(0.05, v))
}

function parseStarfield(tokens: Record<string, string>): StarfieldBackdropConfig {
  return {
    type: 'starfield',
    opacity: readOpacity(tokens),
    starColor: readHex(tokens, 'fx-star-color', '#dbe4ff'),
    starDensity: readNumber(tokens, 'fx-star-density', 1),
    shooting: readFlag(tokens, 'fx-shooting', false),
    shootingMinMs: readNumber(tokens, 'fx-shooting-min-s', 2.5) * 1000,
    shootingMaxMs: readNumber(tokens, 'fx-shooting-max-s', 6.5) * 1000,
    comets: readFlag(tokens, 'fx-comets', false),
    cometMinMs: readNumber(tokens, 'fx-comet-min-s', 25) * 1000,
    cometMaxMs: readNumber(tokens, 'fx-comet-max-s', 55) * 1000,
    nebulas: readFlag(tokens, 'fx-nebulas', false),
    nebulaCount: readNumber(tokens, 'fx-nebula-count', 3),
    nebulaColors: readHexList(tokens, 'fx-nebula-colors', ['#312e81', '#155e75', '#4a1d6e']),
    nebulaOpacity: readNumber(tokens, 'fx-nebula-opacity', 0.08),
    nebulaSize: readNumber(tokens, 'fx-nebula-size', 1),
  }
}

function parsePixelField(tokens: Record<string, string>): PixelFieldBackdropConfig {
  return {
    type: 'pixel_field',
    opacity: readOpacity(tokens),
    pixelSize: readNumber(tokens, 'fx-field-pixel-size', 5),
    fieldHeightPct: readNumber(tokens, 'fx-field-height-pct', 13),
    fieldRows: Math.max(1, Math.round(readNumber(tokens, 'fx-field-rows', 3))),
    wheatColors: readHexList(tokens, 'fx-field-wheat-colors', ['#d69a24', '#e0a82e', '#c9861d']),
    skyColors: readHexList(tokens, 'fx-field-sky-colors', ['#7d6bb8', '#b56aa8', '#e06a9f', '#e88a52', '#cf8f1f']),
    sunColor: readHex(tokens, 'fx-field-sun-color', '#f5b800'),
    leaves: readFlag(tokens, 'fx-field-leaves', false),
    leafColors: readHexList(tokens, 'fx-field-leaf-colors', ['#e0a82e', '#f472b6', '#d69a24']),
    birds: readFlag(tokens, 'fx-field-birds', false),
    birdColor: readHex(tokens, 'fx-field-bird-color', '#3d1f2e'),
    windSpeed: readNumber(tokens, 'fx-field-wind', 1),
  }
}

function parseForest(tokens: Record<string, string>): ForestBackdropConfig {
  return {
    type: 'forest',
    opacity: readOpacity(tokens),
    pixelSize: readNumber(tokens, 'fx-forest-pixel-size', 5),
    canopyColors: readHexList(tokens, 'fx-forest-canopy-colors', ['#04060a', '#050b11', '#071118', '#08171c']),
    treeColors: readHexList(tokens, 'fx-forest-tree-colors', ['#1c2624', '#231710', '#120a06']),
    groundColors: readHexList(tokens, 'fx-forest-ground-colors', ['#081410', '#0a1c16', '#0d231b']),
    pathColor: readHex(tokens, 'fx-forest-path-color', '#1a382b'),
    mushroomColors: readHexList(tokens, 'fx-forest-mushroom-colors', ['#60a5fa', '#5eead4', '#c084fc']),
    wisps: readFlag(tokens, 'fx-forest-wisps', false),
    wispColors: readHexList(tokens, 'fx-forest-wisp-colors', ['#93c5fd', '#a5f3fc', '#ddd6fe']),
    fireflies: readFlag(tokens, 'fx-forest-fireflies', false),
    fireflyColor: readHex(tokens, 'fx-forest-firefly-color', '#d9f99d'),
    eyes: readFlag(tokens, 'fx-forest-eyes', false),
    eyeColors: readHexList(tokens, 'fx-forest-eye-colors', ['#fbbf24', '#5eead4', '#f472b6']),
    spores: readFlag(tokens, 'fx-forest-spores', false),
    bloom: readFlag(tokens, 'fx-forest-bloom', false),
    driftSpeed: readNumber(tokens, 'fx-forest-drift', 1),
  }
}

function parseGraveyard(tokens: Record<string, string>): GraveyardBackdropConfig {
  return {
    type: 'graveyard',
    opacity: readOpacity(tokens),
    skyColors: readHexList(tokens, 'fx-grave-sky-colors', ['#05070f', '#0d1220']),
    groundColor: readHex(tokens, 'fx-grave-ground-color', '#0a0e18'),
    stoneColor: readHex(tokens, 'fx-grave-stone-color', '#1a2030'),
    treeColor: readHex(tokens, 'fx-grave-tree-color', '#05070c'),
    moonColor: readHex(tokens, 'fx-grave-moon-color', '#d8dce8'),
    fogColor: readHex(tokens, 'fx-grave-fog-color', '#9aa6bf'),
    wisps: readFlag(tokens, 'fx-grave-wisps', true),
    wispColor: readHex(tokens, 'fx-grave-wisp-color', '#b6e34a'),
    ghosts: readFlag(tokens, 'fx-grave-ghosts', true),
    ghostColor: readHex(tokens, 'fx-grave-ghost-color', '#dfe6f5'),
    bats: readFlag(tokens, 'fx-grave-bats', true),
    batColor: readHex(tokens, 'fx-grave-bat-color', '#05070f'),
  }
}

function parseChurch(tokens: Record<string, string>): ChurchBackdropConfig {
  return {
    type: 'church',
    opacity: readOpacity(tokens),
    wallTop: readHex(tokens, 'fx-church-wall-top', '#0a0916'),
    wallBottom: readHex(tokens, 'fx-church-wall-bottom', '#1a1730'),
    floorColor: readHex(tokens, 'fx-church-floor-color', '#13102a'),
    pewColor: readHex(tokens, 'fx-church-pew-color', '#3a2617'),
    carpetColor: readHex(tokens, 'fx-church-carpet-color', '#4a1418'),
    glassColors: readHexList(tokens, 'fx-church-glass-colors', ['#c0392b', '#2e86c1', '#f2b552', '#7cb342', '#8e44ad']),
    candleColor: readHex(tokens, 'fx-church-candle-color', '#f2b552'),
    dust: readFlag(tokens, 'fx-church-dust', true),
    figure: readFlag(tokens, 'fx-church-figure', true),
    figureColor: readHex(tokens, 'fx-church-figure-color', '#05040c'),
    faceColor: readHex(tokens, 'fx-church-face-color', '#d9cfc4'),
  }
}

function parseMineshaft(tokens: Record<string, string>): MineshaftBackdropConfig {
  return {
    type: 'mineshaft',
    opacity: readOpacity(tokens),
    timberColor: readHex(tokens, 'fx-mine-timber-color', '#4a3420'),
    timberDark: readHex(tokens, 'fx-mine-timber-dark', '#1e160e'),
    railColor: readHex(tokens, 'fx-mine-rail-color', '#4a3a2a'),
    lanternColor: readHex(tokens, 'fx-mine-lantern-color', '#f2b552'),
    dust: readFlag(tokens, 'fx-mine-dust', true),
    dustColor: readHex(tokens, 'fx-mine-dust-color', '#8a7150'),
  }
}

function parseDarkHour(tokens: Record<string, string>): DarkHourBackdropConfig {
  return {
    type: 'dark_hour',
    opacity: readOpacity(tokens),
    skyColors: readHexList(tokens, 'fx-hour-sky-colors', ['#02100a', '#0a2814', '#1a4a20']),
    moonColor: readHex(tokens, 'fx-hour-moon-color', '#c9e88a'),
    cloudColor: readHex(tokens, 'fx-hour-cloud-color', '#05170b'),
    cityColor: readHex(tokens, 'fx-hour-city-color', '#020806'),
    windowColor: readHex(tokens, 'fx-hour-window-color', '#7cb342'),
    waterColor: readHex(tokens, 'fx-hour-water-color', '#3a0a0e'),
  }
}

function parseHarvest(tokens: Record<string, string>): HarvestBackdropConfig {
  return {
    type: 'harvest',
    opacity: readOpacity(tokens),
    skyColors: readHexList(tokens, 'fx-harvest-sky-colors', ['#3b2352', '#8a3f5e', '#d9782e', '#f2b552']),
    moonColor: readHex(tokens, 'fx-harvest-moon-color', '#e8781e'),
    moonShade: readHex(tokens, 'fx-harvest-moon-shade', '#8a3a10'),
    flareColor: readHex(tokens, 'fx-harvest-flare-color', '#ffe08a'),
    fieldColor: readHex(tokens, 'fx-harvest-field-color', '#2a1a22'),
    farmColor: readHex(tokens, 'fx-harvest-farm-color', '#321f2c'),
    leafColors: readHexList(tokens, 'fx-harvest-leaf-colors', ['#b8531c', '#d9782e', '#7a3a10']),
    crowColor: readHex(tokens, 'fx-harvest-crow-color', '#1a0f18'),
    face: readFlag(tokens, 'fx-harvest-face', true),
    windmill: readFlag(tokens, 'fx-harvest-windmill', true),
    stars: readFlag(tokens, 'fx-harvest-stars', false),
  }
}

function parseWatchers(tokens: Record<string, string>): WatchersBackdropConfig {
  return {
    type: 'watchers',
    opacity: readOpacity(tokens),
    count: Math.max(1, Math.round(readNumber(tokens, 'fx-watch-count', 10))),
    blink: readFlag(tokens, 'fx-watch-blink', true),
  }
}

const BACKDROP_PARSERS: Record<string, (tokens: Record<string, string>) => ThemeBackdropConfig> = {
  starfield: parseStarfield,
  pixel_field: parsePixelField,
  forest: parseForest,
  graveyard: parseGraveyard,
  church: parseChurch,
  mineshaft: parseMineshaft,
  watchers: parseWatchers,
  dark_hour: parseDarkHour,
  harvest: parseHarvest,
}

export function readBackdropConfig(
  tokens: Record<string, string> | null | undefined,
): ThemeBackdropConfig | null {
  if (!tokens) return null
  const parse = BACKDROP_PARSERS[tokens['fx-backdrop'] ?? '']
  return parse ? parse(tokens) : null
}
