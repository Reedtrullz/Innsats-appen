import type { Role } from '@/lib/content/taxonomy';
import { roleLabels, roles } from '@/lib/content/taxonomy';

export function RoleFilter({ value, onChange }: { value?: Role; onChange: (role?: Role) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto" aria-label="Rollefilter">
      <button type="button" onClick={() => onChange(undefined)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${!value ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>Alle roller</button>
      {roles.map((role) => (
        <button key={role} type="button" onClick={() => onChange(role)} className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${value === role ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>{roleLabels[role]}</button>
      ))}
    </div>
  );
}
