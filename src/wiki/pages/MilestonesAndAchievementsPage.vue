<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import WikiSetWalkthrough from '@/wiki/components/WikiSetWalkthrough.vue'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const player = ref<{ id: string; name: string; isViewer: boolean } | null>(null)
const resolveFailed = ref(false)

onMounted(async () => {
  if (authStore.isLoggedIn && authStore.userId) {
    player.value = {
      id: authStore.userId,
      name: authStore.userProfile?.name ?? 'You',
      isViewer: true,
    }
    return
  }
  try {
    await categoryStore.fetchCategories()
    const overallId = categoryStore.getCategoryId('overall')
    if (!overallId) {
      resolveFailed.value = true
      return
    }
    const { getLeaderboard } = await import('@/api/leaderboards')
    const page = await getLeaderboard(overallId, { page: 24, size: 1 })
    const example = page.content[0]
    if (!example) {
      resolveFailed.value = true
      return
    }
    player.value = { id: example.userId, name: example.userName, isViewer: false }
  } catch {
    resolveFailed.value = true
  }
})
</script>

<template>
  <WikiProse>
    <p>
      Milestones are the objectives you run into just by playing, like play counts, accuracy
      averages and ranks.
    </p>
    <p>
      Achievements exist for fun. They ask for wacky scores or silly conditions that nobody gets
      by accident while grinding. Pausing on an accuracy map has one. So does submitting two
      scores on the same map in a single day.
    </p>
    <p>
      Both live inside the same sets, both have a tier and both give XP the moment you complete
      them.
    </p>

    <p>
      Here is the real board, running on live data. Pick any set and watch it complete one entry
      at a time, with the set bonus landing once the last one is done. If you are logged in it
      counts your own completions.
    </p>

    <WikiSetWalkthrough
      v-if="player"
      :user-id="player.id"
      :user-name="player.name"
      :is-viewer="player.isViewer"
    />
    <p v-else-if="resolveFailed" class="walkthrough-error">
      The live board could not load right now. You will find all of it on the milestones page.
    </p>
    <SkeletonLoader v-else variant="card" height="420px" />

    <WikiHeading id="tiers">Tiers</WikiHeading>
    <p>
      Everything on the board has a tier that runs from Bronze up through Silver, Gold, Platinum
      and Diamond. The tier tells you roughly how hard it is, and the XP scales with it. Apex
      sits above all of them and is used once per set collection, for the ones that are supposed
      to look impossible.
    </p>

    <WikiHeading id="sets">Sets and the set bonus</WikiHeading>
    <p>
      Every milestone belongs to a set, which is a themed group. Finish all of them and you get
      the set bonus on top of the XP you already collected. It is usually worth more than any
      single entry in the set.
    </p>
    <p>
      You get the bonus once. If a new milestone joins a set you already finished, you keep your
      bonus.
    </p>

    <WikiHeading id="the-map">The map on the milestones page</WikiHeading>
    <p>
      The milestones page opens on one set at a time. The rest sit beside it as cards showing
      how far along you are, and clicking one swaps it into view. Families like General and
      Completionist stay together, roughly easiest to hardest.
    </p>
    <p>
      Inside the open set, every milestone gets its own marker. The icon says what the milestone
      measures, like a play count, a best accuracy or a rank. The frame around it shows the
      tier, and a small colored bar underneath means the milestone only counts scores from one
      category.
    </p>
    <p>
      Lines between markers show which milestones were designed to lead into each other. Nothing
      on that map is locked, and you can complete any milestone at any time in any order.
    </p>

    <WikiHeading id="checking">When they get checked</WikiHeading>
    <p>
      Every score you send in triggers a check, including runs that are worse than your personal
      best. A worse attempt still counts toward anything measured in plays, attempts or streaks.
    </p>
    <p>
      Once something is complete it stays complete. Clearing a milestone for holding 95% average
      accuracy and then dropping back to 94% does not take it away from you.
    </p>

    <WikiHeading id="completion-percentage">The completion percentage</WikiHeading>
    <p>
      Each entry shows the share of players who have completed it, measured against everybody
      who has ever set a score here. Even the easiest ones sit below 100% and the hard ones are
      a fraction of a percent.
    </p>

    <WikiHeading id="bl-badge">The BL badge</WikiHeading>
    <p>
      A few entries have a BL badge. Those depend on details that only reach us when your score
      comes through BeatLeader, either from the mod itself or from the AccSaber plugin passing
      them along. Pauses are the usual example. You cannot get those playing through ScoreSaber
      alone.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      Everything on the board gives XP, and that XP goes into your level the same way score XP
      and mission XP do. Some milestones also give an item for your profile.
    </p>
    <p>
      Anything you have finished can be pinned to your profile the way pinned scores work, with
      three slots to fill and six for supporters.
    </p>
  </WikiProse>
</template>

<style scoped>
.walkthrough-error {
  color: var(--text-secondary);
}
</style>
