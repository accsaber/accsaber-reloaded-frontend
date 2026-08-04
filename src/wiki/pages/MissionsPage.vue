<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { CategoryCode } from '@/types/display'
import WikiCompareTable from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiMissionForge from '@/wiki/components/WikiMissionForge.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import type { ForgeProfile } from '@/wiki/useMissionForge'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const profile = ref<ForgeProfile | null>(null)

const BAND_ROWS = [
  { label: 'How often a daily slot rolls it', values: ['30%', '40%', '25%', '5%'] },
  { label: 'Where it aims on the leaderboard', values: ['slightly below your level', 'right at your level', 'a real stretch above it', 'the top end of what you could do'] },
  { label: 'Ceiling against your best play', values: ['96%', '97%', '98%', '100.5%'] },
  { label: 'Streak asked for, against your usual', values: ['half', '70%', '90%', 'all of it'] },
]

async function buildProfile(userId: string, name: string, avatarUrl: string | null, real: boolean) {
  const { getUserSkill, getUserAllStatistics } = await import('@/api/users')
  const [skill, stats] = await Promise.all([
    getUserSkill(userId),
    getUserAllStatistics(userId),
  ])
  const playsByCategoryId = new Map(stats.categories.map((c) => [c.categoryId, c.rankedPlays]))
  const categories = skill.skills
    .filter((s) => s.categoryCode !== 'overall')
    .map((s) => {
      const categoryId = categoryStore.getCategoryId(s.categoryCode as CategoryCode)
      return {
        categoryId: categoryId ?? '',
        categoryCode: s.categoryCode,
        categoryName: s.categoryName,
        skillLevel: s.skillLevel,
        rawApForOneGain: s.components.rawApForOneGain,
        topAp: s.components.topAp,
        rankedPlays: categoryId ? (playsByCategoryId.get(categoryId) ?? 0) : 0,
      }
    })
    .filter((c) => c.categoryId && c.rankedPlays > 0 && c.rawApForOneGain > 0)
  if (!categories.length) return null
  return {
    name,
    avatarUrl,
    real,
    userId,
    totalXp: stats.totalXp,
    categories,
  } satisfies ForgeProfile
}

async function resolveProfile() {
  await categoryStore.fetchCategories()
  if (authStore.isLoggedIn && authStore.userId) {
    try {
      const mine = await buildProfile(
        authStore.userId,
        authStore.userProfile?.name ?? 'you',
        authStore.userProfile?.avatarUrl ?? null,
        true,
      )
      if (mine) {
        profile.value = mine
        return
      }
    } catch {
      profile.value = null
    }
  }
  try {
    const overallId = categoryStore.getCategoryId('overall')
    if (!overallId) return
    const { getLeaderboard } = await import('@/api/leaderboards')
    const page = await getLeaderboard(overallId, { page: 24, size: 1 })
    const example = page.content[0]
    if (!example) return
    profile.value = await buildProfile(example.userId, example.userName, example.avatarUrl, false)
  } catch {
    profile.value = null
  }
}

onMounted(resolveProfile)
</script>

<template>
  <WikiProse>
    <p>
      Missions are the part of AccSaber that reaches back. Missions arrive already knowing what you can
      do, and ask for slightly more than that. You will find them in the missions menu up in the
      navbar, and during a live event on the event page itself.
    </p>
    <p>
      The catch is that a mission arrives as a bare number. "Score 812 AP on this map." Nothing
      tells you where 812 came from, why your similar-skilled friend got 640 on the same map, or why the tag says
      extreme. This page opens all of it.
    </p>

    <WikiHeading id="rhythm">The rhythm</WikiHeading>
    <p>
      You get two daily missions, and they reset at 4am UTC. The first of the two leans on a set of
      templates that can always be built, so a day where you cannot touch either mission is about
      as rare as it gets.
    </p>
    <p>
      Weeklies work differently: one per category you have actually played, resetting Monday at 4am
      UTC, with one of those slots forced to extreme. Play nothing but Tech and you get exactly one
      weekly, which is worth knowing before you go asking where the rest of them went.
    </p>
    <p>
      At reset, anything you finished stays finished and keeps what it paid. Anything unfinished is
      wiped and replaced, with no partial credit carried over and no way to save a mission for
      tomorrow. The roll itself is seeded from your account and the date, so logging out and back in
      will not shuffle you into an easier set. What you wake up to is what you have.
    </p>

    <WikiHeading id="forge">Watch one get built</WikiHeading>
    <p>
      Rather than describe the machinery, you get to run it. Hit forge and it builds a mission the
      way the game would, one stage at a time. Step through it at your own pace, jump back to any
      stage you want to reread, and pick a specific mission type if you would rather see how that
      one works.
    </p>
    <WikiMissionForge :profile="profile" />

    <WikiHeading id="bands">Bands</WikiHeading>
    <p>
      The tag on a mission card reading easy, medium, hard or extreme is its band. It is really just
      the mission's own difficulty, and we call it a band so that a sentence like "an extreme difficulty mission
      on an Expert+ map" does not trip over itself. You will sometimes hear the team use the word in Discord
      for the same reason.
    </p>
    <p>
      The band is the single biggest lever on how hard a mission ends up being. It decides where on
      the leaderboard the target aims, how far above your current best it is allowed to reach, and
      how much the mission pays.
    </p>
    <WikiCompareTable
      :columns="['Easy', 'Medium', 'Hard', 'Extreme']"
      :rows="BAND_ROWS"
    />
    <p>
      Extreme is the only band allowed to ask for slightly more than your best play has ever been
      worth, which is exactly what makes it extreme. It also only shows up on about one daily slot
      in twenty, plus one guaranteed weekly slot.
    </p>
    <p>
      Two corrections run underneath the table. If you are still climbing, sitting under about 70
      skill in a category, the easy, medium and hard ceilings get shaded down so you are not handed
      a hard mission demanding 98% of the best play you have ever set; extreme is deliberately left
      out of that softening. And on accuracy and AP missions, if the map that gets picked is one
      you already have a score on, the band gets a second opinion. The game reads how big that
      score is next to your best in the category and blends what it finds into the rolled band,
      weighted toward the roll. A mission that has to beat one of your best plays gets pulled up
      toward extreme no matter what was rolled, and an extreme roll on a map you barely touched
      slides back down, because the tag should describe the climb in front of you, not the dice.
    </p>

    <WikiHeading id="snipes">Snipes</WikiHeading>
    <p>
      Snipe missions are the only ones that put another person in front of you, and they take the
      most care of any mission type to pick someone sensible.
    </p>
    <p>
      A target AP gets worked out first, the same way it would for any other map mission. That
      number then opens a window rather than naming a score. There is a floor, so the snipe is a
      real climb rather than beating someone by two AP, and a ceiling, so it stays inside what you
      could plausibly hit today. Anyone whose skill sits too far from yours is thrown out on top of
      that: five points on easy, widening to eighteen on extreme. That filter is what stops the game
      asking you to snipe someone two tiers above you.
    </p>
    <p>
      Whoever survives all of that gets ranked by how close they sit to the target, and one of the
      closest three is picked at random. If nobody survives, the map is dropped and another one is
      tried, which is why snipes appear less often than their weight alone would suggest.
    </p>
    <p>
      Snipes also pay for distance. The further you are being asked to climb, the bigger the XP
      bonus, up to half again on top of the normal reward.
    </p>

    <WikiHeading id="rewards">What they pay</WikiHeading>
    <p>
      Mission XP comes off a curve keyed to your skill level in the relevant category, so two
      players running structurally the same mission are paid differently, on the grounds that the
      same mission is a different amount of work for each of them. The template then applies its own
      multiplier and the band applies another. Weeklies run on a much steeper curve than dailies,
      which is most of why they are worth chasing.
    </p>
    <p>
      Roughly one mission in seven also carries an item. Difficulty has nothing to do with it, you
      just got lucky. During a live event a crate roll cuts in first, about one in five, and when
      it hits you get the event's crate instead of an item.
    </p>

    <WikiHeading id="fewer">When a slot comes up empty</WikiHeading>
    <p>
      The most common reason is the boring one, you haven't played in the past 3 months.
    </p>
    <p>
      The other reason catches newer accounts and is far less obvious. Every map mission starts from
      the AP you would need to move your total by one point, and that number decides which slice of
      the ranked pool the map gets drawn from. Early on that slice sits below the easiest ranked map
      in the game, so there is nothing to draw from and the whole family of map missions quietly
      sits the day out. It opens up on its own as you set scores, and you can watch exactly where
      the edge is in the builder above.
    </p>
    <p>
      Past that, a slot will refuse to hand you something pointless. A target that lands under a
      score you already hold gets thrown out, so does one too small to be worth the trip, and so
      does a map whose world record sits so far below your level that no sensible target exists on
      it at all. Streak missions have their own version of this, since they measure you against maps
      of similar complexity rather than one blended number, so a map in a range you have never
      streaked on gets resampled instead of guessed at. When a template runs out of road another one
      gets a turn, and if they all fail the slot stays empty. This happens extremely rarely.
    </p>

    <WikiHeading id="events">Events work differently</WikiHeading>
    <p>
      Missions that show up during a live event do not go through any of this. Their targets are
      fixed by whoever built the event, identical for everyone, and they unlock on a schedule rather
      than rotating daily. They also include a few mission types that only ever exist inside events,
      like clearing campaigns or playing maps from the newest batch. Everything on this page is
      about the daily and weekly pools.
    </p>
  </WikiProse>
</template>
