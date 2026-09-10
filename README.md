# Kingdom 846 — Portal

A graphical community portal for Kingshot **Kingdom 846** (United We Rise).
Built with **React + Vite + Tailwind** on the frontend and a self-contained
**Express + SQLite** backend (no external database accounts required).

---

## 1. Run it locally

Requires Node 18+.

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). The dev command boots
both the Vite frontend and the Express backend (port 5000). Data is stored in
a local SQLite file (`data.db`) at the project root and survives restarts.

Production build:

```bash
npm run build          # outputs dist/
node server/index.cjs  # serves API on :5000; serve dist/ as static
```

---

## 2. Server & database — where they live

| What | Path | Notes |
|---|---|---|
| Backend server | `server/index.cjs` | Express app. Starts on port 5000. |
| Database file | `data.db` (project root) | SQLite via `better-sqlite3`. Auto-created on first run. |
| Frontend source | `src/` | React + Tailwind. |
| Static assets | `public/assets/` | AI art, alliance banners, page heroes, crest. |
| Data / content | `src/data/kingdom.js` | Kingdom stats, alliances, roster, news, guides. |

**Endpoints** (all under `/api`):

| Endpoint | Purpose |
|---|---|
| `POST /api/login` | Mode-aware login (`mode: 'admin'` or `'leader'`). Rate-limited (5 attempts / 15 min per IP). |
| `GET  /api/me` | Current user (session-stored token). |
| `PATCH /api/me/credentials` | Change your own username/password. |
| `GET  /api/transfers` / `POST` | Transfer requests (the "better home" form). |
| `GET  /api/content` | Site content stored in DB. |
| `GET/POST /api/applications` | Apply for Chief Minister / Noble Advisor. |
| `GET  /api/king-status` / `PUT` | King & leading alliance (editable by Sparta). |
| `GET  /api/admin/leaders` | List the 4 leaders and the war room accounts (admin only). |
| `PATCH /api/admin/leaders/:id/credentials` | Reset a leader's or war room account's password (admin only). |
| `GET  /api/war-room/roster` | The shared War Room roster (war room crew only). |
| `PUT  /api/war-room/roster` | Save it for the whole crew; a stale `version` is refused with 409. |
| `POST /api/ai/chat` | Ask the Royal Advisor (public, read-only). |
| `POST /api/ai/admin` | Ask the Royal Advisor with actions unlocked (admin only). |

---

## 2b. The Royal Advisor — the kingdom's own AI

The crown button on every page opens **the kingdom's own AI**, built in
`server/ai/`. It runs entirely on this server: no external model, no API key,
no per-message cost, and no visitor question ever leaves the box.

It ranks 323 knowledge topics by relevance to the question, reads the live
database for anything that changes (the ruler, alliance leaders, event
timings, news), understands typos and alliance nicknames, and follows a
conversation — after "tell me about IceHunters", "when is their bear hunt?"
resolves to that alliance.

Its most important property is knowing what it does not know. Retrieval
reports a confidence, so an unfamiliar question gets an honest "I'm not sure"
and the nearest topics instead of a confident wrong answer. That is the
trade against a hosted chatbot: narrower range, but it cannot invent an
alliance leader or a bear hunt time that does not exist.

Visitors ask and look things up. A signed-in admin can also *instruct* it —
"sync the news", "crown Dunngeon High King" — and it confirms before changing
anything. That boundary is a role check in code, not a matter of phrasing, so
a visitor typing "crown me king" is refused.

```bash
npm run advisor:eval     # retrieval quality + honesty check
npm test                 # full regression suite
```

See `server/ai/README.md` for how to add topics, fix a misunderstood question,
and the tuning decisions behind the ranking.

---

## 3. Logins & credentials — where to add / change them

There are **two logins** on the site:

- **Royal Access** (sidebar, bottom) → **admin (Sparta)** login.
- **Login** (top-right) → **alliance leader** login (4 leaders).

### Leader roster upload (what leaders do)

Each leader logs in via the top-right **Login** button, lands on the **Leader
Portal → My Roster** page, and uploads an **Excel (.xlsx/.xls) or CSV** file with
their alliance members. The file should have a **Name** column and a
**Governor ID / User ID** column (a Rank/Position column is optional). Click
**Submit & save roster** and the members are stored in the kingdom database,
replacing that alliance's previous roster. Uploaded rosters then appear live on
the **Rankings** page ("Live roster" banner) grouped by alliance.

A leader can only ever edit **their own alliance's** roster — the alliance is
fixed by their account, never by the request.

### The War Room is shared

Sparta, Shoni, Panini and Anonymous all open the **same** roster. It is stored
once on the server (`war_room_state`), not per device: a march time saved by any
of them is what the next one to look sees, within a few seconds — the room polls
while it is open.

Editing at the same time is handled rather than ignored. Each save carries the
version it was built on; if somebody else saved first, the save is refused and
the room shows whose roster is now current, with the choice to load theirs or
keep and overwrite with yours. Nothing is silently replaced.

To add somebody to the crew, give their account `role: 'warroom'` in the `SEED`
array (or change an existing account's role); Sparta resets their password from
the Master Console like any leader's.

---

## 4. Publishing as `kingdom846.com`

The site can be published two ways:

### A. Perplexity preview URL (instant, no domain needed)
`deploy_website` bundles `dist/` and serves it at a `/computer/a/...` preview URL.
The backend runs on port 5000 and API calls are proxied automatically.

### B. Custom domain `kingdom846.com` (via Vercel)
1. **Register the domain** `kingdom846.com` at a registrar (Namecheap, Porkbun, etc.)
   if you don't already own it.
2. **Connect Vercel** (Connectors → Vercel → authenticate).
3. Deploy the project to Vercel.
4. In Vercel, add the custom domain `kingdom846.com` and set the nameservers /
   DNS records Vercel gives you at your registrar.
5. Once DNS propagates, the site is live at `https://kingdom846.com`.

> Note: the SQLite database is a local file, so on Vercel (serverless) you'd
> switch the DB to a managed SQLite (Turso / Cloudflare D1) or Postgres for
> shared persistence across instances. Ask and I'll wire that up.

---

## 5. Database security

The database is protected in these ways:

- **Passwords** are never stored in plain text — they are hashed with `scrypt` (a
  modern memory-hard function) with a server secret.
- **Sessions** use a signed token stored in `sessionStorage` — survives page
  refreshes but scoped to the current tab (cleared on tab close).
- **Login rate limiting** — max 5 attempts per IP per 15-minute window.
- **SQL injection** is prevented — every query uses `better-sqlite3` parameterized
  statements (no string-concatenated SQL).
- **Leader scope** — a leader can only read/write their own alliance's roster; the
  alliance is taken from their account, never from the request.
- **Input limits** — roster uploads are capped at 2,000 rows, fields trimmed to
  64 chars, request body capped at 1 MB, and duplicate Governor IDs are
  de-duplicated so the database stays consistent.
- **Public data is minimal** — the public roster endpoint returns only member
  names and positions; Governor IDs are visible only to the logged-in leader.

Before going fully live on a custom domain, also do:

- Serve over **HTTPS only** (the hosting provider below handles this).
- Set `SESSION_SECRET` via an environment variable (don't rely on the default).
- Change all default passwords after first login.
- Take regular **database backups**.

## 6. Installing it as an app

The portal is a **PWA** (Progressive Web App), so it installs to a phone or
desktop straight from the browser — no app store, no separate build, and no
second codebase to maintain. Once installed it gets its own home-screen icon,
opens full screen with no browser chrome, and still opens when the phone has
no signal.

**How members install it**

| Platform | Steps |
|---|---|
| Android / Chrome / Edge | An "Install Kingdom 846" banner appears at the bottom — tap **Install**. (Or browser menu → *Install app*.) |
| iPhone / iPad (Safari) | Safari has no install button, so the site shows the instructions instead: **Share** → **Add to Home Screen**. |
| Desktop Chrome / Edge | Install icon in the address bar, or the banner. |

Someone who taps **Not now** is not asked again for 30 days.

**What changes when it runs as an app**

Installing it was only half the job — a site in a frameless window still
*behaves* like a site. When the portal detects it is running installed
(`display-mode: standalone`), it switches into **app mode**, and the website in
a browser tab is left exactly as it was:

| | Website | Installed app |
|---|---|---|
| Opening it | The entrance — nine halls, ENTER THE REALM | A branded launch screen that clears itself in about a second. An app you already installed should not make you knock. |
| Navigation | Hamburger → left drawer | Bottom tab bar: Home, Events, Ranks, Guides, More. "More" opens the full rail. |
| Tapping the tab you're on | — | Scrolls that screen back to the top. |
| Pull down at the top | Rubber-band / pull-to-refresh | Nothing — content stops where it stops. |
| Double-tap | Zooms | Nothing. |
| Tap and hold | Selects text, shows the callout | Nothing on chrome; guide text and governor IDs stay selectable. |
| Tapping a button | Grey flash | No flash. |
| Screen change | Fades up | Slides in from the side. |
| Footer credits | Shown | Hidden — dead end under every screen in an app. |
| Losing signal | Nothing said | A strip appears: "No connection — showing what was last saved", and a note when it returns. |
| Dragging down from the top | Browser reloads the page | The app's own pull-to-refresh: refetches the data, keeps you on the screen you're on. |
| Back button with a menu open | Leaves the page | Closes the menu. |
| Tapping a tab | — | A short haptic tick (Android). |
| Status bar / notch | n/a | Header and tab bar hold their own safe-area clearance. |

### Event reminders

Installed players get a push **10 minutes and 5 minutes before their alliance's
events**, with the app closed. The flow is: install → a sheet asks which
alliance you are in → permission → done. It is asked once; skipping is
remembered, and it can be turned on, switched or turned off later under
**Settings → Event Reminders** (Settings now has a link in the rail; it used to
be reachable only by typing the URL).

**Times and days come from the leader's schedule.** The schedule previously
stored only a time, which is fine to read in a table but not enough to decide
whether to buzz a phone — so `alliance_schedules` gained an `event_days` column
and the Leader Portal gained a day picker per event. Events named for a day
(Vikings Vengeance Tuesday/Thursday) default to that day; everything else
defaults to **every day** and leaders should narrow it, or an event that runs
twice a week will remind the alliance seven times a week.

| Piece | Where |
|---|---|
| Subscriptions, dedupe log, VAPID keys | `push_subscriptions`, `push_sent`, `app_settings` tables |
| Endpoints | `/api/push/key`, `/subscribe`, `/unsubscribe`, `/status` |
| Scheduler | `runReminderTick()` in `server/index.cjs`, every 30s |
| Receiving | the `push` / `notificationclick` handlers in `public/sw.js` |
| Browser side | `src/lib/reminders.js` |
| Screens | `AllianceSetup.jsx` (once), `ReminderSettings.jsx` (Settings) |

The scheduler ticks every 30 seconds — more often than the reminders it has to
hit, so a briefly stalled server still lands inside the right minute — and
`push_sent` is what makes those extra ticks harmless. `/api/push/*` is never
cached by the service worker.

**VAPID keys** are generated once on first run and stored in `app_settings`.
Do not regenerate them: every existing subscription would silently stop working
with nothing appearing to be wrong. Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
to pin them explicitly.

> **iPhone:** web push needs iOS 16.4+ **and** the app added to the Home Screen.
> In a Safari tab it will not work, which is why the setup sheet only appears in
> app mode.

**Seeing app mode without installing.** Add `?appmode=1` to the URL to enter it
in a normal tab, `?appmode=0` to leave. It lasts for the session. Handy for
checking a change to the tab bar without reinstalling on a phone each time.

**What's cached, and what is never cached**

| Request | Behaviour |
|---|---|
| `/api/*` | **Never cached.** Rosters, applications, king status and every logged-in response always come from the server. |
| Build assets (`/assets/*`) and `?v=`-versioned scripts | Cache first, refreshed in the background — their URL changes whenever the file does. |
| Images, fonts, audio | Cache first. |
| Unversioned scripts in `public/` | Network first, cache only as an offline fallback, so a deploy is never served stale. |
| The page itself | Network first, with the cached copy as the offline answer. |

**Deploying a new version.** Nothing extra to do — the running app checks for a
new build hourly and on each launch, and shows a "**A new version is ready →
Reload now**" banner when one is waiting. If you change the caching rules in
`public/sw.js`, bump `CACHE_VERSION` at the top; every cache that doesn't match
is deleted on activation.

**Files involved**

| Path | Purpose |
|---|---|
| `public/manifest.webmanifest` | App name, icons, colours, standalone display, home-screen shortcuts. |
| `public/sw.js` | Service worker — offline support and caching rules. |
| `public/app-icons/` | Generated app icons (192, 512, maskable 512, apple-touch). |
| `src/lib/pwa.js` | Registration, install-prompt capture, update detection. |
| `src/components/InstallPrompt.jsx` | The install and "new version ready" banners. |
| `src/lib/appMode.js` | Detects app mode and stamps `data-app-mode` on `<html>`. |
| `src/components/AppLaunch.jsx` | The launch screen shown in app mode. |
| `src/components/TabBar.jsx` | The bottom tab bar. |
| `src/index.css` (APP MODE section) | The rules that turn off the browser behaviours. |

> **Note:** the service worker is deliberately disabled in dev (`npm run dev`)
> so it can't interfere with hot reload. To test it, run `npm run build` then
> `NODE_ENV=production node server/index.cjs`.

## 7. The chat assistant (Royal Advisor)

The assistant answers from **Gemini**, grounded in the kingdom's own live data.

It previously answered from `getKingdomAnswer()` — roughly 1,900 lines of
hand-written keyword matching that never called a model at all, despite living
behind `/api/ai/chat`. That is good at the questions it anticipated and helpless
at every other one: anything unrecognised got the same forty-bullet "I am not
sure about that" reply, and it could not follow up or answer two things at once.

**The matcher is kept as the fallback.** With no key set, or if the model is
unreachable or times out, the assistant degrades to exactly what it did before
rather than to an error. Responses carry `source: "ai"` or `source: "builtin"`
so you can tell which answered.

**Grounding.** Every question is sent with a freshly built KINGDOM FACTS block —
current ruler, the four alliances and their leaders, each alliance's event
schedule with times and days, upcoming events, news and guide titles, and what
each site page is for. The instruction tells the advisor that this block is the
only source of truth for kingdom specifics, to answer general Kingshot mechanics
from its own knowledge, and to say plainly when it does not know rather than
inventing a time or a name. Schedules are read through the same helper the
reminders and Leader Portal use, so the advisor cannot contradict the Events
page.

**Only public data goes into that block** — no governor IDs, applications,
transfer requests, or anything behind a login, because `/api/ai/chat` takes no
auth.

The last 8 turns are sent with each question, so "and for ICE?" works. History
is filtered to real user/assistant turns and capped, and messages are capped at
1,200 characters. Rate limit is unchanged at 15 questions per IP per minute, and
a request that takes over 12 seconds is abandoned in favour of the matcher.

| Setting | |
|---|---|
| Key | `GEMINI_API_KEY` (already set on the live service) |
| Model | `gemini-flash-latest` |
| Pin the model | edit `GEMINI_MODEL` in `server/index.cjs` |

> Chat now consumes Gemini quota that previously only the 4-hourly agent used.
> If you hit free-tier limits, the visible symptom is answers quietly reverting
> to the old matcher style — check the logs for `[advisor] model returned 429`.

## 8. Backups

Everything the kingdom has is one SQLite file. It is now copied automatically.

**How it works.** A backup is taken when the server starts — a deploy is exactly
when you want a copy of what came before it — and then once a day. Each one is
taken through SQLite's **online backup API**, not by copying the file: the
database runs in WAL mode, so a plain copy taken while the server is serving can
miss the write-ahead log and produce a file that opens fine and is quietly
missing the last writes.

**Every backup is verified before it is kept.** It is written under a temporary
name, opened, run through `PRAGMA integrity_check`, and checked for actual rows.
Only then is it moved into place. A copy that fails is deleted and logged. An
unverified backup is a guess.

**Master Console → Database Backups** lists them with size and age, has a
**Back up now** button, and a **Download** button on each. It warns if the newest
is more than a day and a half old.

> **Download one now and then.** The copies sit on the same disk as the database.
> That survives the common disasters — a bad migration, a mistaken roster upload,
> corruption — but not losing the disk. A copy kept somewhere else is the only one
> that survives everything, and the Download button is what makes that possible.

**To restore:** stop the service, replace the file at `DB_PATH`
(`/var/data/data.db` live) with the backup, renaming it to `data.db`, and start
again. Delete any `data.db-wal` / `data.db-shm` beside it first.

| Setting | Default | |
|---|---|---|
| `BACKUP_DIR` | `backups/` next to the database | Where copies are kept |
| `BACKUP_KEEP` | `14` | How many to keep before pruning oldest |
| `BACKUP_MAX_BYTES` | 300 MB | Total cap, so backups can't fill the 1 GB disk |

Endpoints are admin-only: `GET /api/admin/backups`, `POST /api/admin/backups`,
`GET /api/admin/backups/:name`. The download hands over the entire database,
password hashes included — the filename is pattern-checked and the resolved path
confirmed to sit inside the backup directory.

## 9. Notes

- The app uses **hash-based URL routing** — pages have shareable URLs and browser
  back/forward works.
- Auth uses a `sessionStorage` token that survives refreshes but clears on tab close.
- King status is dynamic and editable by Sparta via the Master Console
  (`/api/king-status`). The king changes every 14 days after Castle Battle.
