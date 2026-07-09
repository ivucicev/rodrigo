import { Settings2, Waves } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="border-b-2 border-slate-800/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Waves size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Rodrigo</h1>
            <p className="text-xs font-medium text-slate-400">Pool Water Chemistry &amp; Maintenance Tracker</p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-800/10 bg-white text-slate-500 shadow-sm transition-colors hover:border-emerald-600/30 hover:text-emerald-700"
          aria-label="Settings"
        >
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
}
