import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { db, DEFAULT_POOL_ID, seedChoresForPool } from './db.js';
import type { WaterTestRow, ChemicalAdditionRow, ChoreRow, SettingsRow, ChemicalRow, ChemicalRole, ChemicalForm, PoolRow } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// ---------- Water tests ----------

function loadTest(id: number): WaterTestRow | undefined {
  const row = db
    .prepare(
      `SELECT id, pool_id as poolId, ph, free_chlorine as freeChlorine, total_alkalinity as totalAlkalinity,
              temperature, temp_unit as tempUnit, notes, record_date as recordDate,
              record_time as recordTime, created_at as createdAt
       FROM water_tests WHERE id = ?`
    )
    .get(id) as Omit<WaterTestRow, 'additions'> | undefined;
  if (!row) return undefined;
  const additions = db
    .prepare('SELECT id, test_id as testId, chemical, amount, unit FROM chemical_additions WHERE test_id = ?')
    .all(id) as ChemicalAdditionRow[];
  return { ...row, additions };
}

app.get('/api/tests', (req, res) => {
  const poolId = String(req.query.poolId || DEFAULT_POOL_ID);
  const ids = db
    .prepare('SELECT id FROM water_tests WHERE pool_id = ? ORDER BY record_date DESC, record_time DESC, id DESC')
    .all(poolId) as { id: number }[];
  const tests = ids.map((r) => loadTest(r.id));
  res.json(tests);
});

app.post('/api/tests', (req, res) => {
  const { poolId, ph, freeChlorine, totalAlkalinity, temperature, tempUnit, notes, recordDate, recordTime, additions } = req.body as {
    poolId?: string;
    ph: number;
    freeChlorine: number;
    totalAlkalinity: number;
    temperature: number | null;
    tempUnit: 'F' | 'C';
    notes?: string;
    recordDate: string;
    recordTime: string;
    additions?: { chemical: string; amount: number; unit: string }[];
  };

  if (typeof ph !== 'number' || typeof freeChlorine !== 'number' || typeof totalAlkalinity !== 'number' || !recordDate || !recordTime) {
    res.status(400).json({ error: 'ph, freeChlorine, totalAlkalinity, recordDate, recordTime are required' });
    return;
  }

  const insertTest = db.prepare(
    `INSERT INTO water_tests (pool_id, ph, free_chlorine, total_alkalinity, temperature, temp_unit, notes, record_date, record_time, created_at)
     VALUES (@poolId, @ph, @freeChlorine, @totalAlkalinity, @temperature, @tempUnit, @notes, @recordDate, @recordTime, @createdAt)`
  );
  const info = insertTest.run({
    poolId: poolId || DEFAULT_POOL_ID,
    ph,
    freeChlorine,
    totalAlkalinity,
    temperature: temperature ?? null,
    tempUnit: tempUnit ?? 'F',
    notes: notes ?? '',
    recordDate,
    recordTime,
    createdAt: new Date().toISOString(),
  });

  const testId = Number(info.lastInsertRowid);
  if (additions?.length) {
    const insertAddition = db.prepare('INSERT INTO chemical_additions (test_id, chemical, amount, unit) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((rows: typeof additions) => {
      for (const a of rows) insertAddition.run(testId, a.chemical, a.amount, a.unit);
    });
    insertMany(additions);
  }

  res.status(201).json(loadTest(testId));
});

// ---------- Chores ----------

app.get('/api/chores', (req, res) => {
  const poolId = String(req.query.poolId || DEFAULT_POOL_ID);
  const rows = db
    .prepare(
      `SELECT id, pool_id as poolId, phase, label, description, recurrence_hours as recurrenceHours, completed_at as completedAt
       FROM chores WHERE pool_id = ? ORDER BY phase ASC, id ASC`
    )
    .all(poolId) as ChoreRow[];
  res.json(rows);
});

app.post('/api/chores/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body as { completed: boolean };
  const completedAt = completed ? new Date().toISOString() : null;
  const result = db.prepare('UPDATE chores SET completed_at = ? WHERE id = ?').run(completedAt, id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'chore not found' });
    return;
  }
  const row = db
    .prepare(
      `SELECT id, pool_id as poolId, phase, label, description, recurrence_hours as recurrenceHours, completed_at as completedAt
       FROM chores WHERE id = ?`
    )
    .get(id) as ChoreRow;
  res.json(row);
});

// ---------- Settings ----------

function readSettings(): SettingsRow {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return {
    unitSystem: (settings.unitSystem as 'metric' | 'imperial') ?? 'metric',
    activePoolId: settings.activePoolId ?? DEFAULT_POOL_ID,
  };
}

app.get('/api/settings', (_req, res) => {
  res.json(readSettings());
});

const putSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

app.put('/api/settings', (req, res) => {
  const body = req.body as Partial<SettingsRow>;
  if (body.unitSystem === 'metric' || body.unitSystem === 'imperial') putSetting.run('unitSystem', body.unitSystem);
  if (typeof body.activePoolId === 'string' && body.activePoolId) {
    const pool = db.prepare('SELECT id FROM pools WHERE id = ?').get(body.activePoolId);
    if (!pool) {
      res.status(400).json({ error: 'unknown pool' });
      return;
    }
    putSetting.run('activePoolId', body.activePoolId);
  }
  res.json(readSettings());
});

// ---------- Pools ----------

function loadPool(id: string): PoolRow | undefined {
  return db.prepare('SELECT id, name, volume_liters as volumeLiters FROM pools WHERE id = ?').get(id) as PoolRow | undefined;
}

app.get('/api/pools', (_req, res) => {
  const rows = db.prepare('SELECT id, name, volume_liters as volumeLiters FROM pools ORDER BY rowid ASC').all() as PoolRow[];
  res.json(rows);
});

app.post('/api/pools', (req, res) => {
  const { name, volumeLiters } = req.body as { name?: string; volumeLiters?: number };
  if (!name?.trim() || typeof volumeLiters !== 'number' || volumeLiters <= 0) {
    res.status(400).json({ error: 'name and a positive volumeLiters are required' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO pools (id, name, volume_liters) VALUES (?, ?, ?)').run(id, name.trim(), volumeLiters);
  seedChoresForPool(id);
  res.status(201).json(loadPool(id));
});

app.put('/api/pools/:id', (req, res) => {
  const { id } = req.params;
  const existing = loadPool(id);
  if (!existing) {
    res.status(404).json({ error: 'pool not found' });
    return;
  }
  const body = req.body as Partial<PoolRow>;
  const name = body.name?.trim() || existing.name;
  const volumeLiters = typeof body.volumeLiters === 'number' && body.volumeLiters > 0 ? body.volumeLiters : existing.volumeLiters;
  db.prepare('UPDATE pools SET name = ?, volume_liters = ? WHERE id = ?').run(name, volumeLiters, id);
  res.json(loadPool(id));
});

app.delete('/api/pools/:id', (req, res) => {
  const { id } = req.params;
  const count = db.prepare('SELECT COUNT(*) as c FROM pools').get() as { c: number };
  if (count.c <= 1) {
    res.status(400).json({ error: 'cannot delete the last remaining pool' });
    return;
  }
  const result = db.prepare('DELETE FROM pools WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'pool not found' });
    return;
  }
  db.prepare('DELETE FROM water_tests WHERE pool_id = ?').run(id);
  db.prepare('DELETE FROM chores WHERE pool_id = ?').run(id);

  const activePoolRow = db.prepare("SELECT value FROM settings WHERE key = 'activePoolId'").get() as { value: string } | undefined;
  if (activePoolRow?.value === id) {
    const fallback = db.prepare('SELECT id FROM pools ORDER BY rowid ASC LIMIT 1').get() as { id: string };
    putSetting.run('activePoolId', fallback.id);
  }
  res.status(204).send();
});

// ---------- Chemicals ----------

const CHEMICAL_ROLES: ChemicalRole[] = ['raise_alkalinity', 'raise_ph', 'lower_ph', 'raise_chlorine', 'algaecide', 'other'];
const CHEMICAL_FORMS: ChemicalForm[] = ['liquid', 'powder', 'tablet', 'granule'];

function loadChemical(id: string): ChemicalRow | undefined {
  return db
    .prepare(
      `SELECT id, name, role, form, concentration_pct as concentrationPct, tablet_weight_g as tabletWeightG,
              tablet_concentration_pct as tabletConcentrationPct, notes
       FROM chemicals WHERE id = ?`
    )
    .get(id) as ChemicalRow | undefined;
}

app.get('/api/chemicals', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, role, form, concentration_pct as concentrationPct, tablet_weight_g as tabletWeightG,
              tablet_concentration_pct as tabletConcentrationPct, notes
       FROM chemicals ORDER BY rowid ASC`
    )
    .all() as ChemicalRow[];
  res.json(rows);
});

app.post('/api/chemicals', (req, res) => {
  const body = req.body as Partial<ChemicalRow>;
  if (!body.name?.trim() || !CHEMICAL_ROLES.includes(body.role as ChemicalRole) || !CHEMICAL_FORMS.includes(body.form as ChemicalForm)) {
    res.status(400).json({ error: 'name, role, and form are required' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO chemicals (id, name, role, form, concentration_pct, tablet_weight_g, tablet_concentration_pct, notes)
     VALUES (@id, @name, @role, @form, @concentrationPct, @tabletWeightG, @tabletConcentrationPct, @notes)`
  ).run({
    id,
    name: body.name.trim(),
    role: body.role,
    form: body.form,
    concentrationPct: body.concentrationPct ?? null,
    tabletWeightG: body.tabletWeightG ?? null,
    tabletConcentrationPct: body.tabletConcentrationPct ?? null,
    notes: body.notes ?? '',
  });
  res.status(201).json(loadChemical(id));
});

app.put('/api/chemicals/:id', (req, res) => {
  const { id } = req.params;
  const existing = loadChemical(id);
  if (!existing) {
    res.status(404).json({ error: 'chemical not found' });
    return;
  }
  const body = req.body as Partial<ChemicalRow>;
  const merged: ChemicalRow = {
    id,
    name: body.name?.trim() || existing.name,
    role: CHEMICAL_ROLES.includes(body.role as ChemicalRole) ? (body.role as ChemicalRole) : existing.role,
    form: CHEMICAL_FORMS.includes(body.form as ChemicalForm) ? (body.form as ChemicalForm) : existing.form,
    concentrationPct: body.concentrationPct !== undefined ? body.concentrationPct : existing.concentrationPct,
    tabletWeightG: body.tabletWeightG !== undefined ? body.tabletWeightG : existing.tabletWeightG,
    tabletConcentrationPct: body.tabletConcentrationPct !== undefined ? body.tabletConcentrationPct : existing.tabletConcentrationPct,
    notes: body.notes !== undefined ? body.notes : existing.notes,
  };
  db.prepare(
    `UPDATE chemicals SET name = @name, role = @role, form = @form, concentration_pct = @concentrationPct,
       tablet_weight_g = @tabletWeightG, tablet_concentration_pct = @tabletConcentrationPct, notes = @notes
     WHERE id = @id`
  ).run(merged);
  res.json(loadChemical(id));
});

app.delete('/api/chemicals/:id', (req, res) => {
  const result = db.prepare('DELETE FROM chemicals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'chemical not found' });
    return;
  }
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Pool tracker API listening on http://localhost:${PORT}`);
});
