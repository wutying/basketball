# Cloudflare 部署教學（前後端）

> 日期：2026-04-08

## 1. 前端（Pages）
1. 將 `ui-mockup.html`、`analytics-standalone.html` 放到 GitHub repo。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. Build 設定（靜態站）：
   - Build command: `exit 0`
   - Output directory: `/`
4. Deploy 後取得 Pages 網址。

## 2. 後端（Workers + D1）
在 `backend/` 目錄執行：

```bash
npm install
npx wrangler login
npx wrangler d1 create training_planner
```

把建立後回傳的 `database_id` 貼到 `backend/wrangler.toml`。

執行 migration：

```bash
npx wrangler d1 execute training_planner --file=./migrations/0001_init.sql
```

部署 Worker：

```bash
npx wrangler deploy
```

## 3. 前端串 API
部署前端時，建議把 API base 設成：

`https://<your-worker-subdomain>.workers.dev`

頁面可用網址參數指定：

`https://<pages-domain>/?apiBase=https://<worker-domain>`

系統會用 `/api/state` 做讀寫。
