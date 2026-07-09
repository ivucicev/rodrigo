import type { DosageResult, ParamStatus, UserChemical } from '../types';
import { litersToGallons } from './units';

export const IDEAL_RANGES = {
  ph: { min: 7.4, max: 7.6, warnLow: 7.2, warnHigh: 7.8 },
  freeChlorine: { min: 2.0, max: 4.0 },
  totalAlkalinity: { min: 80, max: 120 },
} as const;

export function phStatus(ph: number): ParamStatus {
  if (ph < IDEAL_RANGES.ph.warnLow || ph > IDEAL_RANGES.ph.warnHigh) return 'critical';
  if (ph < IDEAL_RANGES.ph.min || ph > IDEAL_RANGES.ph.max) return 'warning';
  return 'ideal';
}

export function chlorineStatus(fc: number): ParamStatus {
  if (fc < IDEAL_RANGES.freeChlorine.min * 0.5 || fc > IDEAL_RANGES.freeChlorine.max * 1.5) return 'critical';
  if (fc < IDEAL_RANGES.freeChlorine.min || fc > IDEAL_RANGES.freeChlorine.max) return 'warning';
  return 'ideal';
}

export function alkalinityStatus(ta: number): ParamStatus {
  if (ta < IDEAL_RANGES.totalAlkalinity.min * 0.6 || ta > IDEAL_RANGES.totalAlkalinity.max * 1.4) return 'critical';
  if (ta < IDEAL_RANGES.totalAlkalinity.min || ta > IDEAL_RANGES.totalAlkalinity.max) return 'warning';
  return 'ideal';
}

export function statusLabel(status: ParamStatus): string {
  if (status === 'ideal') return 'Ideal';
  if (status === 'warning') return 'Out of Range';
  return 'Critical';
}

interface DosageInputs {
  ph: number;
  freeChlorine: number;
  totalAlkalinity: number;
  poolVolumeLiters: number;
  chemicals: UserChemical[];
}

const TA_TARGET = 100;
const PH_TARGET = 7.5;
const FC_TARGET = 3.0;

// Reference doses assume the product is at the given baseline strength per 10,000 US gal.
// Actual dose scales inversely with the real product concentration the user enters.
const BAKING_SODA_REF_G_PER_10K_GAL_PER_10PPM = 680; // baseline: 100% sodium bicarbonate
const SODA_ASH_REF_G_PER_10K_GAL_PER_02PH = 170; // baseline: 100% sodium carbonate
const MURIATIC_REF_FLOZ_PER_10K_GAL_PER_02PH = 25; // baseline: 31.45% HCl
const DRY_ACID_REF_G_PER_10K_GAL_PER_02PH = 680; // baseline: 93% sodium bisulfate
const LIQUID_CHLORINE_REF_FLOZ_PER_10K_GAL_PER_1PPM = 12.8; // baseline: 12.5% sodium hypochlorite

function pct(value: number | null, fallback: number): number {
  return value != null && value > 0 ? value : fallback;
}

export function computeDosages(inputs: DosageInputs): DosageResult[] {
  const { ph, freeChlorine, totalAlkalinity, poolVolumeLiters, chemicals } = inputs;
  const volumeGallons = litersToGallons(poolVolumeLiters);
  const volumeFactor = volumeGallons / 10000; // empirical pool-chem rules are per 10,000 US gal
  const volumeLiters = poolVolumeLiters;

  const taDeficit = TA_TARGET - totalAlkalinity;
  const phDeficit = PH_TARGET - ph;
  const phExcess = ph - PH_TARGET;
  const fcDeficit = FC_TARGET - freeChlorine;

  return chemicals.map((chem): DosageResult => {
    const base = { chemicalId: chem.id, chemical: chem.name, role: chem.role };

    switch (chem.role) {
      case 'raise_alkalinity': {
        if (taDeficit > 2) {
          const concentration = pct(chem.concentrationPct, 100);
          return {
            ...base,
            action: `Raise Total Alkalinity by ${taDeficit.toFixed(0)} ppm`,
            grams: BAKING_SODA_REF_G_PER_10K_GAL_PER_10PPM * (100 / concentration) * (taDeficit / 10) * volumeFactor,
            needed: true,
          };
        }
        return { ...base, action: 'Total Alkalinity is at/near target', needed: false };
      }

      case 'raise_ph': {
        if (phDeficit > 0.05) {
          const concentration = pct(chem.concentrationPct, 100);
          return {
            ...base,
            action: `Raise pH by ${phDeficit.toFixed(1)}`,
            grams: SODA_ASH_REF_G_PER_10K_GAL_PER_02PH * (100 / concentration) * (phDeficit / 0.2) * volumeFactor,
            needed: true,
          };
        }
        return { ...base, action: 'pH is at/near target, no raise needed', needed: false };
      }

      case 'lower_ph': {
        if (phExcess <= 0.05) {
          return { ...base, action: 'pH is at/near target, no reduction needed', needed: false };
        }
        if (chem.form === 'liquid') {
          const concentration = pct(chem.concentrationPct, 31.45);
          const flOz = MURIATIC_REF_FLOZ_PER_10K_GAL_PER_02PH * (31.45 / concentration) * (phExcess / 0.2) * volumeFactor;
          return { ...base, action: `Lower pH by ${phExcess.toFixed(1)}`, ml: flOz * 29.5735, needed: true };
        }
        const concentration = pct(chem.concentrationPct, 93);
        return {
          ...base,
          action: `Lower pH by ${phExcess.toFixed(1)}`,
          grams: DRY_ACID_REF_G_PER_10K_GAL_PER_02PH * (93 / concentration) * (phExcess / 0.2) * volumeFactor,
          needed: true,
        };
      }

      case 'raise_chlorine': {
        if (fcDeficit <= 0.1) {
          return { ...base, action: 'Free Chlorine is at/near target', needed: false };
        }
        const action = `Raise Free Chlorine by ${fcDeficit.toFixed(1)} ppm`;
        if (chem.form === 'tablet') {
          const tabletWeightG = pct(chem.tabletWeightG, 200);
          const tabletConcentrationPct = pct(chem.tabletConcentrationPct, 90);
          const massClNeededG = (fcDeficit * volumeLiters) / 1000;
          const tabletClContentG = tabletWeightG * (tabletConcentrationPct / 100);
          const tabletCount = Math.max(0.5, Math.round((massClNeededG / tabletClContentG) * 2) / 2);
          return { ...base, action, tabletCount, tabletWeightG, tabletConcentrationPct, needed: true };
        }
        if (chem.form === 'granule') {
          const concentration = pct(chem.concentrationPct, 65);
          const massClNeededG = (fcDeficit * volumeLiters) / 1000;
          return { ...base, action, grams: massClNeededG / (concentration / 100), needed: true };
        }
        const concentration = pct(chem.concentrationPct, 12.5);
        const flOz = LIQUID_CHLORINE_REF_FLOZ_PER_10K_GAL_PER_1PPM * (12.5 / concentration) * fcDeficit * volumeFactor;
        return { ...base, action, ml: flOz * 29.5735, needed: true };
      }

      case 'algaecide':
      case 'other':
      default:
        return {
          ...base,
          action: chem.notes.trim() || 'Follow your product label for dosing instructions',
          needed: true,
          routine: true,
          manualNote: chem.notes.trim() || undefined,
        };
    }
  });
}
