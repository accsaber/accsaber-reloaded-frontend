export const MILESTONE_TIERS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'apex',
] as const

export type MilestoneFrameTier = (typeof MILESTONE_TIERS)[number]

export type MilestoneNodeState = 'locked' | 'available' | 'progress' | 'completed'

export interface MilestoneFrame {
  plate: string
  rimWidth: number
  seams?: string
  studs?: string
  glyphScale: number
  glyphDy?: number
  sizeScale: number
}

const FRAMES: Record<MilestoneFrameTier, MilestoneFrame> = {
  bronze: {
    plate: 'M11 11h78v78H11Z',
    rimWidth: 5,
    glyphScale: 0.56,
    sizeScale: 0.84,
  },
  silver: {
    plate: 'M91 50a41 41 0 1 1-82 0 41 41 0 1 1 82 0',
    rimWidth: 5.5,
    seams: 'M82 50a32 32 0 1 1-64 0 32 32 0 1 1 64 0',
    glyphScale: 0.54,
    sizeScale: 0.92,
  },
  gold: {
    plate: 'M15 10H85V50C85 74 66 87 50 93C34 87 15 74 15 50Z',
    rimWidth: 6,
    seams: 'M24 19H76V50C76 67 62 77 50 83C38 77 24 67 24 50Z',
    glyphScale: 0.52,
    glyphDy: -4,
    sizeScale: 1,
  },
  platinum: {
    plate: 'M50 5 89 27.5V72.5L50 95 11 72.5V27.5Z',
    rimWidth: 6,
    seams: 'M50 15.5 80 33V67L50 84.5 20 67V33Z',
    studs:
      'M23.2 50a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 1 1 6.4 0M83.2 50a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 1 1 6.4 0',
    glyphScale: 0.54,
    sizeScale: 1.1,
  },
  diamond: {
    plate: 'M30 10H70L90 40 50 92 10 40Z',
    rimWidth: 6,
    seams: 'M10 40H90M30 10 38 40 50 92 62 40 70 10',
    glyphScale: 0.44,
    glyphDy: -5,
    sizeScale: 1.22,
  },
  apex: {
    plate:
      'M50 3 63.8 16.7 83.2 16.8 83.3 36.2 97 50 83.3 63.8 83.2 83.2 63.8 83.3 50 97 36.2 83.3 16.8 83.2 16.7 63.8 3 50 16.7 36.2 16.8 16.8 36.2 16.7Z',
    rimWidth: 6,
    seams: 'M80 50a30 30 0 1 1-60 0 30 30 0 1 1 60 0',
    glyphScale: 0.5,
    sizeScale: 1.44,
  },
}

const FALLBACK_TIER: MilestoneFrameTier = 'bronze'

export function resolveFrameTier(raw: string | null | undefined): MilestoneFrameTier {
  if (!raw) return FALLBACK_TIER
  const key = raw.toLowerCase()
  return (MILESTONE_TIERS as readonly string[]).includes(key)
    ? (key as MilestoneFrameTier)
    : FALLBACK_TIER
}

export function frameFor(tier: MilestoneFrameTier): MilestoneFrame {
  return FRAMES[tier]
}

export function frameSymbolId(tier: MilestoneFrameTier): string {
  return `ms-frame-${tier}`
}

export const MILESTONE_FRAME_ENTRIES = MILESTONE_TIERS.map((tier) => ({
  tier,
  id: frameSymbolId(tier),
  frame: FRAMES[tier],
}))

export const MILESTONE_MARK_ENTRIES = [
  {
    key: 'lock',
    d: 'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6.5 10.5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z',
    filled: false,
  },
  {
    key: 'reward',
    d: 'M12 3.6 14.4 9.6 20.4 12 14.4 14.4 12 20.4 9.6 14.4 3.6 12 9.6 9.6Z',
    filled: true,
  },
] as const

type MilestoneMark = (typeof MILESTONE_MARK_ENTRIES)[number]['key']

export function markSymbolId(mark: MilestoneMark): string {
  return `ms-mark-${mark}`
}
