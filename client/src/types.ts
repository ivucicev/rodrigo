export type TempUnit = 'F' | 'C';

export type ParamStatus = 'ideal' | 'warning' | 'critical';

export interface ChemicalAddition {
  id: number;
  testId: number;
  chemical: string;
  amount: number;
  unit: string;
}

export interface WaterTest {
  id: number;
  ph: number;
  freeChlorine: number;
  totalAlkalinity: number;
  temperature: number | null;
  tempUnit: TempUnit;
  notes: string;
  recordDate: string;
  recordTime: string;
  createdAt: string;
  additions: ChemicalAddition[];
}

export interface NewWaterTestInput {
  ph: number;
  freeChlorine: number;
  totalAlkalinity: number;
  temperature: number | null;
  tempUnit: TempUnit;
  notes: string;
  recordDate: string;
  recordTime: string;
  additions: { chemical: string; amount: number; unit: string }[];
}

export interface Chore {
  id: string;
  phase: number;
  label: string;
  description: string;
  recurrenceHours: number | null;
  completedAt: string | null;
}

export type UnitSystem = 'metric' | 'imperial';

export interface Settings {
  unitSystem: UnitSystem;
  poolVolumeLiters: number;
}

export type ChemicalRole = 'raise_alkalinity' | 'raise_ph' | 'lower_ph' | 'raise_chlorine' | 'algaecide' | 'other';
export type ChemicalForm = 'liquid' | 'powder' | 'tablet' | 'granule';

export interface UserChemical {
  id: string;
  name: string;
  role: ChemicalRole;
  form: ChemicalForm;
  concentrationPct: number | null;
  tabletWeightG: number | null;
  tabletConcentrationPct: number | null;
  notes: string;
}

export type NewUserChemicalInput = Omit<UserChemical, 'id'>;

export interface DraftTest {
  ph: string;
  freeChlorine: string;
  totalAlkalinity: string;
  temperature: string;
  tempUnit: TempUnit;
  notes: string;
}

export interface DosageResult {
  chemicalId: string;
  chemical: string;
  role: ChemicalRole;
  action: string;
  grams?: number;
  ml?: number;
  tabletCount?: number;
  tabletWeightG?: number;
  tabletConcentrationPct?: number;
  needed: boolean;
  routine?: boolean;
  manualNote?: string;
}
