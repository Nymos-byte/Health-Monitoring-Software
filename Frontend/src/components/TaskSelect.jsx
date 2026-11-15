import { SECTIONS, TASKS } from '../data/mockData';
import { canAssignTask } from '../hooks/useRealtimeVitals';

// Task picker grouped by environment. Shows who else is on each task (several astronauts can
// share one) and disables one-time tasks the astronaut has already completed.
export default function TaskSelect({
  value,
  onChange,
  astronautId,
  crewData,
  records,
  envId,
  className = '',
}) {
  const environments = envId ? SECTIONS.filter((s) => s.id === envId) : SECTIONS;
  const members = Object.values(crewData);

  const label = (task) => {
    const others = members.filter((m) => m.taskId === task.id && m.id !== astronautId).length;
    const parts = [task.name, task.activity];
    if (task.once) parts.push(canAssignTask(records, astronautId, task.id) ? 'one-time' : 'done');
    if (others) parts.push(`${others} other${others > 1 ? 's' : ''} on it`);
    return parts.join(' · ');
  };

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
            <option
              key={t.id}
              value={t.id}
              disabled={t.id !== value && !canAssignTask(records, astronautId, t.id)}
            >
              {label(t)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
