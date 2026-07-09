import { useEffect, useState } from 'react';
import { ClipboardList, Clock, Droplets } from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DosageRecipes from './components/DosageRecipes';
import ChoreChecklist from './components/ChoreChecklist';
import HistoryLog from './components/HistoryLog';
import SettingsPanel from './components/SettingsPanel';
import { api } from './api';
import { computeDosages } from './utils/chemistry';
import { celsiusToFahrenheit, fahrenheitToCelsius } from './utils/units';
import type { Chore, DraftTest, NewUserChemicalInput, Settings, UserChemical, WaterTest } from './types';

const DRAFT_STORAGE_KEY = 'pool-tracker:draft';

const DEFAULT_SETTINGS: Settings = {
  unitSystem: 'metric',
  poolVolumeLiters: 56800,
};

function nowDateTimeParts() {
  const d = new Date();
  const recordDate = d.toISOString().slice(0, 10);
  const recordTime = d.toTimeString().slice(0, 5);
  return { recordDate, recordTime };
}

function loadDraft(): DraftTest {
  const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as DraftTest;
    } catch {
      // fall through to defaults
    }
  }
  return {
    ph: '',
    freeChlorine: '',
    totalAlkalinity: '',
    temperature: '',
    tempUnit: 'C',
    notes: '',
  };
}

type Tab = 'overview' | 'checklist' | 'history';

const TABS: { id: Tab; label: string; icon: typeof Droplets }[] = [
  { id: 'overview', label: 'Overview', icon: Droplets },
  { id: 'checklist', label: 'Maintenance Checklist', icon: ClipboardList },
  { id: 'history', label: 'History Log', icon: Clock },
];

export default function App() {
  const [draft, setDraft] = useState<DraftTest>(loadDraft);
  const [tests, setTests] = useState<WaterTest[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [chemicals, setChemicals] = useState<UserChemical[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    Promise.all([api.getTests(), api.getChores(), api.getSettings(), api.getChemicals()])
      .then(([testsRes, choresRes, settingsRes, chemicalsRes]) => {
        setTests(testsRes);
        setChores(choresRes);
        setSettings(settingsRes);
        setChemicals(chemicalsRes);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  function patchDraft(patch: Partial<DraftTest>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    const expectedUnit = settings.unitSystem === 'metric' ? 'C' : 'F';
    if (draft.tempUnit === expectedUnit) return;
    const tempNum = Number(draft.temperature);
    const hasTemp = draft.temperature.trim() !== '' && !Number.isNaN(tempNum);
    const converted = hasTemp
      ? (expectedUnit === 'C' ? fahrenheitToCelsius(tempNum) : celsiusToFahrenheit(tempNum)).toFixed(1)
      : draft.temperature;
    patchDraft({ tempUnit: expectedUnit, temperature: converted });
  }, [settings.unitSystem]);

  const ph = Number(draft.ph);
  const fc = Number(draft.freeChlorine);
  const ta = Number(draft.totalAlkalinity);
  const readingsComplete = draft.ph.trim() !== '' && draft.freeChlorine.trim() !== '' && draft.totalAlkalinity.trim() !== '';

  const dosageBase = { poolVolumeLiters: settings.poolVolumeLiters, chemicals };

  const dosages = readingsComplete
    ? computeDosages({ ph, freeChlorine: fc, totalAlkalinity: ta, ...dosageBase })
    : computeDosages({ ph: 7.5, freeChlorine: 3, totalAlkalinity: 100, ...dosageBase }).map((d) => ({ ...d, needed: d.routine ?? false }));

  async function handleSubmitTest() {
    const additions = dosages
      .filter((d) => d.needed && !d.routine)
      .map((d) => {
        if (d.grams != null) return { chemical: d.chemical, amount: d.grams, unit: 'g' };
        if (d.ml != null) return { chemical: d.chemical, amount: d.ml, unit: 'ml' };
        if (d.tabletCount != null) return { chemical: d.chemical, amount: d.tabletCount, unit: 'tablet(s)' };
        return { chemical: d.chemical, amount: 0, unit: '' };
      });

    const { recordDate, recordTime } = nowDateTimeParts();
    const created = await api.createTest({
      ph,
      freeChlorine: fc,
      totalAlkalinity: ta,
      temperature: draft.temperature.trim() === '' ? null : Number(draft.temperature),
      tempUnit: draft.tempUnit,
      notes: draft.notes,
      recordDate,
      recordTime,
      additions,
    });

    setTests((prev) => [created, ...prev]);
    patchDraft({ notes: '' });
  }

  async function handleToggleChore(id: string, completed: boolean) {
    const updated = await api.toggleChore(id, completed);
    setChores((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleSaveSettings(next: Settings) {
    const updated = await api.updateSettings(next);
    setSettings(updated);
    setSettingsOpen(false);
  }

  async function handleAddChemical(input: NewUserChemicalInput) {
    const created = await api.createChemical(input);
    setChemicals((prev) => [...prev, created]);
  }

  async function handleUpdateChemical(id: string, patch: Partial<NewUserChemicalInput>) {
    const updated = await api.updateChemical(id, patch);
    setChemicals((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDeleteChemical(id: string) {
    await api.deleteChemical(id);
    setChemicals((prev) => prev.filter((c) => c.id !== id));
  }

  const latestTest = tests[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-8">
        {loadError && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            Could not reach the API server: {loadError}. Make sure the backend is running on port 4000.
          </div>
        )}

        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <>
            <Dashboard
              draft={draft}
              onChange={patchDraft}
              onLog={handleSubmitTest}
              additionsCount={dosages.filter((d) => d.needed && !d.routine).length}
              latestTest={latestTest}
            />
            <DosageRecipes dosages={dosages} unitSystem={settings.unitSystem} />
          </>
        )}
        {activeTab === 'checklist' && <ChoreChecklist chores={chores} latestTest={latestTest} onToggle={handleToggleChore} />}
        {activeTab === 'history' && <HistoryLog tests={tests} />}
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          chemicals={chemicals}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
          onAddChemical={handleAddChemical}
          onUpdateChemical={handleUpdateChemical}
          onDeleteChemical={handleDeleteChemical}
        />
      )}
    </div>
  );
}
