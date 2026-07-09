import { Minus, Plus, type LucideIcon } from 'lucide-react';
import type { ParamStatus } from '../types';

interface GaugeCardProps {
  icon: LucideIcon;
  label: string;
  unit: string;
  status: ParamStatus | 'unknown';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step: string;
  numericValue: number | null;
  domainMin: number;
  domainMax: number;
  idealMin: number;
  idealMax: number;
}

const STATUS_STYLES: Record<string, { text: string; dot: string; label: string; input: string; marker: string; zone: string }> = {
  ideal: {
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Ideal',
    input: 'text-emerald-700',
    marker: 'bg-emerald-600',
    zone: 'bg-emerald-200',
  },
  warning: {
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Out of Range',
    input: 'text-amber-700',
    marker: 'bg-amber-600',
    zone: 'bg-emerald-200',
  },
  critical: {
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    label: 'Critical',
    input: 'text-rose-700',
    marker: 'bg-rose-600',
    zone: 'bg-emerald-200',
  },
  unknown: {
    text: 'text-slate-400',
    dot: 'bg-slate-300',
    label: 'No Data',
    input: 'text-slate-800',
    marker: 'bg-slate-400',
    zone: 'bg-emerald-200',
  },
};

function clampPct(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export default function GaugeCard({
  icon: Icon,
  label,
  unit,
  status,
  value,
  onChange,
  placeholder,
  step,
  numericValue,
  domainMin,
  domainMax,
  idealMin,
  idealMax,
}: GaugeCardProps) {
  const style = STATUS_STYLES[status];
  const zoneStart = clampPct(idealMin, domainMin, domainMax);
  const zoneEnd = clampPct(idealMax, domainMin, domainMax);
  const markerPos = numericValue == null ? null : clampPct(numericValue, domainMin, domainMax);

  const stepAmount = Number(step) || 1;
  const decimals = step.includes('.') ? step.split('.')[1].length : 0;

  function adjust(direction: 1 | -1) {
    const base = numericValue ?? idealMin;
    const next = Math.max(0, base + direction * stepAmount);
    onChange(next.toFixed(decimals));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon size={16} strokeWidth={2.25} />
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => adjust(-1)}
          aria-label={`Decrease ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Minus size={14} />
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1.5">
          <input
            type="number"
            step={step}
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-20 border-none bg-transparent p-0 text-center text-4xl font-bold tracking-tight outline-none placeholder:text-slate-300 ${style.input}`}
          />
          {unit && <span className="text-base font-medium text-slate-400">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => adjust(1)}
          aria-label={`Increase ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="mt-4">
        <div className="relative h-1.5 rounded-full bg-slate-100">
          <div
            className={`absolute inset-y-0 rounded-full ${style.zone}`}
            style={{ left: `${zoneStart}%`, width: `${Math.max(zoneEnd - zoneStart, 2)}%` }}
          />
          {markerPos != null && (
            <div
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${style.marker}`}
              style={{ left: `${markerPos}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
          <span>{domainMin}</span>
          <span>
            Ideal {idealMin}&ndash;{idealMax}
          </span>
          <span>{domainMax}</span>
        </div>
      </div>
    </div>
  );
}
