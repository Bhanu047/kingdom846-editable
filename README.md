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
| `GET  /api/admin/leaders` | List 4 leaders (admin only). |
| `PATCH /api/admin/leaders/:id/credentials` | Reset a leader's password (admin only). |

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

### Default seeded credentials

Default credentials are seeded in `server/index.cjs` in the `SEED` array.
**Change all default passwords immediately after first deployment** via the
in-app credential management (see below).

| Account | Role | Access |
|---|---|---|
| Sparta (admin) | admin | Full control, Master Console, reset leaders |
| [RYO] leader | leader | Leader login + roster upload |
| [KzK] leader | leader | Leader login + roster upload |
| [SAS] leader | leader | Leader login + roster upload |
| [ICE] leader | leader | Leader login + roster upload |

### How to change your admin (Sparta) username & password

**Easiest — in the app (no code):**
1. Click **Royal Access** (sidebar bottom).
2. Log in with the current admin credentials.
3. Open the **Master** page (Master Console).
4. Use the **"My Sparta Login"** form → enter current password + new username + new password → Save.

**Or — in code:** edit the `SEED` array in `server/index.cjs`, then restart
the server (delete `data.db` first if you want the new seed to re-apply).

### How to add / change alliance leader logins

**In the app (Sparta resets them — leaders cannot change their own):**
1. Log in as Sparta via **Royal Access**.
2. Open **Master Console** → "Alliance Leaders" list.
3. Click **Reset** next to a leader → set a new username + password → Save.
   (If a leader forgets their password, Sparta resets it here and gives the
   leader the new credentials.)

**Or — in code:** edit the `SEED` array in `server/index.cjs` (each leader has
`role: 'leader'` and an `allianceSlug`), then restart (delete `data.db` to re-seed).

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

## 7. Notes

- The app uses **hash-based URL routing** — pages have shareable URLs and browser
  back/forward works.
- Auth uses a `sessionStorage` token that survives refreshes but clears on tab close.
- King status is dynamic and editable by Sparta via the Master Console
  (`/api/king-status`). The king changes every 14 days after Castle Battle.
