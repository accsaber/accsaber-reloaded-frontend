export function tokenize(token: string): string {
  return token.replace(/\./g, '-')
}

export const THEMABLE_TOKENS = new Set<string>([
  'bg-base', 'bg-surface', 'bg-elevated', 'bg-overlay',
  'text-primary', 'text-secondary', 'text-tertiary',
  'accent', 'accent-true-acc', 'accent-standard-acc', 'accent-tech-acc',
  'accent-low-mid', 'accent-overall',
  'tint-true-acc', 'tint-standard-acc', 'tint-tech-acc',
  'tint-low-mid', 'tint-overall',
  'success', 'warning', 'error', 'info',
  'diff-easy', 'diff-normal', 'diff-hard', 'diff-expert', 'diff-expert-plus',
  'tier-bronze', 'tier-silver', 'tier-gold', 'tier-platinum',
  'tier-diamond', 'tier-apex',
  'tier-newcomer', 'tier-apprentice', 'tier-adept', 'tier-skilled',
  'tier-expert', 'tier-master', 'tier-grandmaster', 'tier-legend',
  'tier-transcendent', 'tier-mythic', 'tier-ascendant',
  'tier-fabled', 'tier-exalted', 'tier-titanic', 'tier-promethean', 'tier-supreme',
  'role-admin', 'role-developer', 'role-moderator',
  'role-head-ranking', 'role-ranking',
  'chart-grid', 'chart-text',
  'skeleton-base', 'skeleton-highlight',
  'navbar-bg', 'navbar-bg-scrolled', 'navbar-text', 'navbar-text-strong',
])

export function filterThemableTokens(tokens: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(tokens)) {
    const normalized = tokenize(key)
    if (THEMABLE_TOKENS.has(normalized)) {
      out[normalized] = val
    } else if (import.meta.env.DEV && !normalized.startsWith('fx-') && normalized !== 'base') {
      console.warn(`[theme] ignoring non-themable token "${key}"`)
    }
  }
  return out
}

export function applyThemeTokens(tokens: Record<string, string>): void {
  const root = document.documentElement
  for (const [key, val] of Object.entries(filterThemableTokens(tokens))) {
    root.style.setProperty(`--${key}`, val)
  }
}

export function clearThemeTokens(tokens: Record<string, string>): void {
  const root = document.documentElement
  for (const key of Object.keys(tokens)) {
    root.style.removeProperty(`--${tokenize(key)}`)
  }
}
