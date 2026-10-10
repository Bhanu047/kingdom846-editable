# Kingdom 791 — Standalone War Room

Independent client application extracted from the Kingdom 846 rally console. **No connection to Kingdom 846's production server, credentials, API or database.** This folder is the only project to deploy.

## Accounts
- **spartan**: separate owner account, created on first boot from `ADMIN_PASSWORD`.
- **poofy, charles, jakey, polar, erika**: five member accounts. They are seeded with random undisclosed passwords and cannot sign in until the owner assigns passwords in the Admin Console.
- Alliance labels are editable by the owner; all five members use the same client room and share the rally roster.
- Members can edit their alliance label and change their password in **My Profile**. The owner can manage the five accounts, reset their credentials, and edit alliance labels in **Admin Console**.
- All six accounts are isolated from the original Kingdom 846 project.

## Develop
Requires Node 20+. From `standalone/`:

```bash
npm install
ADMIN_PASSWORD='replace-with-a-unique-strong-password' npm start
```
In a second terminal run `npm run dev` for hot-reloaded development. Vite proxies `/api` to the standalone backend on port 10000.
For a built app: `npm run build && ADMIN_PASSWORD='...' npm start`.

## Production deployment
Render Blueprint `standalone/render.yaml` or configure a Node web service with root directory `standalone`, build `npm install && npm run build`, start `npm start`, and set a **persistent disk** mounted to `/var/data`, with `DB_PATH=/var/data/kingdom791.db`. Add a strong `ADMIN_PASSWORD` as a secret before the first boot. **Do not deploy on ephemeral storage.** The SQLite database is unique to this app. For best isolation host on a distinct service and domain; never reuse Kingdom 846 env vars, disk or route to its API.

## Theme
Built-in theme: `public/crest.svg`, `public/war-banner.svg`, and six themed SVG profile shields in `public/avatars/`. The optional downloadable high-detail Kingdom 791 theme pack has six fantasy portrait PNGs. To use the PNG portraits, copy them to `public/avatars/` and switch the `avatar()` helper in `src/App.jsx` from `.svg` to `.png`. The art is a fantasy concept, not an image of the actual users.

## Security and deployment notes

Do not use the Kingdom 846 Render service, disk, domain or environment variables. The application must run as **a separate new Render service** with the Kingdom 791 project root and its own persistent `DB_PATH`. No client password is committed. The owner supplies `ADMIN_PASSWORD` as an environment secret, logs in as `spartan`, then assigns strong initial passwords for Poofy, Charles, Jakey, Polar and Erika. Each can then change their own password.

The standalone version has no signup route: exactly six provisioned accounts (five client members plus the owner). It includes the existing rally grouping, synchronized call times, approach visualization, and shared roster conflict handling.

## Verify before deployment

From `standalone/`, run `npm install && npm run build && npm test`. The integration suite starts the application on a temporary port and writes to a throwaway database. A passing test run is required before any user credentials are distributed or the service is deployed. Do not mark deployment as successful until a fresh Render persistent database survives a restart and the five member accounts can log in independently.
