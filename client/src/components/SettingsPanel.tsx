import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { ChemicalForm, ChemicalRole, NewPoolInput, NewUserChemicalInput, Pool, Settings, UnitSystem, UserChemical } from '../types';
import { litersToPoolVolumeInput, poolVolumeInputUnit, poolVolumeToLiters } from '../utils/units';

interface SettingsPanelProps {
  settings: Settings;
  pools: Pool[];
  chemicals: UserChemical[];
  onClose: () => void;
  onSave: (settings: Settings) => void;
  onSwitchPool: (id: string) => void;
  onAddPool: (input: NewPoolInput) => void;
  onUpdatePool: (id: string, patch: Partial<NewPoolInput>) => void;
  onDeletePool: (id: string) => void;
  onAddChemical: (input: NewUserChemicalInput) => void;
  onUpdateChemical: (id: string, patch: Partial<NewUserChemicalInput>) => void;
  onDeleteChemical: (id: string) => void;
}

const ROLE_OPTIONS: { value: ChemicalRole; label: string }[] = [
  { value: 'raise_alkalinity', label: 'Raise Alkalinity' },
  { value: 'raise_ph', label: 'Raise pH' },
  { value: 'lower_ph', label: 'Lower pH' },
  { value: 'raise_chlorine', label: 'Raise Chlorine' },
  { value: 'algaecide', label: 'Algaecide' },
  { value: 'other', label: 'Other' },
];

const FORM_OPTIONS: { value: ChemicalForm; label: string }[] = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'powder', label: 'Powder' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'granule', label: 'Granule' },
];

const CALCULATED_ROLES: ChemicalRole[] = ['raise_alkalinity', 'raise_ph', 'lower_ph', 'raise_chlorine'];

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border-2 border-slate-800/10 bg-slate-50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === opt.value ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PoolCard({
  pool,
  active,
  unitSystem,
  canDelete,
  onSwitch,
  onUpdate,
  onDelete,
}: {
  pool: Pool;
  active: boolean;
  unitSystem: UnitSystem;
  canDelete: boolean;
  onSwitch: () => void;
  onUpdate: (patch: Partial<NewPoolInput>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(pool.name);
  const [volumeInput, setVolumeInput] = useState(String(litersToPoolVolumeInput(pool.volumeLiters, unitSystem)));

  return (
    <div className={`rounded-xl border-2 p-3 ${active ? 'border-emerald-600/40 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={onSwitch}
          aria-label={active ? `${pool.name} is active` : `Switch to ${pool.name}`}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
            active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-transparent hover:border-emerald-400'
          }`}
        >
          <Check size={15} />
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && onUpdate({ name: name.trim() })}
          placeholder="Pool name"
          className="flex-1 rounded-lg border-2 border-slate-800/10 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
        />
        <button
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={`Remove ${pool.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <label className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500">
        Volume
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={volumeInput}
            onChange={(e) => setVolumeInput(e.target.value)}
            onBlur={() => {
              const liters = poolVolumeToLiters(Number(volumeInput) || 0, unitSystem);
              if (liters > 0) onUpdate({ volumeLiters: liters });
            }}
            className="w-24 rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
          />
          <span className="text-xs font-medium text-slate-400">{poolVolumeInputUnit(unitSystem)}</span>
        </span>
      </label>
    </div>
  );
}

function ChemicalCard({
  chemical,
  onUpdate,
  onDelete,
}: {
  chemical: UserChemical;
  onUpdate: (patch: Partial<NewUserChemicalInput>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(chemical.name);
  const [concentrationPct, setConcentrationPct] = useState(chemical.concentrationPct != null ? String(chemical.concentrationPct) : '');
  const [tabletWeightG, setTabletWeightG] = useState(chemical.tabletWeightG != null ? String(chemical.tabletWeightG) : '');
  const [tabletConcentrationPct, setTabletConcentrationPct] = useState(
    chemical.tabletConcentrationPct != null ? String(chemical.tabletConcentrationPct) : ''
  );
  const [notes, setNotes] = useState(chemical.notes);

  const showsTabletFields = chemical.role === 'raise_chlorine' && chemical.form === 'tablet';
  const showsConcentration = CALCULATED_ROLES.includes(chemical.role) && !showsTabletFields;
  const concentrationLabel = chemical.form === 'liquid' ? 'Concentration %' : 'Purity %';

  return (
    <div className="rounded-xl border-2 border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && onUpdate({ name: name.trim() })}
          placeholder="Product name (e.g. HTH Algaecide 60)"
          className="flex-1 rounded-lg border-2 border-slate-800/10 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
        />
        <button
          onClick={onDelete}
          aria-label={`Remove ${chemical.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={chemical.role}
          onChange={(e) => onUpdate({ role: e.target.value as ChemicalRole })}
          className="rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600/40"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={chemical.form}
          onChange={(e) => onUpdate({ form: e.target.value as ChemicalForm })}
          className="rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600/40"
        >
          {FORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {showsConcentration && (
        <label className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500">
          {concentrationLabel}
          <input
            type="number"
            min={0}
            step="any"
            value={concentrationPct}
            onChange={(e) => setConcentrationPct(e.target.value)}
            onBlur={() => onUpdate({ concentrationPct: concentrationPct.trim() === '' ? null : Number(concentrationPct) })}
            className="w-24 rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
          />
        </label>
      )}

      {showsTabletFields && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center justify-between gap-3 text-sm text-slate-500">
            Tablet weight (g)
            <input
              type="number"
              min={0}
              step="any"
              value={tabletWeightG}
              onChange={(e) => setTabletWeightG(e.target.value)}
              onBlur={() => onUpdate({ tabletWeightG: tabletWeightG.trim() === '' ? null : Number(tabletWeightG) })}
              className="w-24 rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-500">
            Available chlorine %
            <input
              type="number"
              min={0}
              step="any"
              value={tabletConcentrationPct}
              onChange={(e) => setTabletConcentrationPct(e.target.value)}
              onBlur={() =>
                onUpdate({ tabletConcentrationPct: tabletConcentrationPct.trim() === '' ? null : Number(tabletConcentrationPct) })
              }
              className="w-24 rounded-lg border-2 border-slate-800/10 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600/40"
            />
          </label>
        </div>
      )}

      <label className="mt-2 block text-sm text-slate-500">
        {chemical.role === 'algaecide' || chemical.role === 'other' ? 'Dosing instructions (from product label)' : 'Notes (optional)'}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onUpdate({ notes })}
          rows={2}
          placeholder="e.g. Add 13 fl oz per 10,000 gal weekly"
          className="mt-1 w-full resize-none rounded-lg border-2 border-slate-800/10 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-600/40"
        />
      </label>
    </div>
  );
}

export default function SettingsPanel({
  settings,
  pools,
  chemicals,
  onClose,
  onSave,
  onSwitchPool,
  onAddPool,
  onUpdatePool,
  onDeletePool,
  onAddChemical,
  onUpdateChemical,
  onDeleteChemical,
}: SettingsPanelProps) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(settings.unitSystem);

  function handleSaveUnitSystem(next: UnitSystem) {
    setUnitSystem(next);
    onSave({ ...settings, unitSystem: next });
  }

  function handleAddPool() {
    onAddPool({ name: 'New Pool', volumeLiters: 15000 });
  }

  function handleAddChemical() {
    onAddChemical({
      name: 'New Chemical',
      role: 'raise_chlorine',
      form: 'liquid',
      concentrationPct: null,
      tabletWeightG: null,
      tabletConcentrationPct: null,
      notes: '',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Settings</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Unit System</h3>
            <SegmentedControl
              value={unitSystem}
              onChange={handleSaveUnitSystem}
              options={[
                { value: 'metric', label: 'Metric' },
                { value: 'imperial', label: 'Imperial' },
              ]}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pools</h3>
              <button
                onClick={handleAddPool}
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Each pool keeps its own volume, test history, and maintenance checklist. Tap the checkmark to switch which one is active.
            </p>
            <div className="space-y-3">
              {pools.map((pool) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  active={pool.id === settings.activePoolId}
                  unitSystem={unitSystem}
                  canDelete={pools.length > 1}
                  onSwitch={() => onSwitchPool(pool.id)}
                  onUpdate={(p) => onUpdatePool(pool.id, p)}
                  onDelete={() => onDeletePool(pool.id)}
                />
              ))}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Chemicals</h3>
              <button
                onClick={handleAddChemical}
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Add exactly what's on your shelf — any brand name, with the strength printed on the label. Dosage recipes only show up for
              chemicals you've added here. Shared across all pools.
            </p>

            {chemicals.length === 0 ? (
              <p className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                No chemicals yet. Tap Add to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {chemicals.map((chem) => (
                  <ChemicalCard
                    key={chem.id}
                    chemical={chem}
                    onUpdate={(p) => onUpdateChemical(chem.id, p)}
                    onDelete={() => onDeleteChemical(chem.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
