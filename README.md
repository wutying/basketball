# basketball / Training Planner

Cloudflare-ready fullstack prototype for training planning.

## Files
- `ui-mockup.html`: Frontend planner (drag/drop, day drawer, category management, API sync)
- `analytics-standalone.html`: Standalone analytics page
- `backend/`: Cloudflare Workers API + D1 migration
- `DEPLOY_CLOUDFLARE.md`: End-to-end deployment steps (GitHub -> Pages + Workers)

## Quick start (backend)
```bash
cd backend
npm install
npx wrangler login
npx wrangler dev
```

## Frontend API mode
Open `ui-mockup.html` with query param:

`?apiBase=https://<your-worker>.workers.dev`

Example:

`https://<your-pages-domain>/?apiBase=https://training-planner-api.<subdomain>.workers.dev`

If `apiBase` is not provided, frontend uses local demo state.

