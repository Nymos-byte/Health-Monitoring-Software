import { SECTIONS, TASKS } from '../data/mockData';

// Task picker grouped by environment; one task per astronaut
export default function TaskSelect({ value, onChange, envId, className = '' }) {
  const environments = envId ? SECTIONS.filter((s) => s.id === envId) : SECTIONS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-space-900 border border-space-600 rounded-md px-2 py-1 text-sm text-gray-200 cursor-pointer ${className}`}
    >
      {!value && <option value="">Choose a task…</option>}
      {environments.map((env) => (
        <optgroup key={env.id} label={env.name}>
          {TASKS.filter((t) => t.environment === env.id).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.activity}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
