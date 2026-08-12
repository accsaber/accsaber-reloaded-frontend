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
      Milestones are the objectives you run into just by playing. They sit along the path you are
      already walking, so clearing one is a marker of how far you have come rather than a detour you
      went out of your way to take.
    </p>
    <p>
      Achievements are the other kind of thing entirely. They exist for fun, and they ask for wacky
      scores or silly conditions that nobody stumbles into while grinding. Pausing on an accuracy map
      has one waiting for it. So does submitting two scores on the same map in a single day.
    </p>
    <p>
      Both live inside the same sets, both carry a tier, and both pay XP the moment they land. What
      separates them is what they ask of you.
    </p>

    <p>
      Here is the real board, running on live data. Pick any set and watch it pay out one entry at a
      time, with the set bonus landing once the last one is done. If you are logged in it counts your
      own completions as it goes.
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
      Everything on the board carries a tier, running from Bronze up through Silver, Gold, Platinum
      and Diamond. The tier tells you roughly how much of a stretch it is, and the XP scales along
      with it, so a Bronze marker pays pocket change next to a Diamond one. Apex sits above all of
      them and gets used sparingly, once per set collection, for the ones that are supposed to look impossible when you read
      them.
    </p>

    <WikiHeading id="sets">Sets and the set bonus</WikiHeading>
    <p>
      Every milestone belongs to a set, and a set is just a themed group that fills up as you clear
      the things inside it. Finish all of them and the set bonus lands on top of the XP you already
      collected on the way, which is usually worth more than any single entry in the set.
    </p>
    <p>
      The bonus asks for one thing only, which is having the whole set complete. It pays once. If a
      new milestone joins a set you already finished, your bonus stays exactly where it is and the
      set simply has one more thing in it for everyone still working through.
    </p>

    <WikiHeading id="the-map">The map on the milestones page</WikiHeading>
    <p>
      The milestones page draws the sets as a map with lines running between them. Families like
      General and Completionist keep related sets together, and the lines trace the route the sets
      were designed to be walked in, which is roughly easiest to hardest.
    </p>
    <p>
      Nothing on that map is locked. You can complete any milestone at any time, in whatever order
      your play happens to deliver it, and a line between two of them does not mean the first one
      gates the second. If that ever changes for a particular milestone, the page will tell you so on
      the milestone itself.
    </p>

    <WikiHeading id="checking">When they get checked</WikiHeading>
    <p>
      Every score you send in triggers a check, including the runs that lose to your personal best. A
      worse attempt still counts toward anything measured in plays, attempts or streaks, so you can
      finish a milestone with a score that never shows up on your profile as a best play.
    </p>
    <p>
      Completion is permanent. Once something is marked complete it stays complete, even if the
      number behind it moves the wrong way afterwards. Clearing a milestone for holding 95% average
      accuracy and then drifting back down to 94% does not take it away from you.
    </p>

    <WikiHeading id="completion-percentage">The completion percentage</WikiHeading>
    <p>
      Each entry shows the share of players who have completed it, measured against everybody who has
      ever set a score here rather than against the people who went looking for it. That denominator
      is the whole player base, which is why even the friendliest ones on the board sit below 100%
      and the serious ones read as a fraction of a percent. Small numbers are normal there, and they
      make a decent proxy for how rare something actually is.
    </p>

    <WikiHeading id="bl-badge">The BL badge</WikiHeading>
    <p>
      A few entries carry a BL badge. Those depend on details that only reach us when your score
      comes through BeatLeader, either from the mod itself or from the AccSaber plugin passing them
      along. Pauses are the usual example, since a score has to tell us it was paused before anything
      can be handed out for pausing. Playing through ScoreSaber alone leaves those ones out of reach.
    </p>

    <WikiHeading id="rewards">What they pay</WikiHeading>
    <p>
      Everything on the board pays XP, and that XP feeds straight into your level the same way score
      XP and mission XP do. Set bonuses pay on top of it. Milestones can also carry an item reward
      attached to them, so certain ones will hand you something for your profile alongside the XP.
    </p>
  </WikiProse>
</template>

<style scoped>
.walkthrough-error {
  color: var(--text-secondary);
}
</style>
