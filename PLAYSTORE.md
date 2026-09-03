# Putting Kingdom 846 on the Google Play Store

The app is already built. What goes in the store is a thin Android wrapper — a
**Trusted Web Activity** — which is a Chrome window with the browser furniture
removed, pointing at kingdom846.com. It is not a rewrite: the same app members
install from the website is the one that ships.

Everything on the server side is done. What is left needs a Google account and a
card, which is why it is a set of instructions rather than a commit.

---

## What you need

| | |
|---|---|
| Google Play Developer account | **$25, one time.** [play.google.com/console](https://play.google.com/console) — sign-up includes an identity check that can take a day or two, so start it first |
| A computer | Only to upload files. No Android tooling to install if you use the route below |
| Time | About an hour of clicking, then Google's review — usually a few days for a new developer |

---

## Step 1 — Build the Android package

Use **[PWABuilder](https://www.pwabuilder.com)**. It is Microsoft's tool, it is
free, and it does the whole job in a browser — no Android Studio, no command
line.

1. Go to pwabuilder.com and enter `https://kingdom846.com`
2. It reports on the app — it should pass, the manifest and service worker are in place
3. Click **Package for stores** → **Android** → **Google Play**
4. Set the package ID to exactly:

   ```
   com.kingdom846.portal
   ```

   This must match what the server publishes at `/.well-known/assetlinks.json`.
   If you change it here, change `TWA_PACKAGE` on Render too.

5. Leave **Signing key** as **"Create new"** — let Google manage it (see Step 3)
6. Download the zip. It contains `app-release-bundle.aab`, which is what you upload

> **Bubblewrap** is the alternative if you would rather work locally
> (`npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest
> https://kingdom846.com/manifest.webmanifest`). It needs a JDK and the Android
> SDK. PWABuilder is the same output with none of that.

---

## Step 2 — Create the listing

In the Play Console: **Create app**, then fill in the store listing. The assets
are all prepared and were sent to you alongside this file.

| Field | Use |
|---|---|
| App name | `Kingdom 846` |
| Short description | *The official portal for Kingshot Kingdom 846 — events, rankings, guides and alliance reminders.* (max 80 chars) |
| Full description | See below |
| App icon | `store-icon-512.png` (512×512) |
| Feature graphic | `feature-graphic-1024x500.png` |
| Phone screenshots | `home.png`, `events.png`, `rankings.png`, `battle-lab.png`, `guides.png` — all 1080×1920 |
| Category | Tools, or Entertainment |
| Privacy policy | `https://kingdom846.com/#/privacy` |

### Full description

```
Kingdom 846 — One Crown. Four Alliances. Endless Glory.

The official companion app for Kingshot Kingdom 846. Everything the kingdom
runs on, on your phone.

EVENT REMINDERS
Pick your alliance once and your phone buzzes ten minutes and five minutes
before its events — Bear Hunt, Vikings Vengeance, Tri-Alliance Clash and
Swordland Showdown — even with the app closed. Times come from your own
alliance leader's schedule, so they are the times you actually muster.

ARENA RESET
A reminder before the daily arena reset, so unspent challenges are never
wasted.

THE ROYAL ADVISOR
Ask about alliances, event times, the current ruler, troop counters, heroes or
formations and get a straight answer, drawn from the kingdom's own live data.

BATTLE LAB
Bear trap optimisation, PvP simulation, mystic trials and formation planning —
built on measured combat data rather than guesswork.

THE KINGDOM
Alliance rankings, the current King or Queen, the event timeline, kingdom news
and a full library of Kingshot guides.

WORKS WITHOUT SIGNAL
Opens and reads offline. Notifications still arrive.

Kingdom 846 is a player-run community for the mobile strategy game Kingshot.
Not affiliated with or endorsed by the makers of Kingshot.
```

---

## Step 3 — The part that decides whether it looks like a real app

A Trusted Web Activity only drops the browser's URL bar if the site proves it
owns the app. That proof is a file at
`https://kingdom846.com/.well-known/assetlinks.json`, which this server already
publishes — it just needs the fingerprint of the key Play signs with.

**Get it right and the app is full screen. Get it wrong and there is a browser
address bar across the top of every screen, which is the single thing people
notice.**

1. Upload the `.aab` to Play Console (Internal testing is fine to start)
2. Go to **Setup → App signing**
3. Copy the **SHA-256 certificate fingerprint** — the long colon-separated one
4. In Render → the `kingdom846` service → **Environment**, add:

   | Key | Value |
   |---|---|
   | `TWA_SHA256` | the fingerprint you just copied |
   | `TWA_PACKAGE` | `com.kingdom846.portal` (only if you changed it in Step 1) |

5. Save. Render redeploys automatically
6. Check it published:

   ```
   curl https://kingdom846.com/.well-known/assetlinks.json
   ```

   It should list your package and fingerprint. If it returns `[]`, the
   environment variable did not take. If it returns HTML, something is wrong
   with routing — tell me.

Do this **before** inviting testers. Android caches the verification, and a
tester who installs while it is wrong may keep seeing the URL bar until they
reinstall.

> More than one fingerprint is allowed: `TWA_SHA256` accepts a comma-separated
> list. Useful if you ever add an upload key alongside Play's signing key.

---

## Step 4 — Release

1. **Internal testing** first. Add your own email, install from the link, and
   check: no URL bar, the crest as the icon, notifications still arriving
2. Then **Production** → Google reviews it. A few days for a first app
3. Fill in the Data safety form. The honest answers: the app collects a
   notification token and, if a leader signs in, an account. No advertising ID,
   no location, no data sold

---

## What will not change

Publishing this does not fork the app. The store version loads the same site, so
every deploy reaches store users at the same moment it reaches everyone else.
There is no second codebase and no re-submission for content changes.

You would only upload a new `.aab` to change the wrapper itself — the app name,
the icon, or the Android version it targets.

---

## What this does not get you

The App Store. Apple does not accept wrapped web apps this way, so iPhone users
continue to install from the website: **Share → Add to Home Screen**, which
gives them the same app. Only the store listing is Android-only.
