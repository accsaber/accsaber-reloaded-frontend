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
      already walking, and clearing one marks how far you have come. Nobody takes a detour for
      them.
    </p>
    <p>
      Achievements exist for fun, and they ask for wacky scores or silly conditions that nobody
      stumbles into while grinding. Pausing on an accuracy map
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
      Everything on the board carries a tier that runs from Bronze up through Silver, Gold,
      Platinum and Diamond. The tier tells you roughly how much of a stretch it is, the XP
      scales along with it, and a Bronze marker pays pocket change next to a Diamond one. Apex sits above all of
      them and gets used sparingly, once per set collection, for the ones that are supposed to look impossible when you read
      them.
    </p>

    <WikiHeading id="sets">Sets and the set bonus</WikiHeading>
    <p>
      Every milestone belongs to a set, and a set is just a themed group that fills up as you clear
      the things inside it. Finish all of them and the set bonus lands on top of the XP you
      already collected on the way. It is usually worth more than any single entry in the set.
    </p>
    <p>
      The bonus asks for one thing only, the whole set complete. It pays once. If a
      new milestone joins a set you already finished, your bonus stays exactly where it is and the
      set simply has one more thing in it for everyone still working through.
    </p>

    <WikiHeading id="the-map">The map on the milestones page</WikiHeading>
    <p>
      The milestones page opens on one set at a time. The rest sit beside it as cards showing how far
      along you are, and clicking one swaps it into view. Families like General and Completionist
      stay together in the order they were meant to be walked, roughly easiest to hardest.
    </p>
    <p>
      Inside the open set, every milestone gets its own marker. The icon says what the milestone
      actually measures. A play count, a best accuracy and a rank all look different at a glance.
      The frame around it carries the tier, and a small colored bar underneath means the milestone
      only counts scores from one category.
    </p>
    <p>
      Lines between markers show which milestones were designed to lead into each other. Nothing on
      that map is locked. You can complete any milestone at any time, in whatever order your play
      happens to deliver it, and a line between two of them does not mean the first one gates the
      second. If that ever changes for a particular milestone, the page will tell you so on the
      milestone itself.
    </p>

    <WikiHeading id="checking">When they get checked</WikiHeading>
    <p>
      Every score you send in triggers a check, and that includes the runs that lose to your
      personal best. A worse attempt still counts toward anything measured in plays, attempts or
      streaks, and you can finish a milestone with a score that never shows up on your profile as
      a best play.
    </p>
    <p>
      Once something is marked complete it stays complete, even if the number behind it moves
      the wrong way afterwards. Clearing a milestone for holding 95% average
      accuracy and then drifting back down to 94% does not take it away from you.
    </p>

    <WikiHeading id="completion-percentage">The completion percentage</WikiHeading>
    <p>
      Each entry shows the share of players who have completed it, measured against everybody who has
      ever set a score here, not against the people who went looking for it. That denominator
      is the whole player base. Even the friendliest ones on the board sit below 100% and the
      serious ones read as a fraction of a percent. Small numbers are normal there, and they
      make a decent proxy for how rare something actually is.
    </p>

    <WikiHeading id="bl-badge">The BL badge</WikiHeading>
    <p>
      A few entries carry a BL badge. Those depend on details that only reach us when your score
      comes through BeatLeader, either from the mod itself or from the AccSaber plugin passing them
      along. Pauses are the usual example. A score has to tell us it was paused before anything
      can be handed out for pausing. Playing through ScoreSaber alone leaves those ones out of reach.
    </p>

    <WikiHeading id="rewards">What they pay</WikiHeading>
    <p>
      Everything on the board pays XP, and that XP feeds straight into your level the same way score
      XP and mission XP do. Set bonuses pay on top of it. Milestones can also carry an item
      reward attached to them, and certain ones will hand you something for your profile
      alongside the XP.
    </p>
    <p>
      Anything you have finished can be pinned to your profile the way pinned scores work, with three
      slots to fill and six for supporters. Only completed ones go up there. A pin says you cleared
      the thing, not what you are still chasing.
    </p>
  </WikiProse>
</template>

<style scoped>
.walkthrough-error {
  color: var(--text-secondary);
}
</style>
