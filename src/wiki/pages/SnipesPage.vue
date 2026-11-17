<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import WikiCompareTable, { type WikiCompareRow } from '@/wiki/components/WikiCompareTable.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import WikiSnipeBoard from '@/wiki/components/WikiSnipeBoard.vue'
import { onMounted, ref } from 'vue'

interface Player {
  id: string
  name: string
}

const SORT_COLUMNS = ['What goes to the top']

const SORT_ROWS: WikiCompareRow[] = [
  { label: 'Closest gap', values: ['your nearest miss'] },
  { label: 'Most AP to gain', values: ['the biggest AP difference'] },
  { label: 'Their AP', values: ['their best scores'] },
  { label: 'Your AP', values: ['your best scores'] },
  { label: 'Leaderboard gap', values: ['the widest rank gap'] },
]

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const sniper = ref<Player | null>(null)
const target = ref<Player | null>(null)
const resolveFailed = ref(false)

async function resolveSniper(overallId: string): Promise<Player | null> {
  if (authStore.isLoggedIn && authStore.userId) {
    return { id: authStore.userId, name: authStore.userProfile?.name ?? 'You' }
  }
  const { getLeaderboard } = await import('@/api/leaderboards')
  const page = await getLeaderboard(overallId, { page: 24, size: 1 })
  const example = page.content[0]
  return example ? { id: example.userId, name: example.userName } : null
}

onMounted(async () => {
  try {
    await categoryStore.fetchCategories()
    const overallId = categoryStore.getCategoryId('overall')
    if (!overallId) {
      resolveFailed.value = true
      return
    }
    const { getLeaderboard } = await import('@/api/leaderboards')
    const [mine, top] = await Promise.all([
      resolveSniper(overallId),
      getLeaderboard(overallId, { page: 0, size: 2 }),
    ])
    const best = top.content.find((entry) => entry.userId !== mine?.id) ?? top.content[0]
    if (!mine || !best) {
      resolveFailed.value = true
      return
    }
    sniper.value = mine
    target.value = { id: best.userId, name: best.userName }
  } catch {
    resolveFailed.value = true
  }
})
</script>

<template>
  <WikiProse>
    <p>
      The snipe page gives you a Beat Saber playlist of the maps where you're closest to beating
      somebody.
    </p>
    <p>
      Here's a preview using live scores. If you're logged in it's your own profile against the top
      player and you can point it at anybody else instead.
    </p>

    <WikiSnipeBoard
      v-if="sniper && target"
      :sniper-id="sniper.id"
      :sniper-name="sniper.name"
      :target-id="target.id"
      :target-name="target.name"
    />
    <p v-else-if="resolveFailed" class="board-error">
      The live example couldn't load right now. You can find the real one on any player's profile.
    </p>
    <SkeletonLoader v-else variant="card" height="320px" />

    <WikiHeading id="what-it-shows">Which maps make the list</WikiHeading>
    <p>
      You open it from any player's profile with the button next to their ScoreSaber and BeatLeader
      links. The site looks for maps where you both have a score and they're ahead of you.
    </p>

    <WikiHeading id="order">How close counts as close</WikiHeading>
    <p>
      By default the list starts with the closest ones. It measures closeness in accuracy instead of
      raw points because 5,000 points is nothing on a long map and a lot on a short one.
    </p>

    <WikiHeading id="sorting">Sorting the list</WikiHeading>
    <p>
      Closest first is the right order for beating somebody's score. It's a bad one for planning
      where your next AP comes from because the map where you're 0.02% away can be worth almost
      nothing. The sort dropdown has five orders and the arrow next to it reverses any of them.
    </p>

    <WikiCompareTable :columns="SORT_COLUMNS" :rows="SORT_ROWS" />

    <p>
      Most AP to gain is the one to use when you're chasing your own total. Leaderboard gap shows
      where they're furthest ahead of you on the map's leaderboard. A handful of old scores have no
      rank stored and those go to the bottom whichever way you sort. The sort is saved in the
      address bar so you can share the link with the exact view you were looking at.
    </p>

    <WikiHeading id="playlist">The playlist</WikiHeading>
    <p>
      The filters and sort are all kept in the file. A playlist you built on Most AP to gain shows
      up in the game in that order and keeps it when Beat Saber resyncs. All snipes gives you the
      entire list which gets long against somebody far ahead of you. Capping it at 20 or 50 gives
      you the top of whatever order you picked. You can sync the playlist in-game.
    </p>
  </WikiProse>
</template>

<style scoped>
.board-error {
  color: var(--text-secondary);
}
</style>
