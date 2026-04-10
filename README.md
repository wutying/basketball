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
`ui-mockup.html` is now hard-wired to:

`https://training-planner-api.im791196.workers.dev`

No URL input/query parameter is required.

Worker backend will auto-create the `app_state` table on first API request if D1 is bound but migration wasn't run yet.
Open `ui-mockup.html` with query param:

`?apiBase=https://<your-worker>.workers.dev`

Example:

`https://<your-pages-domain>/?apiBase=https://training-planner-api.<subdomain>.workers.dev`

If `apiBase` is not provided, frontend uses local demo state.

Current Pages URL:

`https://basketball-bjb.pages.dev/ui-mockup`

Pages rewrites are configured in `_redirects` so extensionless routes map to HTML files.
