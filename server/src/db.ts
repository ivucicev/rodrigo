import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'pool.sqlite3');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEFAULT_POOL_ID = 'default';

db.exec(`
  CREATE TABLE IF NOT EXISTS water_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pool_id TEXT,
    ph REAL NOT NULL,
    free_chlorine REAL NOT NULL,
    total_alkalinity REAL NOT NULL,
    temperature REAL,
    temp_unit TEXT NOT NULL DEFAULT 'F',
    notes TEXT NOT NULL DEFAULT '',
    record_date TEXT NOT NULL,
    record_time TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chemical_additions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES water_tests(id) ON DELETE CASCADE,
    chemical TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    pool_id TEXT,
    phase INTEGER NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    recurrence_hours REAL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chemicals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    form TEXT NOT NULL,
    concentration_pct REAL,
    tablet_weight_g REAL,
    tablet_concentration_pct REAL,
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS pools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    volume_liters REAL NOT NULL
  );
`);

// --- migration: pre-multi-pool databases won't have pool_id columns yet ---
function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('water_tests', 'pool_id', 'TEXT');
ensureColumn('chores', 'pool_id', 'TEXT');

const existingDefaultPool = db.prepare('SELECT id FROM pools WHERE id = ?').get(DEFAULT_POOL_ID);
if (!existingDefaultPool) {
  const legacyVolumeRow = db.prepare("SELECT value FROM settings WHERE key = 'poolVolumeLiters'").get() as
    | { value: string }
    | undefined;
  const initialVolume = legacyVolumeRow ? Number(legacyVolumeRow.value) : 56800;
  db.prepare('INSERT INTO pools (id, name, volume_liters) VALUES (?, ?, ?)').run(DEFAULT_POOL_ID, 'My Pool', initialVolume);
}

db.prepare('UPDATE water_tests SET pool_id = ? WHERE pool_id IS NULL').run(DEFAULT_POOL_ID);
db.prepare('UPDATE chores SET pool_id = ? WHERE pool_id IS NULL').run(DEFAULT_POOL_ID);

interface ChoreTemplate {
  key: string;
  phase: number;
  label: string;
  description: string;
  recurrenceHours: number | null;
}

const CHORE_TEMPLATES: ChoreTemplate[] = [
  { key: 'p1-alkalinity', phase: 1, label: 'Balance Total Alkalinity first', description: 'Adjust TA into the 80-120 ppm range before touching pH. Correct alkalinity buffers pH so it stops bouncing after every addition.', recurrenceHours: null },
  { key: 'p1-ph-lower', phase: 1, label: 'Correct pH before chlorinating', description: 'If pH sits above 7.8, lower it now. High pH cuts chlorine sanitizing efficiency roughly in half, so this must happen before Phase 2.', recurrenceHours: null },
  { key: 'p2-sanitize', phase: 2, label: 'Check & dose Free Chlorine', description: 'Bring Free Chlorine into the 2.0-4.0 ppm ideal band using the calculated dosage.', recurrenceHours: null },
  { key: 'p3-circulate', phase: 3, label: 'Run pump circulation post-addition', description: 'Run the pump/filter a minimum of 6-8 hours after any chemical addition to fully disperse and dissolve.', recurrenceHours: null },
  { key: 'p3-safety', phase: 3, label: 'Observe safety swim wait period', description: 'Do not allow swimmers back in until chemicals are fully circulated and levels retest safe (typically 30 min - few hrs depending on additive).', recurrenceHours: null },
  { key: 'p4-skim', phase: 4, label: 'Skim water surface', description: 'Remove floating debris from the surface.', recurrenceHours: 24 },
  { key: 'p4-baskets', phase: 4, label: 'Empty skimmer/pump baskets', description: 'Clear skimmer and pump strainer baskets of debris.', recurrenceHours: 72 },
  { key: 'p4-vacuum', phase: 4, label: 'Vacuum pool', description: 'Vacuum the pool floor to remove settled debris and fine sediment.', recurrenceHours: 168 },
  { key: 'p4-brush', phase: 4, label: 'Brush pool walls & steps', description: 'Brush walls, steps, and corners to prevent algae buildup.', recurrenceHours: 168 },
  { key: 'p4-filter', phase: 4, label: 'Check/clean filter pressure', description: 'Check filter pressure gauge and backwash/clean if above baseline +8-10 psi.', recurrenceHours: 336 },
  { key: 'p4-backwash', phase: 4, label: 'Backwash & rinse filter', description: 'Backwash the filter (sand/DE) or hose down cartridge media to clear trapped debris and restore flow.', recurrenceHours: 336 },
  { key: 'p5-retest', phase: 5, label: 'Retest water chemistry', description: 'Log a fresh water test to confirm all parameters landed in range after maintenance.', recurrenceHours: null },
];

const insertChore = db.prepare(
  'INSERT OR IGNORE INTO chores (id, pool_id, phase, label, description, recurrence_hours, completed_at) VALUES (@id, @poolId, @phase, @label, @description, @recurrenceHours, NULL)'
);
const insertManyChores = db.transaction((rows: (ChoreTemplate & { id: string; poolId: string })[]) => {
  for (const row of rows) insertChore.run(row);
});

export function seedChoresForPool(poolId: string) {
  const rows = CHORE_TEMPLATES.map((t) => ({
    ...t,
    id: poolId === DEFAULT_POOL_ID ? t.key : `${poolId}:${t.key}`,
    poolId,
  }));
  insertManyChores(rows);
}

seedChoresForPool(DEFAULT_POOL_ID);

const settingsDefaults: Record<string, string> = {
  unitSystem: 'metric',
  activePoolId: DEFAULT_POOL_ID,
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(settingsDefaults)) {
  insertSetting.run(key, value);
}

interface ChemicalSeed {
  id: string;
  name: string;
  role: string;
  form: string;
  concentrationPct: number | null;
  tabletWeightG: number | null;
  tabletConcentrationPct: number | null;
  notes: string;
}

const CHEMICAL_SEED: ChemicalSeed[] = [
  { id: 'seed-baking-soda', name: 'Baking Soda', role: 'raise_alkalinity', form: 'powder', concentrationPct: 100, tabletWeightG: null, tabletConcentrationPct: null, notes: '' },
  { id: 'seed-soda-ash', name: 'Soda Ash', role: 'raise_ph', form: 'powder', concentrationPct: 100, tabletWeightG: null, tabletConcentrationPct: null, notes: '' },
  { id: 'seed-muriatic-acid', name: 'Muriatic Acid', role: 'lower_ph', form: 'liquid', concentrationPct: 31.45, tabletWeightG: null, tabletConcentrationPct: null, notes: '' },
  { id: 'seed-liquid-chlorine', name: 'Liquid Chlorine', role: 'raise_chlorine', form: 'liquid', concentrationPct: 12.5, tabletWeightG: null, tabletConcentrationPct: null, notes: '' },
];

const chemicalSeedCount = db.prepare('SELECT COUNT(*) as c FROM chemicals').get() as { c: number };
if (chemicalSeedCount.c === 0) {
  const insertChemical = db.prepare(
    `INSERT INTO chemicals (id, name, role, form, concentration_pct, tablet_weight_g, tablet_concentration_pct, notes)
     VALUES (@id, @name, @role, @form, @concentrationPct, @tabletWeightG, @tabletConcentrationPct, @notes)`
  );
  const insertManyChemicals = db.transaction((rows: ChemicalSeed[]) => {
    for (const row of rows) insertChemical.run(row);
  });
  insertManyChemicals(CHEMICAL_SEED);
}
