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
        related: ['what-is-accsaber', 'accuracy-and-ap', 'modifiers', 'score-history'],
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
        related: ['weighted-ap', 'what-is-accsaber', 'score-history', 'complexity-and-reweights'],
        updated: '2026-08-12',
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
        related: ['accuracy-and-ap', 'leaderboards', 'score-history', 'missions'],
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
        related: ['accuracy-and-ap', 'weighted-ap', 'leaderboards'],
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
        related: ['getting-your-scores-counted', 'accuracy-and-ap', 'score-history'],
        updated: '2026-08-03',
        loader: () => import('@/wiki/pages/ModifiersPage.vue'),
      },
      {
        slug: 'leaderboards',
        title: 'Leaderboards',
        summary: 'How your global and country ranks are worked out, what every board and filter shows, and what inactivity does to your place.',
        keywords: [
          'leaderboard',
          'leaderboards',
          'rank',
          'ranking',
          'global rank',
          'country rank',
          'why did my rank drop',
          'rank changed',
          'rank arrow',
          'movement',
          'tie',
          'same ap',
          'xp leaderboard',
          'level leaderboard',
          'inactive',
          'inactivity',
          'came back',
          'rivals',
          'followers',
          'country filter',
          'search player',
          'banned',
          'missing ranks',
          'gaps in ranks',
        ],
        related: ['weighted-ap', 'categories', 'score-history', 'snipes'],
        updated: '2026-08-05',
        loader: () => import('@/wiki/pages/LeaderboardsPage.vue'),
      },
      {
        slug: 'score-history',
        title: 'Score History & Rewards',
        summary: 'Which play on a map actually counts, everything a run still pays you when it loses, and why the numbers on a score you set months ago can change.',
        keywords: [
          'score history',
          'history',
          'rewards',
          'what do i get',
          'what does a score give me',
          'payout',
          'previous scores',
          'old scores',
          'pb',
          'personal best',
          'worse score',
          'did i lose my pb',
          'overwrite',
          'replaced',
          'why did my ap change',
          'ap changed',
          'why did my xp change',
          'less xp',
          'xp second time',
          'first clear',
          'improvement',
          'quit early',
          'partial',
          'failed run',
          'restart',
          'incomplete',
          'attempt',
          'reweighted',
          'xp recomputed',
          'merged account',
          'rank when set',
          'set as',
          'duplicate score',
          'plugin',
          'no attempts',
          'no history',
          'missing attempts',
        ],
        related: ['weighted-ap', 'xp-and-levels', 'accuracy-and-ap', 'snipes', 'milestones-and-achievements', 'complexity-and-reweights'],
        updated: '2026-08-12',
        loader: () => import('@/wiki/pages/ScoreHistoryPage.vue'),
      },
      {
        slug: 'snipes',
        title: 'Snipes',
        summary: 'The tool that finds the maps you are closest to taking off another player, and hands you the playlist.',
        keywords: [
          'snipe',
          'snipes',
          'sniping',
          'snipe playlist',
          'playlist',
          'download playlist',
          'closest scores',
          'gap',
          'closest gap',
          'points to gain',
          'ap at stake',
          'beat a player',
          'catch up',
          'rival',
          'target',
          'compare scores',
          'versus',
          'head to head',
          'all snipes',
          'sort snipes',
          'snipe sort',
          'most ap to gain',
          'ap to gain',
          'leaderboard gap',
          'rank gap',
          'biggest gap',
        ],
        related: ['leaderboards', 'score-history', 'weighted-ap'],
        updated: '2026-09-01',
        loader: () => import('@/wiki/pages/SnipesPage.vue'),
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
        related: ['categories', 'accuracy-and-ap', 'ranking-criteria', 'complexity-and-reweights'],
        updated: '2026-08-12',
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
        related: ['how-maps-get-ranked', 'categories', 'complexity-and-reweights'],
        updated: '2026-08-12',
        loader: () => import('@/wiki/pages/RankingCriteriaPage.vue'),
      },
      {
        slug: 'complexity-and-reweights',
        title: 'Complexity & Reweights',
        summary: 'What the complexity number means, how much of your AP it actually decides, and what changes when a map gets reweighted.',
        keywords: [
          'complexity',
          'complex',
          'reweight',
          'reweights',
          'reweighted',
          'buff',
          'nerf',
          'buffed',
          'nerfed',
          'why did my ap drop',
          'ap went down',
          'lost ap',
          'rank dropped',
          'map got easier',
          'map got harder',
          'complexity history',
          'complexity changed',
          'why is this map worth more',
          'star rating',
          'difficulty rating',
          'how much is a map worth',
          'recalculation',
          'recalculated',
          'rebalance',
          'balance',
          'global reweight',
          'batch reweight',
        ],
        related: ['accuracy-and-ap', 'how-maps-get-ranked', 'score-history'],
        updated: '2026-08-12',
        loader: () => import('@/wiki/pages/ComplexityAndReweightsPage.vue'),
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
        related: ['missions', 'score-history', 'leaderboards', 'milestones-and-achievements'],
        updated: '2026-08-12',
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
          'personal best',
          'first time on a map',
          'starting point',
          'anchor',
          'reroll',
          'event missions',
          'complexity',
          'why is my target so high',
          'map too hard',
        ],
        related: ['xp-and-levels', 'weighted-ap', 'score-history', 'milestones-and-achievements'],
        updated: '2026-08-12',
        loader: () => import('@/wiki/pages/MissionsPage.vue'),
      },
      {
        slug: 'milestones-and-achievements',
        title: 'Milestones & Achievements',
        summary: 'What separates the two, their payout and why the completion percentages look so small.',
        keywords: [
          'milestones',
          'milestone',
          'achievements',
          'achievement',
          'difference',
          'sets',
          'milestone sets',
          'set bonus',
          'bonus xp',
          'completionist',
          'general',
          'tier',
          'tiers',
          'bronze',
          'silver',
          'gold',
          'platinum',
          'diamond',
          'apex',
          'crown',
          'completion',
          'completion percentage',
          'how many players completed',
          'rarest',
          'rarity',
          'locked',
          'prerequisites',
          'what order',
          'do i need to complete',
          'bl badge',
          'beatleader only',
          'item reward',
          'progress stuck',
          'why is it not complete',
          'permanent',
          'lost a milestone',
          'pin',
          'pinned milestones',
          'pin to profile',
          'showcase',
          'icon',
          'what does the icon mean',
          'marker',
          'set card',
          'open a set',
          'the map',
        ],
        related: ['xp-and-levels', 'missions', 'score-history'],
        updated: '2026-08-31',
        loader: () => import('@/wiki/pages/MilestonesAndAchievementsPage.vue'),
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
