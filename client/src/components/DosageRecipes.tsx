import { Beaker, CircleCheck, Droplet, FlaskConical, FlaskRound, Sparkles } from 'lucide-react';
import type { ChemicalRole, DosageResult, UnitSystem } from '../types';
import { formatMass, formatVolume } from '../utils/units';

interface DosageRecipesProps {
  dosages: DosageResult[];
  unitSystem: UnitSystem;
}

const ROLE_ICON: Record<ChemicalRole, typeof Beaker> = {
  raise_alkalinity: FlaskRound,
  raise_ph: Beaker,
  lower_ph: Droplet,
  raise_chlorine: FlaskConical,
  algaecide: Sparkles,
  other: FlaskConical,
};

export default function DosageRecipes({ dosages, unitSystem }: DosageRecipesProps) {
  const anyNeeded = dosages.some((d) => d.needed && !d.routine);

  if (dosages.length === 0) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Dynamic Dosage Recipes</h2>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-5 py-8 text-center text-sm text-slate-400">
          No chemicals configured yet. Add what you actually have in Settings to see dosage recipes here.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Dynamic Dosage Recipes</h2>
      </div>

      {!anyNeeded && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CircleCheck size={18} />
          All parameters are dialed in &mdash; no dosage adjustments needed right now.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dosages.map((d) => {
          const Icon = ROLE_ICON[d.role];
          const massDisplay = d.grams != null ? formatMass(d.grams, unitSystem) : null;
          const volumeDisplay = d.ml != null ? formatVolume(d.ml, unitSystem) : null;

          return (
            <div
              key={d.chemicalId}
              className={`rounded-2xl border-2 p-5 shadow-sm ${
                d.needed ? 'border-slate-800/10 bg-white' : 'border-slate-200 bg-slate-50/60 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    d.needed ? (d.routine ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700') : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{d.chemical}</h3>
                  <p className="text-xs text-slate-500">{d.action}</p>
                </div>
              </div>

              {d.needed && !d.routine && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  {massDisplay && (
                    <p className="text-sm text-slate-700">
                      Add <span className="font-bold text-slate-900">{massDisplay.primary}</span>{' '}
                      <span className="text-slate-400">({massDisplay.secondary})</span>
                    </p>
                  )}
                  {volumeDisplay && (
                    <p className="text-sm text-slate-700">
                      Add <span className="font-bold text-slate-900">{volumeDisplay.primary}</span>{' '}
                      <span className="text-slate-400">({volumeDisplay.secondary})</span>
                    </p>
                  )}
                  {d.tabletCount != null && (
                    <p className="text-sm text-slate-700">
                      Add <span className="font-bold text-slate-900">~{d.tabletCount} tab(s)</span>{' '}
                      <span className="text-xs text-slate-400">
                        ({d.tabletWeightG}g @ {d.tabletConcentrationPct}% avail. chlorine)
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
