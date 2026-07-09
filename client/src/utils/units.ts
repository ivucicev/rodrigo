import type { UnitSystem } from '../types';

export const LITERS_PER_GALLON = 3.785411784;
export const GRAMS_PER_OZ = 28.3495;
export const ML_PER_FLOZ = 29.5735;

export function litersToGallons(liters: number): number {
  return liters / LITERS_PER_GALLON;
}

export function gallonsToLiters(gallons: number): number {
  return gallons * LITERS_PER_GALLON;
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

interface UnitDisplay {
  primary: string;
  secondary: string;
}

export function formatMass(grams: number, system: UnitSystem): UnitDisplay {
  const metric = grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams.toFixed(0)} g`;
  const oz = grams / GRAMS_PER_OZ;
  const imperial = oz >= 16 ? `${(oz / 16).toFixed(2)} lb` : `${oz.toFixed(1)} oz`;
  return system === 'metric' ? { primary: metric, secondary: imperial } : { primary: imperial, secondary: metric };
}

export function formatVolume(ml: number, system: UnitSystem): UnitDisplay {
  const metric = ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml.toFixed(0)} ml`;
  const flOz = ml / ML_PER_FLOZ;
  const imperial = `${flOz.toFixed(1)} fl oz`;
  return system === 'metric' ? { primary: metric, secondary: imperial } : { primary: imperial, secondary: metric };
}

export function formatPoolVolume(liters: number, system: UnitSystem): UnitDisplay {
  const metric = `${liters.toFixed(0)} L`;
  const imperial = `${litersToGallons(liters).toFixed(0)} gal`;
  return system === 'metric' ? { primary: metric, secondary: imperial } : { primary: imperial, secondary: metric };
}

export function poolVolumeInputUnit(system: UnitSystem): 'L' | 'gal' {
  return system === 'metric' ? 'L' : 'gal';
}

export function poolVolumeToLiters(value: number, system: UnitSystem): number {
  return system === 'metric' ? value : gallonsToLiters(value);
}

export function litersToPoolVolumeInput(liters: number, system: UnitSystem): number {
  return system === 'metric' ? Math.round(liters) : Math.round(litersToGallons(liters));
}
