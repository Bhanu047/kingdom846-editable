# Kingdom 791 — Standalone War Room

Independent client application extracted from the Kingdom 846 rally console. **No connection to Kingdom 846's production server, credentials, API or database.** This folder is the only project to deploy.

## Accounts
- **spartan**: separate owner account, created on first boot from `ADMIN_PASSWORD`.
- **poofy, charles, jakey, polar, erika**: five member accounts. They are seeded with random undisclosed passwords and cannot sign in until the owner assigns passwords in the Admin Console.
- Alliance labels are editable by the owner; all five members use the same client room and share the rally roster.
- Members may change their own password through API `POST /api/me/password` (owner UI supports this; members can ask owner to reset theirs).
- All six accounts are isolated from the original Kingdom 846 project.

## Develop
Requires Node 20+. From `standalone/`:

```bash
npm install
ADMIN_PASSWORD='replace-with-a-unique-strong-password' npm run dev
```
For live API, separately run `ADMIN_PASSWORD='...' npm start` in another terminal; dev server proxies `/api` to port 5000 only if `PORT=5000` is set on the backend.
For a built app: `npm run build && ADMIN_PASSWORD='...' npm start`.

## Production deployment
Render Blueprint `standalone/render.yaml` or configure a Node web service with root directory `standalone`, build `npm install && npm run build`, start `npm start`, and set a **persistent disk** mounted to `/var/data`, with `DB_PATH=/var/data/kingdom791.db`. Add a strong `ADMIN_PASSWORD` as a secret before the first boot. **Do not deploy on ephemeral storage.** The SQLite database is unique to this app. For best isolation host on a distinct service and domain; never reuse Kingdom 846 env vars, disk or route to its API.

## Theme
Use `public/crest.png` and `public/war-banner.png` for the client crest and banner. You may replace them with Kingdom 791-approved artwork.
