<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { CategoryCode } from '@/types/display'
import WikiCompareTable from '@/wiki/components/WikiCompareTable.vue'
import WikiHeading from '@/wiki/components/WikiHeading.vue'
import WikiMissionForge from '@/wiki/components/WikiMissionForge.vue'
import WikiProse from '@/wiki/components/WikiProse.vue'
import type { ForgeProfile } from '@/wiki/useMissionForge'
import { computed, onMounted, ref } from 'vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const profile = ref<ForgeProfile | null>(null)
const defaultProfile = ref<ForgeProfile | null>(null)
const pickedUserId = ref<string | null>(null)
const pickFailedName = ref<string | null>(null)
let pickSeq = 0

const pickNotice = computed(() =>
  pickFailedName.value
    ? `${pickFailedName.value} has no ranked plays to build from, so the forge went back to the default profile.`
    : null,
)

const BAND_ROWS = [
  { label: 'How often a daily slot rolls it', values: ['30%', '40%', '25%', '5%'] },
  { label: 'Where it aims on the leaderboard', values: ['slightly below your level', 'right at your level', 'a real stretch above it', 'the top end of what you could do'] },
  { label: 'Ceiling against your best play', values: ['96%', '97%', '98%', '100.5%'] },
  { label: 'Streak asked for, against your usual', values: ['half', '70%', '90%', 'all of it'] },
]

async function buildProfile(userId: string, name: string, real: boolean) {
  const { getUserSkill, getUserAllStatistics } = await import('@/api/users')
  const [skill, stats] = await Promise.all([
    getUserSkill(userId),
    getUserAllStatistics(userId),
  ])
  const playsByCategoryId = new Map(stats.categories.map((c) => [c.categoryId, c.rankedPlays]))
  const overallSkillLevel = skill.skills.find((s) => s.categoryCode === 'overall')?.skillLevel ?? 0
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
    real,
    userId,
    totalXp: stats.totalXp,
    overallSkillLevel,
    categories,
  } satisfies ForgeProfile
}

async function resolveProfile() {
  await categoryStore.fetchCategories()
  if (authStore.isLoggedIn && authStore.userId) {
    try {
      const mine = await buildProfile(authStore.userId, authStore.userProfile?.name ?? 'you', true)
      if (mine) {
        defaultProfile.value = mine
        if (!pickedUserId.value) profile.value = mine
        return
      }
    } catch {
      defaultProfile.value = null
    }
  }
  try {
    const overallId = categoryStore.getCategoryId('overall')
    if (!overallId) return
    const { getLeaderboard } = await import('@/api/leaderboards')
    const page = await getLeaderboard(overallId, { page: 24, size: 1 })
    const example = page.content[0]
    if (!example) return
    defaultProfile.value = await buildProfile(example.userId, example.userName, false)
    if (!pickedUserId.value) profile.value = defaultProfile.value
  } catch {
    defaultProfile.value = null
  }
}

async function onPick(user: { userId: string; userName: string } | null) {
  const seq = ++pickSeq
  pickFailedName.value = null
  if (!user) {
    profile.value = defaultProfile.value
    return
  }
  if (user.userId === profile.value?.userId) return
  profile.value = null
  let built: ForgeProfile | null = null
  try {
    built = await buildProfile(user.userId, user.userName, false)
  } catch {
    built = null
  }
  if (seq !== pickSeq) return
  if (built) {
    profile.value = built
    return
  }
  pickFailedName.value = user.userName
  pickedUserId.value = null
  profile.value = defaultProfile.value
}

onMounted(resolveProfile)
</script>

<template>
  <WikiProse>
    <p>
      Missions are built around what you can do and ask for slightly more than that. You will
      find them in the missions menu in the navbar, and during a live event on the event page.
    </p>
    <p>
      A mission only shows you a number, like "Score 812 AP on this map." Nothing tells you
      where 812 came from, why a friend at your skill got 640 on the same map, or why the tag
      says extreme.
    </p>

    <WikiHeading id="rhythm">The rhythm</WikiHeading>
    <p>
      You get two daily missions, and they reset at 4am UTC. The first of the two uses templates
      that can always be built, and a day with no playable daily is very rare.
    </p>
    <p>
      You get one weekly per category you have played. They reset on Monday at 4am UTC, and one
      of them is always extreme. If you only play Tech, you get one weekly.
    </p>
    <p>
      At reset, anything you finished stays finished and you keep what it gave you. Anything
      unfinished is replaced, with no progress carried over. The roll is seeded from your
      account and the date, and logging out and back in will not change your missions.
    </p>

    <WikiHeading id="forge">Watch one get built</WikiHeading>
    <p>
      Hit forge and it builds a mission the way the game would, one stage at a time. You can
      step through it, jump back to any stage and pick a specific mission type. It builds
      against your own profile by default, but you can point it at anyone.
    </p>
    <WikiMissionForge
      v-model:target="pickedUserId"
      :profile="profile"
      :target-notice="pickNotice"
      @pick="onPick"
    />

    <WikiHeading id="bands">Bands</WikiHeading>
    <p>
      The tag on a mission card reading easy, medium, hard or extreme is its band. It is the
      mission's own difficulty, and we call it a band to keep it apart from map difficulties
      like Expert+.
    </p>
    <p>
      The band decides where on the leaderboard the target aims, how far above your current best
      it can go and how much XP the mission gives.
    </p>
    <WikiCompareTable
      :columns="['Easy', 'Medium', 'Hard', 'Extreme']"
      :rows="BAND_ROWS"
    />
    <p>
      Extreme is the only band that can ask for slightly more than your best play has ever been
      worth. It shows up on about one daily slot in twenty, plus one guaranteed weekly slot.
    </p>
    <p>
      Three corrections run on top of the table. If you are under about 70 skill in a category,
      the easy, medium and hard ceilings get lowered, and extreme does not.
    </p>
    <p>
      A second ceiling comes from the map instead of your best play. The game looks at how you
      usually score on maps around that complexity and will not ask for much more than that.
    </p>
    <p>
      On AP and accuracy missions, if the map is one you already have a score on, the game
      compares that score to your best in the category and blends it into the rolled band. A
      mission that has to beat one of your best plays gets pulled up toward extreme, and an
      extreme roll on a map you barely tried goes back down.
    </p>
    <p>
      Personal best missions go the other way. If the map is one you have never played, the band
      drops to easy whatever was rolled, because any score on it is a personal best.
    </p>

    <WikiHeading id="snipes">Snipes</WikiHeading>
    <p>
      Snipe missions are the only ones that put another player in front of you.
    </p>
    <p>
      A target AP gets worked out first, the same way it would for any other map mission. That
      number then opens a range. The floor keeps the snipe from being a two AP gap, and the
      ceiling keeps it inside what you could hit today. Anyone whose skill is too far from yours
      is also removed, five points on easy and up to eighteen on extreme.
    </p>
    <p>
      Whoever is left gets ranked by how close they sit to the target, and one of the closest
      three is picked at random. If nobody is left, the map is dropped and another one is tried.
    </p>
    <p>
      The bigger the gap a snipe asks for, the bigger the XP bonus on top, up to half again the
      normal reward.
    </p>

    <WikiHeading id="rewards">Rewards</WikiHeading>
    <p>
      Mission XP comes from a curve based on your skill level in the category. Two players with
      the same mission get different XP, because the same mission is a different amount of work
      for each of them. The template then applies its own multiplier and the band applies
      another. Weeklies use a much steeper curve than dailies.
    </p>
    <p>
      Missions can also give an item, but only while a live event is running. During one,
      roughly one mission in seven comes with an item, and difficulty has nothing to do with
      which ones. Before that, about one in five rolls the event's crate instead.
    </p>

    <WikiHeading id="fewer">When a slot comes up empty</WikiHeading>
    <p>
      The most common reason is that you have not played in the past 3 months.
    </p>
    <p>
      The other reason affects newer accounts. Every map mission starts from the AP you would
      need to move your total by one point, and that number decides which part of the ranked
      pool the map gets picked from. Early on that part sits below the easiest ranked map, and
      no map missions can be built. It opens up on its own as you set scores, and you can see
      where the edge is in the builder above.
    </p>
    <p>
      A slot will also refuse to give you something pointless. A target under a score you
      already have gets thrown out. So does one that is too small, and so does a map whose world
      record sits far below your level. Streak missions compare you against maps of similar
      complexity, and a map in a range you have never streaked on gets rerolled. When a template
      fails another one gets a turn, and if they all fail the slot stays empty. This happens
      extremely rarely.
    </p>

    <WikiHeading id="events">Events work differently</WikiHeading>
    <p>
      Missions that show up during a live event do not go through any of this. Their targets are
      fixed by whoever built the event and identical for everyone, and they unlock in weeks on a
      schedule. <RouterLink to="/wiki/events">Events</RouterLink> covers how the weeks work.
    </p>
  </WikiProse>
</template>
