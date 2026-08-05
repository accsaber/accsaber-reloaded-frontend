<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
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
      The snipe page ends in a button that hands you a Beat Saber playlist of the maps you are
      closest to taking off somebody.
      Everything above it is the site working out which maps have earned a place on that list.
    </p>
    <p>
      Here is the real thing, running on live scores. If you are logged in it is your own
      profile against the top player, and you can point it at anybody else instead.
    </p>

    <WikiSnipeBoard
      v-if="sniper && target"
      :sniper-id="sniper.id"
      :sniper-name="sniper.name"
      :target-id="target.id"
      :target-name="target.name"
    />
    <p v-else-if="resolveFailed" class="board-error">
      The live example could not load right now. You will find the real one on any player's
      profile.
    </p>
    <SkeletonLoader v-else variant="card" height="320px" />

    <WikiHeading id="what-it-shows">What lands on the list</WikiHeading>
    <p>
      You open it from any player's profile, from the button sitting next to their ScoreSaber and
      BeatLeader links. From there the site hunts for maps where you both have a score and they
      are ahead of you, and those are the only maps it will ever show. A map they have played and
      you have not cannot appear, because there is nothing to compare yet and nothing to take.
    </p>

    <WikiHeading id="order">How close counts as close</WikiHeading>
    <p>
      The list runs closest first, and closeness is measured in accuracy rather than raw points.
      That distinction does more work than it looks like it does. Two maps can both sit five
      thousand points out of reach while being nowhere near as hard to catch up on, because five
      thousand points is a rounding error on a long map and a serious wall on a short one.
    </p>

    <WikiHeading id="numbers">The three numbers on top</WikiHeading>
    <p>
      Closest Gap is the accuracy you need to find on the single nearest map. Points to Gain adds
      up the raw score you would have to make up across the maps in front of you. AP at Stake is
      what all of it is worth if you took every one of them. All three describe the maps
      currently loaded rather than every snipe available, so they climb as you page through and
      only tell the whole story once you switch the page size to All snipes.
    </p>

    <WikiHeading id="playlist">The playlist</WikiHeading>
    <p>
      The download picks up whatever you have already set, so the category filter and the page
      size both carry into it. Leaving it on All snipes gives you the entire list, which gets
      unwieldy against somebody far ahead of you. Capping it at twenty or fifty gives you the
      closest ones and is usually the version you actually want loaded in the game.
      You can sync the playlist in-game.
    </p>
  </WikiProse>
</template>

<style scoped>
.board-error {
  color: var(--text-secondary);
}
</style>
