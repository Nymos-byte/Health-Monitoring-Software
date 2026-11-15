import { SECTIONS, TASKS } from '../data/mockData';
import { getAllowedEnvironments, taskBlocker } from '../utils/missions';

// Task picker limited to what the astronaut's mission phase allows. Shows who else is on each
// task (crews often share one) and why a task is unavailable.
export default function TaskSelect({
  value,
  onChange,
  astronautId,
  crewData,
  records,
  missions,
  envId,
  className = '',
}) {
  const member = crewData[astronautId];
  const allowed = getAllowedEnvironments(missions, member);
  const environments = SECTIONS.filter((s) => allowed.includes(s.id) && (!envId || s.id === envId));
  const members = Object.values(crewData);

  const label = (task) => {
    const others = members.filter((m) => m.taskId === task.id && m.id !== astronautId).length;
    const parts = [task.name, task.activity];
    if (task.eva) parts.push('in pairs');
    if (task.once) parts.push(taskBlocker(records, missions, member, task.id) === 'done' ? 'done' : 'one-time');
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
              disabled={t.id !== value && taskBlocker(records, missions, member, t.id) !== null}
            >
              {label(t)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
