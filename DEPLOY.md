# Deploying Kingdom 846 to the Cloud

The app is **Express + SQLite (better-sqlite3) + React**. One Node server serves
both the API and the built site, with a persistent volume for the database so
data survives restarts. It is packaged as a Docker image that runs on any cloud.

## What you need (one-time)

- The app code (this repo / zip).
- A `SESSION_SECRET` — any long random string. The cloud config auto-generates one
  on Render; elsewhere set it as an env var (see below).

Generate a strong secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Quick start — Render (recommended, simplest)

Render supports Node + a persistent disk (SQLite survives) out of the box.

1. Push this repo to GitHub/GitLab.
2. On Render: **New + → Blueprint** → select your repo → it reads `render.yaml`.
3. It creates a web service with a 1 GB persistent disk, a generated
   `SESSION_SECRET`, and a health check on `/api/health`.
4. Deploy. You get `https://kingdom-846.onrender.com` (free custom domain supported).
5. To use `kingdom846.com`: add a CNAME from `kingdom846.com` → your Render URL
   in your domain registrar, then add the domain in Render → Settings → Custom Domains.

`render.yaml` is included — no manual config needed.

## Fly.io (also simple, persistent volumes)

```bash
fly launch --dockerfile Dockerfile
fly volumes create kingdom_data --size 1 --region iad
fly secrets set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# add a [mount] to fly.toml: source="kingdom_data", destination="/data"
fly deploy
```

## AWS

The Docker image runs on any container service. For the SQLite database to
persist, mount an EBS or EFS volume.

- **Easiest:** EC2 instance + the Docker image, with an EBS volume mounted at `/data`.
  Set `DB_PATH=/data/data.db` and `SESSION_SECRET=...`.
- **Managed:** AWS App Runner or ECS Fargate with an EFS access point mounted at `/data`
  (App Runner now supports EFS). Set `DB_PATH=/data/data.db`.
- Build/push the image to Amazon ECR, then deploy:
  ```bash
  aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
  docker build -t kingdom846 .
  docker tag kingdom846 <acct>.dkr.ecr.<region>.amazonaws.com/kingdom846:latest
  docker push <acct>.dkr.ecr.<region>.amazonaws.com/kingdom846:latest
  ```
- Route `kingdom846.com` via Route 53 to your load balancer / CloudFront.

## Microsoft Azure

- **Azure Container Apps** with an Azure Files volume mounted at `/data`.
  Set `DB_PATH=/data/data.db`, `SESSION_SECRET=...`, `PORT=5000`.
- Or an Azure VM (Ubuntu) running the Docker image with a managed disk at `/data`.
- Push the image to Azure Container Registry, then deploy to Container Apps.

## Google Cloud

- **Cloud Run** with a volume (Cloud Run supports persistent volumes / Cloud Storage
  mounts). Mount at `/data`, set `DB_PATH=/data/data.db`.
- Or a Compute Engine VM (e2-small) running the Docker image with a persistent disk.
- Push to Artifact Registry, deploy to Cloud Run.

## DigitalOcean

- **App Platform** with a persistent volume component mounted at `/data`.
  Or a Droplet with a volume block storage at `/data`.

## Vercel (custom domain) — frontend only

Vercel is serverless, so it cannot run the Express+SQLite backend persistently.
If you want the frontend on Vercel + `kingdom846.com`:
- Deploy the static frontend (`dist/`) to Vercel for the custom domain.
- Move the backend + database to a managed store: either a persistent-host
  container (above) or switch the SQLite layer to **Turso** (libSQL) / managed
  Postgres so a serverless API can reach it.
This is a larger change — ask and I'll wire it up.

## Environment variables (all clouds)

| Var | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | signs auth tokens (auto-generated on Render) |
| `DB_PATH` | yes (cloud) | path to the SQLite file inside the persistent volume, e.g. `/data/data.db` |
| `PORT` | no | defaults to 5000; most clouds set this |
| `NODE_ENV` | no | set to `production` to serve the built frontend |

## Health check

`GET /api/health` returns `{"ok":true,...}` — use it as the cloud health check path.

## After first deploy: change the default passwords

Log in as Sparta (`sparta` / `SpartaAdmin_846!`) → Master Console → reset every
leader and your own admin password. Default credentials are only meant for first login.
