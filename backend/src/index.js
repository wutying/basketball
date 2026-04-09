function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

const memoryState = {
  categories: [],
  exercises: [],
  dayPlans: {}
};

let schemaReady = false;

async function ensureSchema(env) {
  if (!env.DB || schemaReady) return;
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO app_state (id, state_json) VALUES (1, ?)"
  ).bind(JSON.stringify({ categories: [], exercises: [], dayPlans: {} })).run();
  schemaReady = true;
}

async function loadState(env) {
  if (!env.DB) return memoryState;
  await ensureSchema(env);
async function loadState(env) {
  if (!env.DB) return memoryState;
  const row = await env.DB.prepare("SELECT state_json FROM app_state WHERE id = 1").first();
  if (!row) return { categories: [], exercises: [], dayPlans: {} };
  try {
    return JSON.parse(row.state_json);
  } catch {
    return { categories: [], exercises: [], dayPlans: {} };
  }
}

async function saveState(env, state) {
  if (!env.DB) {
    memoryState.categories = state.categories || [];
    memoryState.exercises = state.exercises || [];
    memoryState.dayPlans = state.dayPlans || {};
    return;
  }
  await ensureSchema(env);

  await env.DB.prepare(
    `INSERT INTO app_state (id, state_json, updated_at)
     VALUES (1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       state_json = excluded.state_json,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(JSON.stringify(state)).run();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "training-planner-api", date: new Date().toISOString() }, 200, origin);
    }

    if (url.pathname === "/api/state" && request.method === "GET") {
      const state = await loadState(env);
      return json({ ok: true, state }, 200, origin);
    }

    if (url.pathname === "/api/state" && request.method === "PUT") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON body" }, 400, origin);
      }

      const nextState = {
        categories: Array.isArray(payload.categories) ? payload.categories : [],
        exercises: Array.isArray(payload.exercises) ? payload.exercises : [],
        dayPlans: payload.dayPlans && typeof payload.dayPlans === "object" ? payload.dayPlans : {}
      };

      await saveState(env, nextState);
      return json({ ok: true }, 200, origin);
    }

    return json({ ok: false, error: "Not found" }, 404, origin);
  }
};
