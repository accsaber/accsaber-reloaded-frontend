import type { InjectionKey } from 'vue'
import type { WikiEntry, WikiSection } from '@/wiki/types'

export const WIKI_NAVIGATE_KEY: InjectionKey<() => void> = Symbol('wiki-navigate')

export const WIKI_SECTIONS: WikiSection[] = [
  {
    key: 'basics',
    title: 'The Basics',
    accent: 'var(--accent-overall)',
    entries: [
      {
        slug: 'what-is-accsaber',
        title: 'What is AccSaber',
        summary: 'The accuracy niche this whole platform is built on, AP in one picture, and the categories you can compete in.',
        keywords: [
          'accsaber',
          'accuracy',
          'acc',
          'ap',
          'accuracy points',
          'points',
          'rank',
          'ranking',
          'leaderboard',
          'categories',
          'overview',
          'introduction',
          'new player',
          'beginner',
          'start',
          'scoresaber',
          'beatleader',
          'what is',
        ],
        related: ['getting-your-scores-counted', 'accuracy-and-ap', 'categories'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/WhatIsAccsaberPage.vue'),
      },
      {
        slug: 'getting-your-scores-counted',
        title: 'Getting Your Scores Counted',
        summary: 'How a play travels from your headset to the leaderboards, what the plugin adds, and what to check when a score is missing.',
        keywords: [
          'scores',
          'score not counting',
          'score missing',
          'not showing',
          'submit',
          'setup',
          'plugin',
          'beatleader',
          'scoresaber',
          'mod',
          'quest',
          'pc',
          'login',
          'link',
          'discord',
          'profile',
          'banned modifiers',
          'no fail',
          'troubleshooting',
        ],
        related: ['what-is-accsaber', 'accuracy-and-ap', 'modifiers', 'xp-and-levels'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/GettingYourScoresCountedPage.vue'),
      },
    ],
  },
  {
    key: 'scoring',
    title: 'Scoring & Ranking',
    accent: 'var(--accent-standard-acc)',
    entries: [
      {
        slug: 'accuracy-and-ap',
        title: 'Accuracy & AP',
        summary: 'The two ingredients behind every AP number, the curve that connects them, and why the last few percent pay the most.',
        keywords: [
          'ap',
          'accuracy points',
          'accuracy',
          'curve',
          'complexity',
          'ap calculation',
          'calculator',
          'raw ap',
          'weighted ap',
          'how much ap',
          'points',
          'formula',
        ],
        related: ['weighted-ap', 'what-is-accsaber', 'getting-your-scores-counted'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/AccuracyAndApPage.vue'),
      },
      {
        slug: 'weighted-ap',
        title: 'Weighted AP',
        summary: 'Why your best plays carry your total, what happens when a new play lands, and why a 500 AP score can move you by 12 spots.',
        keywords: [
          'weighted ap',
          'weight',
          'weighting',
          'total ap',
          'ap total',
          'why did my ap barely move',
          'ap gain',
          'top plays',
          'decay',
          'position',
          'ap to next',
          'overall total',
          'per category',
        ],
        related: ['accuracy-and-ap', 'categories', 'missions'],
        updated: '2026-08-04',
        loader: () => import('@/wiki/pages/WeightedApPage.vue'),
      },
      {
        slug: 'categories',
        title: 'Categories',
        summary: 'True, Standard and Tech Acc: what each one tests, how they differ, and how Overall crowns the all-rounders.',
        keywords: [
          'categories',
          'category',
          'true acc',
          'standard acc',
          'tech acc',
          'overall',
          'which category',
          'all-rounder',
          'leaderboards',
          'accent colors',
          'difference between standard and tech',
          'fine line',
        ],
        related: ['accuracy-and-ap', 'weighted-ap', 'how-maps-get-ranked'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/CategoriesPage.vue'),
      },
      {
        slug: 'modifiers',
        title: 'Modifiers',
        summary: 'Which modifiers are allowed and which ones void a ranked play.',
        keywords: [
          'modifiers',
          'banned',
          'allowed',
          'no fail',
          'nf',
          'ghost notes',
          'disappearing arrows',
          'faster song',
          'super fast song',
          'slower song',
          'no bombs',
          'no obstacles',
          'small notes',
          'small cubes',
          'pro mode',
          'one life',
          'off platform',
          'multiplier',
          'voided',
          'score not counting',
        ],
        related: ['getting-your-scores-counted', 'accuracy-and-ap'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/ModifiersPage.vue'),
      },
    ],
  },
  {
    key: 'ranked-maps',
    title: 'Ranked Maps',
    accent: 'var(--diff-hard)',
    entries: [
      {
        slug: 'how-maps-get-ranked',
        title: 'How Maps Get Ranked',
        summary: 'From a Discord suggestion through the queue, the vote and the criteria check, all the way to a batch release.',
        keywords: [
          'how do maps get ranked',
          'ranked',
          'queue',
          'qualified',
          'voting',
          'votes',
          'batch',
          'batches',
          'suggest a map',
          'map suggestion',
          'nominate',
          'complexity',
          'reweight',
          'criteria',
          'ranking team',
          'monthly',
          'pipeline',
        ],
        related: ['categories', 'accuracy-and-ap', 'ranking-criteria'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/HowMapsGetRankedPage.vue'),
      },
      {
        slug: 'ranking-criteria',
        title: 'Ranking Criteria',
        summary: 'The standards every map must clear before a vote opens: the universal rules, the numbers, and the pattern rules per category.',
        keywords: [
          'criteria',
          'ranking criteria',
          'standards',
          'requirements',
          'njs',
          'note jump speed',
          'sps',
          'swings per second',
          'dd',
          'double directional',
          'sliders',
          'stacks',
          'towers',
          'windows',
          'wristrolls',
          'triangles',
          'dodge walls',
          'hot start',
          'bombs',
          'note count',
          'mapping',
          'nominate',
        ],
        related: ['how-maps-get-ranked', 'categories'],
        updated: '2026-08-04',
        loader: () => import('@/wiki/pages/RankingCriteriaPage.vue'),
      },
    ],
  },
  {
    key: 'progression',
    title: 'Progression',
    accent: 'var(--tier-platinum)',
    entries: [
      {
        slug: 'xp-and-levels',
        title: 'XP & Levels',
        summary: 'The five ways to earn XP, what a single play pays, and the level ladder with its unlockable items.',
        keywords: [
          'xp',
          'experience',
          'levels',
          'level up',
          'leveling',
          'ladder',
          'tiers',
          'rewards',
          'level rewards',
          'items',
          'unlock',
          'how much xp',
          'xp per play',
          'milestones',
          'missions',
          'set bonus',
          'campaign xp',
        ],
        related: ['missions', 'getting-your-scores-counted', 'accuracy-and-ap'],
        updated: '2026-08-04',
        loader: () => import('@/wiki/pages/XpAndLevelsPage.vue'),
      },
      {
        slug: 'missions',
        title: 'Missions',
        summary: 'Where your daily and weekly missions come from and why the targets are the numbers they are.',
        keywords: [
          'missions',
          'daily',
          'dailies',
          'weekly',
          'weeklies',
          'objectives',
          'reset',
          'rollover',
          'expired',
          'why did i only get one mission',
          'no missions',
          'mission impossible',
          'too hard',
          'too easy',
          'band',
          'easy',
          'medium',
          'hard',
          'extreme',
          'snipe',
          'target',
          'mission xp',
          'streak mission',
          'comeback',
          'reroll',
          'event missions',
        ],
        related: ['xp-and-levels', 'weighted-ap', 'accuracy-and-ap'],
        updated: '2026-08-04',
        loader: () => import('@/wiki/pages/MissionsPage.vue'),
      },
    ],
  },
]

function collectEntries(sections: WikiSection[], acc: WikiEntry[]): WikiEntry[] {
  for (const section of sections) {
    acc.push(...section.entries)
    if (section.subsections) collectEntries(section.subsections, acc)
  }
  return acc
}

export const WIKI_ENTRIES: WikiEntry[] = collectEntries(WIKI_SECTIONS, [])

const entriesBySlug = new Map(WIKI_ENTRIES.map((entry) => [entry.slug, entry]))

export function findWikiEntry(slug: string): WikiEntry | null {
  return entriesBySlug.get(slug) ?? null
}

export function resolveRelated(entry: WikiEntry): WikiEntry[] {
  return entry.related
    .map((slug) => entriesBySlug.get(slug))
    .filter((related): related is WikiEntry => !!related)
}

export function matchesWikiQuery(entry: WikiEntry, query: string): boolean {
  return (
    entry.title.toLowerCase().includes(query) ||
    entry.summary.toLowerCase().includes(query) ||
    entry.keywords.some((keyword) => keyword.includes(query))
  )
}

export function filterWikiSections(sections: WikiSection[], query: string): WikiSection[] {
  if (!query) return sections
  const filtered: WikiSection[] = []
  for (const section of sections) {
    const entries = section.entries.filter((entry) => matchesWikiQuery(entry, query))
    const subsections = section.subsections
      ? filterWikiSections(section.subsections, query)
      : undefined
    if (entries.length || subsections?.length) {
      filtered.push({ ...section, entries, subsections })
    }
  }
  return filtered
}

export function countWikiEntries(section: WikiSection): number {
  const nested = section.subsections?.reduce((sum, sub) => sum + countWikiEntries(sub), 0) ?? 0
  return section.entries.length + nested
}

export function sectionContainsSlug(section: WikiSection, slug: string): boolean {
  if (section.entries.some((entry) => entry.slug === slug)) return true
  return section.subsections?.some((sub) => sectionContainsSlug(sub, slug)) ?? false
}

export interface WikiSectionBadge {
  title: string
  accent: string | null
}

export function wikiSectionBadgeFor(slug: string): WikiSectionBadge | null {
  for (const section of WIKI_SECTIONS) {
    if (sectionContainsSlug(section, slug)) {
      return { title: section.title, accent: section.accent ?? null }
    }
  }
  return null
}

const prefetched = new Set<string>()

export function prefetchWikiEntry(slug: string): void {
  if (prefetched.has(slug)) return
  const entry = entriesBySlug.get(slug)
  if (!entry) return
  prefetched.add(slug)
  void entry.loader()
}
