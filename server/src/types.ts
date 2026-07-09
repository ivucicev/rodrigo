export interface ChemicalAdditionRow {
  id: number;
  testId: number;
  chemical: string;
  amount: number;
  unit: string;
}

export interface WaterTestRow {
  id: number;
  poolId: string;
  ph: number;
  freeChlorine: number;
  totalAlkalinity: number;
  temperature: number | null;
  tempUnit: 'F' | 'C';
  notes: string;
  recordDate: string;
  recordTime: string;
  createdAt: string;
  additions: ChemicalAdditionRow[];
}

export interface ChoreRow {
  id: string;
  poolId: string;
  phase: number;
  label: string;
  description: string;
  recurrenceHours: number | null;
  completedAt: string | null;
}

export interface PoolRow {
  id: string;
  name: string;
  volumeLiters: number;
}

export interface SettingsRow {
  unitSystem: 'metric' | 'imperial';
  activePoolId: string;
}

export type ChemicalRole = 'raise_alkalinity' | 'raise_ph' | 'lower_ph' | 'raise_chlorine' | 'algaecide' | 'other';
export type ChemicalForm = 'liquid' | 'powder' | 'tablet' | 'granule';

export interface ChemicalRow {
  id: string;
  name: string;
  role: ChemicalRole;
  form: ChemicalForm;
  concentrationPct: number | null;
  tabletWeightG: number | null;
  tabletConcentrationPct: number | null;
  notes: string;
}
