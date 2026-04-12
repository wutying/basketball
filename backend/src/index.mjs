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

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    body_part TEXT,
    default_sets INTEGER NOT NULL,
    default_reps INTEGER NOT NULL,
    default_weight REAL NOT NULL,
    duration_value REAL,
    duration_unit TEXT,
    distance_value REAL,
    distance_unit TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS plan_items (
    id TEXT PRIMARY KEY,
    date_key TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT,
    category_id TEXT,
    body_part TEXT,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    duration_value REAL,
    duration_unit TEXT,
    distance_value REAL,
    distance_unit TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_plan_items_date_key ON plan_items(date_key)`,
  `CREATE INDEX IF NOT EXISTS idx_plan_items_exercise_id ON plan_items(exercise_id)`
];

let schemaReady = false;

const OPTIONAL_EXERCISE_COLUMNS = [
  "ALTER TABLE exercises ADD COLUMN duration_value REAL",
  "ALTER TABLE exercises ADD COLUMN duration_unit TEXT",
  "ALTER TABLE exercises ADD COLUMN distance_value REAL",
  "ALTER TABLE exercises ADD COLUMN distance_unit TEXT"
];

const OPTIONAL_PLAN_COLUMNS = [
  "ALTER TABLE plan_items ADD COLUMN exercise_name TEXT",
  "ALTER TABLE plan_items ADD COLUMN category_id TEXT",
  "ALTER TABLE plan_items ADD COLUMN body_part TEXT",
  "ALTER TABLE plan_items ADD COLUMN duration_value REAL",
  "ALTER TABLE plan_items ADD COLUMN duration_unit TEXT",
  "ALTER TABLE plan_items ADD COLUMN distance_value REAL",
  "ALTER TABLE plan_items ADD COLUMN distance_unit TEXT"
];

async function ensureExerciseColumns(env) {
  for (const sql of OPTIONAL_EXERCISE_COLUMNS) {
    try {
      await env.DB.prepare(sql).run();
    } catch (err) {
      const message = String(err?.message || "");
      if (!message.includes("duplicate column name")) throw err;
    }
  }
}

async function ensurePlanColumns(env) {
  for (const sql of OPTIONAL_PLAN_COLUMNS) {
    try {
      await env.DB.prepare(sql).run();
    } catch (err) {
      const message = String(err?.message || "");
      if (!message.includes("duplicate column name")) throw err;
    }
  }
}

async function ensureSchema(env) {
  if (!env.DB || schemaReady) return;
  try {
    for (const sql of CREATE_STATEMENTS) {
      await env.DB.prepare(sql).run();
    }
    await ensureExerciseColumns(env);
    await ensurePlanColumns(env);
  } catch (err) {
    // Recovery path for partially-migrated/broken schemas in existing D1 databases.
    await env.DB.prepare("DROP TABLE IF EXISTS plan_items").run();
    await env.DB.prepare("DROP TABLE IF EXISTS exercises").run();
    await env.DB.prepare("DROP TABLE IF EXISTS categories").run();
    for (const sql of CREATE_STATEMENTS) {
      await env.DB.prepare(sql).run();
    }
    await ensureExerciseColumns(env);
    await ensurePlanColumns(env);
  }
  schemaReady = true;
}

async function loadState(env) {
  if (!env.DB) return memoryState;
  await ensureSchema(env);

  const categoriesRs = await env.DB.prepare(
    "SELECT id, name, color FROM categories ORDER BY name"
  ).all();
  const exercisesRs = await env.DB.prepare(
    `SELECT id, name, category_id, body_part, default_sets, default_reps, default_weight,
            duration_value, duration_unit, distance_value, distance_unit
     FROM exercises
     ORDER BY name`
  ).all();
  const plansRs = await env.DB.prepare(
    `SELECT id, date_key, exercise_id, exercise_name, category_id, body_part, sets, reps, weight,
            duration_value, duration_unit, distance_value, distance_unit
     FROM plan_items
     ORDER BY date_key, created_at`
  ).all();

  const categories = (categoriesRs.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color
  }));

  const exercises = (exercisesRs.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    bodyPart: r.body_part,
    sets: Number(r.default_sets),
    reps: Number(r.default_reps),
    weight: Number(r.default_weight),
    durationValue: r.duration_value === null ? null : Number(r.duration_value),
    durationUnit: r.duration_unit || "",
    distanceValue: r.distance_value === null ? null : Number(r.distance_value),
    distanceUnit: r.distance_unit || ""
  }));

  const dayPlans = {};
  for (const r of plansRs.results || []) {
    if (!dayPlans[r.date_key]) dayPlans[r.date_key] = [];
    dayPlans[r.date_key].push({
      id: r.id,
      exerciseId: r.exercise_id,
      name: r.exercise_name || "",
      categoryId: r.category_id || "",
      bodyPart: r.body_part || "",
      sets: Number(r.sets),
      reps: Number(r.reps),
      weight: Number(r.weight),
      durationValue: r.duration_value === null ? null : Number(r.duration_value),
      durationUnit: r.duration_unit || "",
      distanceValue: r.distance_value === null ? null : Number(r.distance_value),
      distanceUnit: r.distance_unit || ""
    });
  }

  return { categories, exercises, dayPlans };
}

async function saveState(env, state) {
  if (!env.DB) {
    memoryState.categories = state.categories || [];
    memoryState.exercises = state.exercises || [];
    memoryState.dayPlans = state.dayPlans || {};
    return;
  }

  await ensureSchema(env);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM plan_items"),
    env.DB.prepare("DELETE FROM exercises"),
    env.DB.prepare("DELETE FROM categories")
  ]);

  const categories = Array.isArray(state.categories) ? state.categories : [];
  const exercises = Array.isArray(state.exercises) ? state.exercises : [];
  const dayPlans = state.dayPlans && typeof state.dayPlans === "object" ? state.dayPlans : {};

  for (const c of categories) {
    await env.DB.prepare(
      "INSERT INTO categories (id, name, color, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)"
    ).bind(c.id, c.name, c.color || "#2563eb").run();
  }

  const validExerciseIds = new Set();
  for (const e of exercises) {
    await env.DB.prepare(
      `INSERT INTO exercises
      (id, name, category_id, body_part, default_sets, default_reps, default_weight,
       duration_value, duration_unit, distance_value, distance_unit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(
      e.id,
      e.name,
      e.categoryId,
      e.bodyPart ?? null,
      Number(e.sets || 0),
      Number(e.reps || 0),
      Number(e.weight || 0),
      e.durationValue === null || e.durationValue === undefined || e.durationValue === "" ? null : Number(e.durationValue),
      e.durationUnit || null,
      e.distanceValue === null || e.distanceValue === undefined || e.distanceValue === "" ? null : Number(e.distanceValue),
      e.distanceUnit || null
    ).run();
    validExerciseIds.add(e.id);
  }

  for (const [dateKey, items] of Object.entries(dayPlans)) {
    for (const p of items || []) {
      if (!validExerciseIds.has(p.exerciseId)) continue;
      await env.DB.prepare(
        `INSERT INTO plan_items
        (id, date_key, exercise_id, exercise_name, category_id, body_part, sets, reps, weight,
         duration_value, duration_unit, distance_value, distance_unit, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', CURRENT_TIMESTAMP)`
      ).bind(
        p.id,
        dateKey,
        p.exerciseId,
        p.name || null,
        p.categoryId || null,
        p.bodyPart || null,
        Number(p.sets || 0),
        Number(p.reps || 0),
        Number(p.weight || 0),
        p.durationValue === null || p.durationValue === undefined || p.durationValue === "" ? null : Number(p.durationValue),
        p.durationUnit || null,
        p.distanceValue === null || p.distanceValue === undefined || p.distanceValue === "" ? null : Number(p.distanceValue),
        p.distanceUnit || null
      ).run();
    }
  }
}

async function loadAnalytics(env) {
  if (!env.DB) return { rows: [] };
  await ensureSchema(env);

  const rs = await env.DB.prepare(
    `SELECT
      p.date_key,
      e.name AS exercise_name,
      c.name AS category_name,
      p.sets,
      p.reps,
      p.weight,
      (p.sets * p.reps * p.weight) AS total_weight,
      p.notes
    FROM plan_items p
    JOIN exercises e ON e.id = p.exercise_id
    JOIN categories c ON c.id = e.category_id
    ORDER BY p.date_key DESC, e.name ASC
    LIMIT 200`
  ).all();

  const rows = (rs.results || []).map((r) => ({
    date: r.date_key,
    exercise: r.exercise_name,
    category: r.category_name,
    sets: Number(r.sets),
    reps: Number(r.reps),
    weight: Number(r.weight),
    totalWeight: Number(r.total_weight),
    notes: r.notes || ""
  }));

  return { rows };
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

    try {
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

        await saveState(env, payload);
        return json({ ok: true }, 200, origin);
      }

      if (url.pathname === "/api/analytics" && request.method === "GET") {
        const data = await loadAnalytics(env);
        return json({ ok: true, ...data }, 200, origin);
      }

      return json({ ok: false, error: "Not found" }, 404, origin);
    } catch (err) {
      return json({ ok: false, error: "Internal error", detail: String(err?.message || err) }, 500, origin);
    }
  }
};
