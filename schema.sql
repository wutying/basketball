CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  body_part TEXT NOT NULL,
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
);

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  date_key TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX IF NOT EXISTS idx_plan_items_date_key ON plan_items(date_key);
CREATE INDEX IF NOT EXISTS idx_plan_items_exercise_id ON plan_items(exercise_id);
