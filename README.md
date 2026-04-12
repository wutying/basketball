# basketball / Training Planner

Cloudflare-ready fullstack prototype for training planning.

## Files
- `ui-mockup.html`: Frontend planner (drag/drop, day drawer, category management, API sync)
- `analytics-standalone.html`: Standalone analytics page
- `backend/`: Cloudflare Workers API + D1 migration
- `schema.sql`: D1 normalized schema (categories / exercises / plan_items)
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

Worker backend will auto-create `categories` / `exercises` / `plan_items` tables on first API request if D1 is bound but migration wasn't run yet.

When applying schema, execute the whole SQL file (migration command) instead of copying a single `CREATE INDEX` statement, otherwise you may hit `no such table: main.plan_items`.

Current Pages URL:

`https://basketball-bjb.pages.dev/ui-mockup`

Pages rewrites are configured in `_redirects` so extensionless routes map to HTML files.
