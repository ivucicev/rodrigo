import { AlertTriangle, Check, Droplets, ListChecks, ShieldAlert, Sparkles, Waves } from 'lucide-react';
import type { Chore, WaterTest } from '../types';
import { daysSince, formatDueIn, isChoreActive } from '../utils/time';

interface ChoreChecklistProps {
  chores: Chore[];
  latestTest: WaterTest | null;
  onToggle: (id: string, completed: boolean) => void;
}

const PHASES: Record<number, { title: string; blurb: string; icon: typeof Waves; accent: string }> = {
  1: {
    title: 'Phase 1 · Adjust pH & Alkalinity',
    blurb: 'Highest priority. Balance Alkalinity first to buffer the pH, then correct pH before sanitizing — high pH cuts chlorine efficiency by 50%.',
    icon: ShieldAlert,
    accent: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  2: {
    title: 'Phase 2 · Sanitize & Disinfect',
    blurb: 'Check and dose sanitizer levels once pH/alkalinity are balanced.',
    icon: Droplets,
    accent: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  3: {
    title: 'Phase 3 · Circulation & Safety',
    blurb: 'Circulate additions fully and observe safety swim windows before reopening.',
    icon: Waves,
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  4: {
    title: 'Phase 4 · Routine Maintenance',
    blurb: 'General cleaning chores that recur on their own schedule.',
    icon: Sparkles,
    accent: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  5: {
    title: 'Phase 5 · Retest & Verify',
    blurb: 'Confirm everything landed in range with a fresh test.',
    icon: ListChecks,
    accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
};

export default function ChoreChecklist({ chores, latestTest, onToggle }: ChoreChecklistProps) {
  const testAgeDays = latestTest ? daysSince(`${latestTest.recordDate}T${latestTest.recordTime}`) : null;
  const isOverdue = testAgeDays == null || testAgeDays > 3;

  const grouped = [1, 2, 3, 4, 5].map((phase) => ({
    phase,
    meta: PHASES[phase],
    items: chores.filter((c) => c.phase === phase),
  }));

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Maintenance Checklist</h2>

      {isOverdue && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={20} />
          <div>
            <p className="text-sm font-bold text-rose-700">
              {latestTest ? 'Water test is overdue' : 'No water test logged yet'}
            </p>
            <p className="text-xs text-rose-600">
              {latestTest
                ? `Last test was ${Math.floor(testAgeDays ?? 0)} day(s) ago. Retest now — readings older than 3 days are unreliable.`
                : 'Log a water test to unlock accurate chemistry gauges and dosage recipes.'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {grouped.map(({ phase, meta, items }) => {
          const Icon = meta.icon;
          return (
            <div key={phase} className="rounded-2xl border-2 border-slate-800/10 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.accent}`}>
                  <Icon size={16} />
                </span>
                <h3 className="font-semibold text-slate-900">{meta.title}</h3>
              </div>
              <p className="mb-3 pl-10 text-xs text-slate-500">{meta.blurb}</p>

              <ul className="space-y-2 pl-10">
                {items.map((chore) => {
                  const active = isChoreActive(chore.completedAt, chore.recurrenceHours);
                  return (
                    <li key={chore.id} className="flex items-start gap-3">
                      <button
                        onClick={() => onToggle(chore.id, !active)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-emerald-400'
                        }`}
                        aria-label={active ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {active && <Check size={13} strokeWidth={3} />}
                      </button>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${active ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                            {chore.label}
                          </span>
                          {active && chore.recurrenceHours != null && chore.completedAt && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {formatDueIn(chore.completedAt, chore.recurrenceHours)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{chore.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
