import PageHeader from '../components/PageHeader'
import { trackingDisabled } from '../lib/analytics'

// Written to be read, not to be a shield. Every claim here is one the code
// actually enforces -- if a line stops being true, the code changed and this
// page is now wrong.
function Block({ title, children }) {
  return (
    <div className="rounded-2xl border border-gold/12 bg-white/[.02] p-5">
      <h2 className="font-display text-lg text-gold-bright">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-parchment/70">{children}</div>
    </div>
  )
}

export default function Privacy() {
  return (
    <div className="space-y-5">
      {/* The page header every other page uses. This one had a SECTION header
          standing in for its title, which left the page with no h1 at all --
          nothing for a screen reader to land on, and the one title on the site
          the arrival animation could never find. No artwork: a page about what
          is not collected should stay quiet. */}
      <PageHeader
        eyebrow="The Realm's Word"
        title="Privacy"
        subtitle="What this site records, and what it deliberately cannot"
      />

      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.04] p-5">
        <p className="text-sm leading-relaxed text-emerald-100/80">
          <b className="text-emerald-200">The short version.</b> Kingdom 846 counts visits so we know whether the
          site is worth maintaining. There are no advertising trackers, no Google Analytics, no Meta pixel, and
          nothing is sold or shared with anyone. We do not store your IP address, and we do not put a cookie or
          any other identifier on your device for analytics.
        </p>
      </div>

      <Block title="What is recorded when you visit">
        <ul className="ml-4 list-disc space-y-1">
          <li>Which page you opened, and which Battle Lab tool you used.</li>
          <li>Whether you arrived from another site — the <i>site name only</i> (e.g. “discord.com”), never the full link.</li>
          <li>Whether you are on mobile, tablet or desktop, and which browser family.</li>
          <li>The date and time.</li>
        </ul>
        <p>
          Each visit is counted against a code the server works out from your connection <b>fresh every day</b>.
          The same person becomes a different code tomorrow. That is deliberate: it lets us count how many people
          visited today, and makes it impossible to follow one person from day to day. Your IP address is used only
          to work out that code in memory and is never written to our records.
        </p>
      </Block>

      <Block title="If you have an account">
        <p>
          Alliance leaders and admins have logins. When you are signed in, your activity — the pages you open and the
          tools you use — is recorded <b>against your account</b> so kingdom leadership can see who is using the
          site. That is the trade for having an account here. If you would rather not be listed that way, sign out
          and use the site normally; signed-out activity is only ever counted anonymously.
        </p>
      </Block>

      <Block title="Forms you fill in">
        <p>
          Transfer requests and alliance applications store exactly what you type — your name, game ID, Discord
          handle and any notes — because kingdom leadership needs them to act on your request. They are visible to
          leadership only, and are not used for anything else.
        </p>
      </Block>

      <Block title="How to opt out">
        <p>
          Turn on <b>Do Not Track</b> or <b>Global Privacy Control</b> in your browser and this site records nothing
          about your visit at all. Not reduced, not anonymised — nothing is sent.
        </p>
        <p className={trackingDisabled ? 'text-emerald-300/90' : 'text-parchment/50'}>
          {trackingDisabled
            ? '✓ Your browser is currently sending that signal, so this visit is not being recorded.'
            : 'Your browser is not currently sending that signal.'}
        </p>
      </Block>

      <Block title="How long it is kept">
        <p>
          Individual visit records are deleted after <b>90 days</b>. Daily totals — “14 people visited on this
          date” — are kept longer, because by then there is nothing in them that points at a person.
        </p>
      </Block>

      <Block title="Where it lives">
        <p>
          Everything stays in Kingdom 846’s own database on our own hosting. No analytics company, ad network or
          data broker receives any of it, and none of it leaves the site.
        </p>
      </Block>

      <Block title="Your rights, and who to ask">
        <p>
          Depending on where you live you may have the right to ask what is held about you, to have it corrected,
          or to have it deleted. For anonymous visits there is genuinely nothing to look up — the daily code cannot
          be traced back to you, which is the point of it. For an account or a form you submitted, ask an admin in
          the Kingdom 846 Discord and it will be dealt with.
        </p>
      </Block>

      <p className="text-[11px] leading-relaxed text-parchment/35">
        Kingdom 846 is a fan-run community site for the game Kingshot. It is not affiliated with, endorsed by, or
        connected to Century Games. This page describes the site as it actually behaves; if the site changes, this
        page changes with it.
      </p>
    </div>
  )
}
