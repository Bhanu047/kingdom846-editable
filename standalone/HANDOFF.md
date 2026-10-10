# Kingdom 791 standalone War Room — continuation checkpoint

## Source of truth
GitHub private repo: `Bhanu047/kingdom846-editable`
Git branch: `kingdom791-standalone-warroom`
Project root: `standalone/`
Original production `main` branch/Kingdom 846 website MUST remain unchanged.

## Requirements confirmed with user
Create a completely separate Kingdom 791 War Room inspired by the existing Kingdom 846 War Room. Exactly five client member accounts: Poofy, Charles, Jakey, Polar, Erika. One additional owner admin: Spartan (`spartan`). The five client accounts share one Kingdom 791 roster, synchronized rally timings, groups, castle/turret assignments, and save-conflict detection, but MUST NEVER sync with Kingdom 846. Client members can enter their alliance tags/names and change passwords. Owner can reset all five client passwords and manage their alliance names. Kingdom 791 look and feel: fantasy navy/gold/icy blue, crowned heraldic crest and personalized fantasy avatars. User has separate generated PNG asset ZIP titled `Kingdom_791_Theme_Assets.zip`, containing `crest.png`, `war-banner.png`, and PNGs for all six avatars.

## Implemented in Git branch
- Standalone React/Vite frontend and Express/SQLite backend in `standalone/`.
- Independent DB configured by `DB_PATH`; no reference to Kingdom 846 API or production DB.
- Owner password created on fresh deployment using `ADMIN_PASSWORD` env secret (minimum 12 chars). Owner username `spartan`.
- Five members provisioned with unrecoverable random credentials; owner must set their initial passwords using Admin Console.
- Private cookie sessions, hashed passwords, guarded API, login throttle, versioned shared roster.
- Owner dashboard to manage alliances/reset client passwords.
- My Profile screen for alliance and self password changes.
- Existing synchronized rally console, roster, march visualizations, and group logic copied from 846.
- Built-in SVG fallback theme `public/crest.svg`, `public/war-banner.svg`, `public/avatars/{spartan,poofy,charles,jakey,polar,erika}.svg`.
- High-detail PNGs are in ZIP delivered separately; to integrate: put them in `standalone/public/avatars`, plus crest/banner in `standalone/public`, then switch URLs in `src/App.jsx` and `src/pages/WarRoom.jsx` to PNG names.

## Remaining steps — IMPORTANT, not yet verified
1. Clone the branch and enter `standalone/`.
2. Run `npm install` and `npm run build`. Fix any JSX/CSS/compiler issues. Run the API with a temporary strong `ADMIN_PASSWORD` and unique local `DB_PATH`. Correct frontend/backend dev proxy if needed.
3. Test first boot owner login, five seeded users, owner assigning passwords, five member login, password and alliance editing, access to admin protected routes, two-browser roster synchronization, version conflict response, clock/rally operations, and logout. Run security smoke tests.
4. Integrate downloadable high-detail PNG crest, banner and 6 profile portraits from `Kingdom_791_Theme_Assets.zip` if available in your tool environment. Existing SVGs ensure no broken visual dependencies meanwhile.
5. Inspect mobile/desktop layout, improve branding and check no hard-coded RYO/KzK/SAS/846 labels remain.
6. Deploy as a **new**, independently provisioned Render service, not Kingdom 846's service. Set root directory `standalone`, build `npm install && npm run build`, start `npm start`. Set `ADMIN_PASSWORD`, `DB_PATH=/var/data/kingdom791.db`, and a dedicated persistent disk at `/var/data`. Render persistent disks generally require a paid instance; obtain user approval on pricing and specific Render workspace/service before provisioning.
7. Confirm public URL, TLS, login tests, persistence after restart, and original Kingdom 846 unchanged.
8. Return new URL and owner login username; **never print passwords**, store in the deployment's secure environment.

## Continuation request for any assistant
Continue from this checkpoint; do not rebuild from scratch. First inspect current Git branch, validate/build, repair bugs, integrate PNG assets, then propose deploy plan. Never alter main or Kingdom 846 production server/database. Do not commit credentials to Git. Do not claim deployment exists until verified.
