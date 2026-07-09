import { useState } from 'react';
import { Droplets, FlaskConical, Gauge, Save, Thermometer } from 'lucide-react';
import GaugeCard from './GaugeCard';
import type { DraftTest, ParamStatus, WaterTest } from '../types';
import { alkalinityStatus, chlorineStatus, phStatus } from '../utils/chemistry';

interface DashboardProps {
  draft: DraftTest;
  onChange: (patch: Partial<DraftTest>) => void;
  onLog: () => Promise<void>;
  additionsCount: number;
  latestTest: WaterTest | null;
}

function parseNum(value: string): number | null {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

const EPSILON = 0.001;
function differs(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return a !== b;
  return Math.abs(a - b) > EPSILON;
}

export default function Dashboard({ draft, onChange, onLog, additionsCount, latestTest }: DashboardProps) {
  const [saving, setSaving] = useState(false);
  const ph = parseNum(draft.ph);
  const fc = parseNum(draft.freeChlorine);
  const ta = parseNum(draft.totalAlkalinity);

  const phStat: ParamStatus | 'unknown' = ph == null ? 'unknown' : phStatus(ph);
  const fcStat: ParamStatus | 'unknown' = fc == null ? 'unknown' : chlorineStatus(fc);
  const taStat: ParamStatus | 'unknown' = ta == null ? 'unknown' : alkalinityStatus(ta);

  const hasReadings = draft.ph.trim() !== '' && draft.freeChlorine.trim() !== '' && draft.totalAlkalinity.trim() !== '';

  const hasChanged =
    !latestTest || differs(ph, latestTest.ph) || differs(fc, latestTest.freeChlorine) || differs(ta, latestTest.totalAlkalinity);

  async function handleLog() {
    if (!hasReadings || !hasChanged || saving) return;
    setSaving(true);
    try {
      await onLog();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Active Water Chemistry</h2>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <Thermometer size={16} className="ml-1 text-slate-400" />
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="temp"
            value={draft.temperature}
            onChange={(e) => onChange({ temperature: e.target.value })}
            className="w-16 bg-transparent text-right text-sm font-semibold text-slate-700 outline-none"
          />
          <span className="px-2 text-sm font-semibold text-slate-500">&deg;{draft.tempUnit}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GaugeCard
          icon={Gauge}
          label="pH"
          unit=""
          status={phStat}
          value={draft.ph}
          onChange={(v) => onChange({ ph: v })}
          placeholder="7.5"
          step="0.1"
          numericValue={ph}
          domainMin={6.8}
          domainMax={8.2}
          idealMin={7.4}
          idealMax={7.6}
        />

        <GaugeCard
          icon={Droplets}
          label="Free Chlorine"
          unit="ppm"
          status={fcStat}
          value={draft.freeChlorine}
          onChange={(v) => onChange({ freeChlorine: v })}
          placeholder="3.0"
          step="0.1"
          numericValue={fc}
          domainMin={0}
          domainMax={6}
          idealMin={2}
          idealMax={4}
        />

        <GaugeCard
          icon={FlaskConical}
          label="Total Alkalinity"
          unit="ppm"
          status={taStat}
          value={draft.totalAlkalinity}
          onChange={(v) => onChange({ totalAlkalinity: v })}
          placeholder="100"
          step="1"
          numericValue={ta}
          domainMin={0}
          domainMax={170}
          idealMin={80}
          idealMax={120}
        />
      </div>

      {hasChanged && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Optional notes..."
              value={draft.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-600/40 focus:bg-white"
            />
          </div>
          <button
            onClick={handleLog}
            disabled={!hasReadings || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Save size={16} />
            {saving ? 'Logging...' : additionsCount > 0 ? `Log Reading (+${additionsCount} additions)` : 'Log Reading'}
          </button>
        </div>
      )}
    </section>
  );
}
