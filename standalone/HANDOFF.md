# Kingdom 791 War Room: current state

- Live: https://kingdom791-war-room.onrender.com/ (Render Free, branch `kingdom791-standalone-warroom`, auto deploy).
- Database: independent Neon Free PostgreSQL (project `kingdom791-war-room`), connected through the server-side `DATABASE_URL` env var on Render. SQLite is only a local-dev fallback.
- Never modify `main` or the Kingdom 846 service/database.
- Artwork: raster WEBP in `public/art/` (lion crest, war scenes, three alliance emblems, six portraits). No SVG art.
- Password policy: members need 12+ characters. `ADMIN_PASSWORD` is bootstrap-only (11+); rotate it in-app after first login.
- Accounts: owner `spartan` plus `poofy`, `charles`, `jakey`, `polar`, `erika`.
- Do not use `render.yaml` disks (paid).
