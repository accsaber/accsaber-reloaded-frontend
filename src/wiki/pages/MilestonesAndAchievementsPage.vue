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
      Milestones are the objectives you get just by playing, like play counts, accuracy averages and
      ranks.
    </p>
    <p>
      Achievements exist for fun. They ask for wacky scores or silly conditions that nobody gets by
      accident while grinding. Pausing on an accuracy map has one and so does submitting two scores
      on the same map in a single day.
    </p>
    <p>
      Both are in the same sets, both have a tier and both give XP the moment you complete them.
    </p>

    <p>
      Here's the real board with live data. Pick any set and watch it complete one entry at a time
      until the set bonus comes in after the last one. If you're logged in it counts your own
      completions.
    </p>

    <WikiSetWalkthrough
      v-if="player"
      :user-id="player.id"
      :user-name="player.name"
      :is-viewer="player.isViewer"
    />
    <p v-else-if="resolveFailed" class="walkthrough-error">
      The live board couldn't load right now. You can find all of it on the milestones page.
    </p>
    <SkeletonLoader v-else variant="card" height="420px" />

    <WikiHeading id="tiers">Tiers</WikiHeading>
    <p>
      Everything on the board has a tier from Bronze up through Silver, Gold, Platinum and Diamond.
      The tier tells you roughly how hard it is and the XP scales with it. Apex is above all of them
      and it's used once per set collection for the ones that are supposed to look impossible.
    </p>

    <WikiHeading id="sets">Sets and the set bonus</WikiHeading>
    <p>
      Every milestone belongs to a set which is a themed group. Finish all of them and you get the
      set bonus on top of the XP you already got. It's usually worth more than any single entry in
      the set.
    </p>
    <p>
      You get the bonus once. If a new milestone gets added to a set you already finished you keep
      your bonus.
    </p>

    <WikiHeading id="the-map">The map on the milestones page</WikiHeading>
    <p>
      The milestones page shows one set at a time and the rest are next to it as cards showing how
      far along you are. Clicking one opens it. Families like General and Completionist stay
      together and go roughly from easiest to hardest.
    </p>
    <p>
      Inside the open set every milestone gets its own marker. The icon says what the milestone
      measures, like a play count, a best accuracy or a rank. The frame around it shows the tier and
      a small colored bar underneath means the milestone only counts scores from one category.
    </p>
    <p>
      Lines between markers show which milestones were designed to lead into each other. Nothing on
      that map is locked so you can complete any milestone at any time in any order.
    </p>

    <WikiHeading id="checking">When they get checked</WikiHeading>
    <p>
      Every score you send in triggers a check, including plays that are worse than your personal
      best. A worse attempt still counts for anything measured in plays, attempts or streaks.
    </p>
    <p>
      Once something is complete it stays complete. If you clear a milestone for having a 95%
      average accuracy and then drop back to 94% you don't lose it.
    </p>

    <WikiHeading id="completion-percentage">The completion percentage</WikiHeading>
    <p>
      Each entry shows the share of players who've completed it out of everybody who has ever set a
      score here. Even the easiest ones are below 100% and the hard ones are a fraction of a
      percent.
    </p>

    <WikiHeading id="bl-badge">The BL badge</WikiHeading>
    <p>
      A few entries have a BL badge. Those need details that only reach us when your score comes
      through BeatLeader, either from the mod itself or from the AccSaber plugin sending them along.
      Pauses are the usual example and you can't get those playing through ScoreSaber alone.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      Everything on the board gives XP and that XP goes into your level the same way score XP and
      mission XP do. Some milestones also give an item for your profile.
    </p>
    <p>
      Anything you've finished can be pinned to your profile like pinned scores, with three slots to
      fill and six for supporters.
    </p>
  </WikiProse>
</template>

<style scoped>
.walkthrough-error {
  color: var(--text-secondary);
}
</style>
