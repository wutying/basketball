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

> 請一次執行「整份 SQL 檔」，不要只複製單行 `CREATE INDEX ...`。  
> 若只執行 index 那一行，會出現 `no such table: main.plan_items`（因為資料表尚未建立）。

或直接用 repo 根目錄的 `schema.sql`：

```bash
npx wrangler d1 execute training_planner --file=../schema.sql
```

> 備註：目前 Worker 已內建自動初始化 `categories / exercises / plan_items` 資料表（第一次呼叫 API 會自動建立）。  
> migration 仍建議保留執行，便於環境一致化與後續版本管理。

部署 Worker：

```bash
npx wrangler deploy
```

## 3. 前端串 API
目前 `ui-mockup.html` 已固定連到：

`https://training-planner-api.im791196.workers.dev`

前端會直接使用 `/api/state` 與後端同步，不需要再輸入 API URL。

## 4. 目前專案已知正式網址
- 前端 Pages: `https://basketball-bjb.pages.dev/ui-mockup`
- 後端 Worker（預設）: `https://training-planner-api.im791196.workers.dev`

> 若要使用無副檔名網址（例如 `/ui-mockup`），請保留 `_redirects` 設定：
> `/ui-mockup /ui-mockup.html 200`
