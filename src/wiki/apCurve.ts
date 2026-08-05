const CURVE_SCALE = 61
const CURVE_SHIFT = -18

const CURVE_POINTS: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [0.9349050106584025, 0.1995400780527346],
  [0.9361096414526044, 0.2053726914033911],
  [0.9373168654378441, 0.2112057332052981],
  [0.9385245851320524, 0.2170333579843166],
  [0.9397223493859982, 0.2228095289081693],
  [0.9409324581850277, 0.2286461774619347],
  [0.9421364984358537, 0.2344589535514457],
  [0.9433408588769010, 0.2402832027223785],
  [0.9445528451823000, 0.2461590540114391],
  [0.9457521950057954, 0.2519929536323373],
  [0.9469652757511278, 0.2579181890854542],
  [0.9481613689691947, 0.2637897134830433],
  [0.9493682127874609, 0.2697488203344885],
  [0.9505744372202971, 0.2757454294108473],
  [0.9517783524884541, 0.2817769019690621],
  [0.9529892330175649, 0.2878962698161590],
  [0.9541947185853665, 0.2940478274623703],
  [0.9554044516127758, 0.3002878186971881],
  [0.9566054381494079, 0.3065563770511072],
  [0.9578076986986650, 0.3129131797734578],
  [0.9590221672423604, 0.3194262585871035],
  [0.9602231628864696, 0.3259672058569638],
  [0.9614339985634710, 0.3326729095043305],
  [0.9626279572859802, 0.3394055069640740],
  [0.9638423428271630, 0.3463882776436415],
  [0.9650501030404470, 0.3534815900715788],
  [0.9662496093570300, 0.3606879994900724],
  [0.9674529869368587, 0.3680959084197356],
  [0.9686591348667645, 0.3757183982279203],
  [0.9698668993297000, 0.3835699059837689],
  [0.9710750806787853, 0.3916664197351599],
  [0.9722824425660789, 0.4000257103100814],
  [0.9734877233230004, 0.4086676081620450],
  [0.9746896497445529, 0.4176143361918557],
  [0.9759017934808459, 0.4270083485660384],
  [0.9771082808681040, 0.4367729548697090],
  [0.9783078742661878, 0.4469421675377316],
  [0.9795145289674262, 0.4576932612610576],
  [0.9807121922419519, 0.4689499882135975],
  [0.9819304015430030, 0.4810807109121709],
  [0.9831227248036967, 0.4937134311802671],
  [0.9843344315883069, 0.5074369975183908],
  [0.9855345565106794, 0.5220472890164811],
  [0.9867538435462135, 0.5381018792987169],
  [0.9879462160499057, 0.5551918317559756],
  [0.9891587675835430, 0.5742496799950565],
  [0.9903616429313051, 0.5951727896238259],
  [0.9915723216173138, 0.6187204908473445],
  [0.9927779343719173, 0.6452713618738384],
  [0.9939826353978779, 0.6757582832177143],
  [0.9951928260723995, 0.7116318568448161],
  [0.9963839136271500, 0.7539893920553304],
  [0.9975978174482817, 0.8078649708462118],
  [0.9988016676122579, 0.8810362590039038],
  [0.9997988680153226, 1.0],
  [1.0, 1.0],
]

function interpolatePoints(
  points: readonly (readonly [number, number])[],
  x: number,
): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
    }
  }
  return points[points.length - 1][1]
}

export function normalizedAp(accuracy: number): number {
  return interpolatePoints(CURVE_POINTS, accuracy)
}

export function rawAp(accuracy: number, complexity: number): number {
  return normalizedAp(accuracy) * (complexity - CURVE_SHIFT) * CURVE_SCALE
}

export const COMPLEXITY_MIN = 0
export const COMPLEXITY_MAX = 14

const WEIGHT_K = 0.4
const WEIGHT_Y1 = 0.1
const WEIGHT_X1 = 15
const WEIGHT_X0 =
  -Math.log((1 - WEIGHT_Y1) / (WEIGHT_Y1 * Math.exp(WEIGHT_K * WEIGHT_X1) - 1)) / WEIGHT_K

export function positionWeight(position: number): number {
  return (
    (1 + Math.exp(-WEIGHT_K * WEIGHT_X0)) / (1 + Math.exp(WEIGHT_K * (position - WEIGHT_X0)))
  )
}

export function weightedTotal(sortedRawApsDesc: number[]): number {
  return sortedRawApsDesc.reduce((sum, ap, index) => sum + ap * positionWeight(index), 0)
}

const XP_CURVE_POINTS: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [0.1, 0.001],
  [0.2, 0.003],
  [0.3, 0.006],
  [0.4, 0.01],
  [0.5, 0.018],
  [0.55, 0.025],
  [0.6, 0.032],
  [0.65, 0.042],
  [0.7, 0.055],
  [0.75, 0.072],
  [0.78, 0.088],
  [0.8, 0.1],
  [0.82, 0.115],
  [0.84, 0.133],
  [0.86, 0.155],
  [0.88, 0.18],
  [0.9, 0.18],
  [0.91, 0.21],
  [0.92, 0.245],
  [0.93, 0.285],
  [0.94, 0.33],
  [0.95, 0.38],
  [0.96, 0.44],
  [0.965, 0.48],
  [0.97, 0.52],
  [0.975, 0.57],
  [0.98, 0.62],
  [0.985, 0.68],
  [0.99, 0.75],
  [0.993, 0.81],
  [0.995, 0.86],
  [0.997, 0.92],
  [0.999, 0.97],
  [1.0, 1.0],
]

export const XP_BASE_PER_SCORE = 25
const XP_MAX_BONUS = 900
const XP_REFERENCE_COMPLEXITY = 10
const XP_IMPROVEMENT_MULTIPLIER = 1.5
export const XP_MIN_COMPLEXITY = 4.5

export function scoreXpBonus(accuracy: number, complexity: number): number {
  const clamped = Math.max(complexity, XP_MIN_COMPLEXITY)
  return (
    interpolatePoints(XP_CURVE_POINTS, accuracy) *
    XP_MAX_BONUS *
    Math.cbrt(clamped / XP_REFERENCE_COMPLEXITY)
  )
}

export function scoreXp(accuracy: number, complexity: number): number {
  return XP_BASE_PER_SCORE + scoreXpBonus(accuracy, complexity)
}

export function improvementXp(
  newAccuracy: number,
  oldAccuracy: number,
  complexity: number,
): number {
  const gained = Math.max(
    scoreXpBonus(newAccuracy, complexity) - scoreXpBonus(oldAccuracy, complexity),
    0,
  )
  return XP_BASE_PER_SCORE + gained * XP_IMPROVEMENT_MULTIPLIER
}

const LEVEL_CURVE_BASE = 52
const LEVEL_CURVE_EXPONENT = 1.2

export function xpForLevel(level: number): number {
  if (level <= 0) return 0
  const effective = Math.min(level, 100)
  return Math.floor(LEVEL_CURVE_BASE * Math.pow(effective, LEVEL_CURVE_EXPONENT))
}
