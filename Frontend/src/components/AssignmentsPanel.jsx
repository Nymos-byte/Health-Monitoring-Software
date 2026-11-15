import { SECTIONS } from '../data/mockData';
import { getStatusColor, getMemberStatus, calculateHealthScore } from '../utils/helpers';
import TaskSelect from './TaskSelect';

// Who is doing what, where. Each astronaut appears in exactly one environment.
export default function AssignmentsPanel({
  crewData,
  records,
  selectedId,
  onSelectAstronaut,
  onAssignTask,
}) {
  const members = Object.values(crewData);

  return (
    <div className="space-y-3">
      <div className="bg-space-800/80 border border-space-600 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-space-600">
              <th className="text-left font-medium px-4 py-2.5">Crew</th>
              {SECTIONS.map((s) => (
                <th key={s.id} className="text-center font-medium px-2 py-2.5">
                  {s.shortName}
                </th>
              ))}
              <th className="text-left font-medium px-4 py-2.5">Reassign</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const color = getStatusColor(getMemberStatus(m));
              return (
                <tr key={m.id} className="border-b border-space-700/60 last:border-0">
                  <td className={`px-4 py-2 whitespace-nowrap ${m.id === selectedId ? 'text-white' : 'text-gray-400'}`}>
                    {m.avatar} {m.name}
                  </td>
                  {SECTIONS.map((s) => (
                    <td key={s.id} className="px-2 py-1.5 text-center">
                      {m.env === s.id ? (
                        <button
                          onClick={() => onSelectAstronaut(m.id)}
                          className={`w-full px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                            m.id === selectedId ? 'bg-nasa-blue/25 ring-1 ring-nasa-blue' : 'bg-space-900/60 hover:bg-space-700/60'
                          }`}
                          title="Open this astronaut"
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-gray-100">{m.task.name}</span>
                          </span>
                          <span className="block text-[10px] text-gray-500 font-mono">
                            {m.task.activity} · score {calculateHealthScore(m)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-space-500">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-1.5">
                    <TaskSelect
                      value={m.taskId}
                      onChange={(taskId) => onAssignTask(m.id, taskId)}
                      astronautId={m.id}
                      crewData={crewData}
                      records={records}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        One task per astronaut at a time; several astronauts can share the same task. Reassigning
        stores the finished session in Records and restarts monitoring with the limits for the new
        environment and activity level. One-time tasks can't be repeated once completed.
      </p>
    </div>
  );
}
