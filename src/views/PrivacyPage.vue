<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import { CONTACT_EMAIL, CONTACT_MAILTO, LEGAL_UPDATED } from '@/utils/constants'
import LegalDocument from './legal/LegalDocument.vue'
import LegalSection from './legal/LegalSection.vue'

usePageMeta({
  title: 'Privacy Policy | AccSaber',
  description: 'What AccSaber stores about you, and what you can do about it.',
})

interface StoredData {
  label: string
  detail: string
}

const STORED: StoredData[] = [
  {
    label: 'Your profile',
    detail:
      'An AccSaber id, your display name and every name you have used before, an avatar, a country, a bio, your XP, level, essence and rankings, and the date the profile appeared.',
  },
  {
    label: 'Your scores',
    detail:
      'Score, accuracy, AP, rank, misses, bad cuts, wall hits, bomb hits, pauses, max combo, play count, the headset you played on, when you set it, and the BeatLeader or ScoreSaber id it arrived with.',
  },
  {
    label: 'Your logins',
    detail:
      'Which provider you used, the user id and username that provider handed over, the avatar it pointed at, when you linked it, and a refresh token per session with the time it was last used.',
  },
  {
    label: 'Donations',
    detail:
      'Ko-fi tells AccSaber the name, email address and amount attached to a donation so the money can be matched to your account.',
  },
  {
    label: 'Things you write',
    detail: 'Bios, campaign names and descriptions, chat messages, market listings, trade notes.',
  },
  {
    label: 'Requests',
    detail:
      'The web server keeps ordinary request logs, which include an IP address and a browser user agent, and they get used for debugging and for tracking down abuse.',
  },
]
</script>

<template>
  <LegalDocument title="Privacy Policy" :updated="LEGAL_UPDATED">
    <p>
      Almost nobody on AccSaber signed up for it. Your profile got made the first time a ranked
      score of yours reached the site, and the name, avatar and country on it arrived from
      BeatLeader or ScoreSaber alongside the score. Everything below is what happens to that data
      afterwards.
    </p>

    <LegalSection id="who-holds-it" title="Who holds your data">
      <p>
        Everything AccSaber stores sits on servers rented by one person in Spain, and under the GDPR
        that person is the data controller. There is no company and no data protection officer, and
        nobody else processes any of it on their behalf. Every request anywhere in this document
        goes to the same address, <a :href="CONTACT_MAILTO">{{ CONTACT_EMAIL }}</a>, and it is read
        by the person who runs the site.
      </p>
    </LegalSection>

    <LegalSection id="what-is-stored" title="What is stored">
      <dl class="legal-facts">
        <div v-for="row in STORED" :key="row.label" class="legal-facts__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.detail }}</dd>
        </div>
      </dl>
      <p>
        AccSaber holds no password of yours, for the plain reason that the site has no passwords
        anywhere in it. Your email is here only if you have donated.
      </p>
    </LegalSection>

    <LegalSection id="what-is-public" title="What everyone can see">
      <p>
        Profiles are public and so is nearly everything on them. Your name, avatar, country, level,
        scores, items, milestones and bio can be read by anybody, logged in or not, and the public
        API hands out the same data to anyone who asks for it, without a key or a login, and with no
        way for you to find out who asked. Ranking staff and admins also see moderation history and
        the accounts you have linked.
      </p>
      <p>
        The two things you can shut off are your following list and your rivals list, in
        <RouterLink to="/settings">Settings</RouterLink>, each one set to public, followers only, or
        nobody at all.
      </p>
    </LegalSection>

    <LegalSection id="lawful-basis" title="Why we are allowed to keep it">
      <p>
        Your scores, your profile and the leaderboards run on legitimate interest. AccSaber exists
        to rank plays that were already public on BeatLeader and ScoreSaber, and a leaderboard
        cannot work while the people on it are missing from it.
      </p>
      <p>
        Logging in, cosmetics, trading, the market and notifications run on the service you asked
        for when you logged in and used them.
      </p>
      <p>
        Donation records stay for as long as Spanish accounting law says they have to, and that is
        longer than anything else here.
      </p>
    </LegalSection>

    <LegalSection id="who-else" title="Who else sees it">
      <p>
        Nothing here is sold, there is no advertising on the site, and AccSaber runs no analytics at
        all. No Google tag, no pixel, and no third-party script counting what you click.
      </p>
      <p>
        The people who do touch it are the ones who have to. The server host and the CDN move the
        data around so pages load, which means requests pass through servers outside the EU. Ko-fi
        handles the payment side. It sends back the name and the amount on the donation. Discord,
        Steam and BeatLeader get told you are linking an account, and they hand back the id, the
        username and the avatar.
      </p>
    </LegalSection>

    <LegalSection id="how-long" title="How long it stays">
      <p>
        Profiles and scores stay for as long as AccSaber runs, because the leaderboard history
        depends on all of it staying put. Sessions expire on their own and logging out kills that
        refresh token immediately. Request logs are short lived. Donation records follow the
        accounting rules and outlast the rest.
      </p>
    </LegalSection>

    <LegalSection id="your-rights" title="Your rights">
      <p>
        You can ask for a copy of everything held about you, get anything wrong in it fixed, have it
        deleted, take it somewhere else in a machine-readable file, or object to it being held at
        all. Objecting to the leaderboard is a real option with a real consequence attached, because
        it takes the profile down with it.
      </p>
      <p>
        Every one of those starts with an email to
        <a :href="CONTACT_MAILTO">{{ CONTACT_EMAIL }}</a>, and the law gives us one month to answer
        you properly.
      </p>
      <p>
        Scores that other players competed against can be stripped of everything identifying instead
        of deleted outright, so the maps and the history other people built stay standing while you
        disappear from them.
      </p>
      <p>
        If the answer you get is a bad one, the Agencia Española de Protección de Datos is the
        regulator to take it to, at
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>.
      </p>
    </LegalSection>

    <LegalSection id="cookies" title="Cookies">
      <p>
        AccSaber sets what it needs to keep you logged in and stops there. Four cookies carry your
        session tokens and your user id across the site, and they last a year unless you log out.
        Your theme, your layout and a staff login sit in your browser's own storage. None of it
        follows you off the site and none of it goes anywhere else. That is the entire reason no
        cookie banner ever gets in your way.
      </p>
    </LegalSection>

    <LegalSection id="age" title="Age">
      <p>
        Spanish law puts the line at 14 for looking after your own data, and AccSaber follows that
        line. Younger than that and a parent or guardian has to be the one agreeing to this, and an
        account found without that behind it comes down.
      </p>
    </LegalSection>

    <LegalSection id="changes" title="Changes">
      <p>
        This policy moves when the site moves, and the date at the top is the last time that
        happened. Anything that changes how your data gets used will show up here first.
      </p>
    </LegalSection>
  </LegalDocument>
</template>
