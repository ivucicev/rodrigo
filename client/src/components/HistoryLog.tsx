import { Clock, FlaskConical } from 'lucide-react';
import type { ParamStatus, WaterTest } from '../types';
import { formatDateTime, formatRelative } from '../utils/time';
import { alkalinityStatus, chlorineStatus, phStatus, statusLabel } from '../utils/chemistry';

interface HistoryLogProps {
  tests: WaterTest[];
}

const STATUS_TEXT: Record<ParamStatus, string> = {
  ideal: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
};

function MetricPill({ label, value, status }: { label: string; value: string; status: ParamStatus }) {
  return (
    <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${STATUS_TEXT[status]}`}>
      {label}: {value} · {statusLabel(status)}
    </span>
  );
}

export default function HistoryLog({ tests }: HistoryLogProps) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Clock size={18} className="text-emerald-600" />
        History Log
      </h2>

      {tests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-5 py-8 text-center text-sm text-slate-400">
          No entries yet. Save your first water test to start the timeline.
        </div>
      ) : (
        <ul className="space-y-3">
          {tests.map((t) => (
            <li key={t.id} className="rounded-2xl border-2 border-slate-800/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{formatDateTime(t.recordDate, t.recordTime)}</span>
                <span className="text-xs text-slate-400">{formatRelative(`${t.recordDate}T${t.recordTime}`)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <MetricPill label="pH" value={t.ph.toFixed(1)} status={phStatus(t.ph)} />
                <MetricPill label="Free Cl" value={`${t.freeChlorine.toFixed(1)} ppm`} status={chlorineStatus(t.freeChlorine)} />
                <MetricPill label="Alkalinity" value={`${t.totalAlkalinity.toFixed(0)} ppm`} status={alkalinityStatus(t.totalAlkalinity)} />
                {t.temperature != null && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {t.temperature.toFixed(1)}&deg;{t.tempUnit}
                  </span>
                )}
              </div>

              {t.additions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <FlaskConical size={14} className="text-slate-400" />
                  {t.additions.map((a) => (
                    <span key={a.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {a.chemical}: {a.amount.toFixed(1)} {a.unit}
                    </span>
                  ))}
                </div>
              )}

              {t.notes && <p className="mt-3 text-sm italic text-slate-500">&ldquo;{t.notes}&rdquo;</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
