import { hashString } from '@/utils/constants'

const ADJECTIVES = [
  'Sleepy',
  'Cozy',
  'Dizzy',
  'Rusty',
  'Crispy',
  'Lazy',
  'Loud',
  'Sneaky',
  'Jolly',
  'Wobbly',
  'Chill',
  'Spicy',
  'Bold',
  'Shy',
  'Sweaty',
  'Tiny',
  'Fancy',
  'Funky',
  'Soggy',
  'Shiny',
  'Speedy',
  'Turbo',
  'Humble',
  'Feral',
]

const TERMS = [
  'Mismap',
  'Overmap',
  'Undermap',
  'Vibro',
  'Lefty',
  'Righty',
  'Triangle',
  'Shrado Angle',
  'Muffn Note',
  'Crossover',
  'Scissor',
  'Croissant',
  'Cucumber',
  'Pickle',
  'Paul',
  'Tangle',
  'Flower',
  'Scoop',
  'Gallop',
  'Handclap',
  'Palmup',
  'Staircase',
  'Tower',
  'Stack',
  'Spiral',
  'Slider',
  'Window',
  'Invert',
  'Flick',
  'Backhand',
]

const POOL = ADJECTIVES.length * TERMS.length

export function voteNicknames(voteIds: string[]): Map<string, string> {
  const taken = new Set<number>()
  const names = new Map<string, string>()
  for (const id of [...voteIds].sort()) {
    let slot = hashString(id) % POOL
    while (taken.has(slot) && taken.size < POOL) slot = (slot + 1) % POOL
    taken.add(slot)
    names.set(id, `${ADJECTIVES[slot % ADJECTIVES.length]} ${TERMS[Math.floor(slot / ADJECTIVES.length)]}`)
  }
  return names
}
