<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import { CONTACT_EMAIL, CONTACT_MAILTO, KOFI_URL, LEGAL_UPDATED } from '@/utils/constants'
import LegalDocument from './legal/LegalDocument.vue'
import LegalSection from './legal/LegalSection.vue'

usePageMeta({
  title: 'Terms of Service | AccSaber',
  description: 'The rules for using AccSaber.',
})
</script>

<template>
  <LegalDocument title="Terms of Service" :updated="LEGAL_UPDATED">
    <p>
      AccSaber is a hobby project run by one person in Spain, and setting a ranked score or logging
      in puts you under the rules below. They are written to be read. If one of them ever bites you
      in a way that feels wrong, the address in the first section reaches an actual human.
    </p>

    <LegalSection id="who-runs-this" title="Who runs this">
      <p>
        One person pays the bills, with a small volunteer staff on map ranking and moderation. There
        is no company behind it and nobody drawing a salary. Legal notices, takedown requests, ban
        appeals and bugs that ate your inventory all go to
        <a :href="CONTACT_MAILTO">{{ CONTACT_EMAIL }}</a> and land in the same inbox.
      </p>
      <p>
        These terms run on Spanish law, and if something ever has to end up in court it goes to the
        Spanish courts. Your rights as a consumer under the law of the country you live in stay
        exactly where they are.
      </p>
    </LegalSection>

    <LegalSection id="your-account" title="Your account">
      <p>
        There is no sign up. The first time you set a score on a ranked map your profile creates
        itself out of whatever BeatLeader or ScoreSaber reported, name, avatar, country and all.
        Logging in comes afterwards, and attaching a Steam, BeatLeader or Discord account to that
        profile is what opens up cosmetics, trading and editing your own page.
      </p>
      <p>
        One profile per person, and a second account made to farm items, dodge a ban, bid on your
        own listings or push somebody up a leaderboard takes both accounts down with it. Whatever
        happens under your login counts as yours. Hand your session to a friend and you own what
        they do with it.
      </p>
      <p>
        You have to be at least 14, the age Spanish law sets for looking after your own data.
        Younger than that and a parent or guardian is the one who has to agree to this.
      </p>
    </LegalSection>

    <LegalSection id="fair-play" title="Scores and fair play">
      <p>
        Scores reach AccSaber from BeatLeader, ScoreSaber and the AccSaber plugin. Modified game
        files, spoofed submissions, stitched replays and somebody else playing on your account all
        count as the same thing here, and every one of them ends with the scores gone.
      </p>
      <p>
        We can pull any score, recalculate AP, reset a profile or ban an account, and most of the
        time you will hear exactly why. In a case where explaining the detection would only teach
        the next person how to beat it, you will not.
      </p>
      <p>
        Reweights, curve changes and category moves shift numbers you had got used to. That is the
        leaderboard working as intended and it is not something to appeal.
      </p>
    </LegalSection>

    <LegalSection id="what-you-write" title="What you write">
      <p>
        Bios, display names, campaign names and descriptions, chat messages, trade notes, market
        listing text. You keep the rights to everything you make. Putting it on AccSaber gives us
        permission to store it and show it to other players, even in places it already sits, like a
        campaign somebody else is halfway through.
      </p>
      <p>
        Keep it out of the obvious territory. Harassment, slurs, sexual content involving minors,
        threats, doxxing, impersonating another player or a staff member, and anything illegal in
        Spain will get pulled. Advertising, scam links and listings written to bait somebody into an
        off-site trade come down too.
      </p>
      <p>Anything on that list can be removed without warning. Repeat offences end in a ban.</p>
    </LegalSection>

    <LegalSection id="items-and-market" title="Items and the market">
      <p>
        Items, essence, crates and everything moving through the market exist on AccSaber and
        nowhere else. They are not property, not currency, and not worth money. Nothing in your
        inventory can be cashed out, traded for real money, or carried off the site, and selling an
        item or a whole account for money outside AccSaber gets everybody involved banned, whichever
        side of that deal they were standing on and however long the account had been around.
      </p>
      <p>
        Crates hand out items by chance, and every crate publishes what is in its pool before you
        open one.
      </p>
      <p>
        Items, rarities, drop rates and market prices all change as the site gets tuned. An item you
        own can be adjusted, brought back in a later crate, or pulled entirely if it turns out to be
        broken or if the art behind it has to come down. None of that is a refund. Nothing was ever
        bought.
      </p>
    </LegalSection>

    <LegalSection id="supporting" title="Supporting AccSaber">
      <p>
        Servers, the domain, the CDN and the API cost real money every month, and
        <a :href="KOFI_URL" target="_blank" rel="noopener noreferrer">Ko-fi</a> is where that money
        comes from. Ko-fi and their payment provider hold your card details, and AccSaber has no
        access to them.
      </p>
      <p>
        Supporter tiers pay back in cosmetics, a tier badge and a name on the
        <RouterLink to="/credits">Credits</RouterLink> page. They buy nothing that touches your AP,
        your rank, your crate odds or a ranking decision, and the perks attached to a tier can
        change while the tier is running.
      </p>
      <p>
        If a donation goes wrong, a double charge or a tier that never landed, email me and it gets
        sorted. Refunds on the payment itself go through Ko-fi, who are the ones actually holding
        the money.
      </p>
    </LegalSection>

    <LegalSection id="uptime" title="Uptime and data">
      <p>
        The site goes down, the API breaks, a migration eats something now and then, and the whole
        thing gets maintained in whatever time is left over after a day job. None of that entitles
        you to compensation.
      </p>
      <p>
        AccSaber can shut down one day, and if it does, the leaderboards, the inventories and the
        essence go with it. Nothing in there converts into anything outside the site, on that day or
        any other.
      </p>
    </LegalSection>

    <LegalSection id="other-peoples-work" title="Other people's work">
      <p>
        Beat Saber belongs to Beat Games, and AccSaber is not affiliated with them, or with
        BeatLeader, ScoreSaber or BeatSaver, and none of those four endorse this site. Song titles,
        cover art and map data come from BeatSaver, and the maps belong to the people who made them.
      </p>
      <p>
        If something of yours is on AccSaber and you want it gone, email
        <a :href="CONTACT_MAILTO">{{ CONTACT_EMAIL }}</a> with a link and enough detail to find it.
        It comes down while we work out whether it should have been there.
      </p>
    </LegalSection>

    <LegalSection id="bans-and-leaving" title="Bans and leaving">
      <p>
        You can walk away whenever you like, and deleting a profile takes an email today, because
        settings has no button for it yet. Ask for it and it gets done, however long you have been
        on here.
      </p>
      <p>
        A ban cuts off logging in, trading, and holding a place on the leaderboards. Scores the
        leaderboard history depends on can be stripped of anything identifying instead of deleted
        outright, so the maps other players competed on stay intact.
      </p>
    </LegalSection>

    <LegalSection id="changes" title="Changes">
      <p>
        These terms move when the site moves, and the date at the top is the last time that
        happened. Carrying on using AccSaber after a change means the new version is the one that
        applies to you.
      </p>
    </LegalSection>
  </LegalDocument>
</template>
