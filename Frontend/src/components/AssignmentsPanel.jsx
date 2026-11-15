import { ChevronRight, AlertTriangle } from 'lucide-react';
import { MISSION_PHASES, MISSION_TYPES, getEnvironment } from '../data/mockData';
import { getStatusColor, getMemberStatus, calculateHealthScore } from '../utils/helpers';
import { getNextPhase, getEvaPartners } from '../utils/missions';
import TaskSelect from './TaskSelect';

// Crews by mission: each mission is in one phase, its crew shares that situation and splits
// into tasks. Phases only move forward, and the whole crew moves together.
export default function AssignmentsPanel({
  crewData,
  records,
  missions,
  selectedId,
  onSelectAstronaut,
  onAssignTask,
  onAdvancePhase,
}) {
  const members = Object.values(crewData);

  return (
    <div className="space-y-4">
      {Object.values(missions).map((mission) => {
        const order = MISSION_TYPES[mission.type];
        const current = order.indexOf(mission.phase);
        const next = getNextPhase(mission);
        const crew = members.filter((m) => m.missionId === mission.id);

        return (
          <div key={mission.id} className="bg-space-800/80 border border-space-600 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
              <div>
                <h3 className="font-semibold text-white">{mission.name}</h3>
                <p className="text-xs text-gray-500">
                  {mission.type} mission · {crew.length} crew · now in{' '}
                  <span className="text-gray-300">{MISSION_PHASES[mission.phase].label}</span>
                </p>
              </div>
              {next ? (
                <button
                  onClick={() => onAdvancePhase(mission.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-space-500 text-gray-300 hover:text-white hover:border-nasa-blue cursor-pointer"
                >
                  Advance crew to {MISSION_PHASES[next].label}
                  <ChevronRight size={14} />
                </button>
              ) : (
                <span className="text-xs text-gray-500">Mission complete</span>
              )}
            </div>

            {/* Phase timeline */}
            <ol className="flex flex-wrap gap-1 px-4 py-3">
              {order.map((phase, i) => (
                <li
                  key={phase}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    i === current
                      ? 'bg-nasa-blue text-white'
                      : i < current
                        ? 'bg-space-700 text-gray-400'
                        : 'border border-space-600 text-gray-600'
                  }`}
                >
                  {MISSION_PHASES[phase].label}
                </li>
              ))}
            </ol>

            <ul className="border-t border-space-700/60">
              {crew.map((m) => {
                const color = getStatusColor(getMemberStatus(m));
                const soloEva = m.task.eva && getEvaPartners(m, crewData).length === 0;
                return (
                  <li
                    key={m.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-space-700/40 last:border-0 ${
                      m.id === selectedId ? 'bg-nasa-blue/10' : ''
                    }`}
                  >
                    <button
                      onClick={() => onSelectAstronaut(m.id)}
                      className="flex items-center gap-2 min-w-[200px] text-left cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm text-gray-100">{m.name}</span>
                    </button>
                    <span className="text-xs text-gray-500 min-w-[150px]">
                      {getEnvironment(m.env).name} · score {calculateHealthScore(m)}
                    </span>
                    <TaskSelect
                      value={m.taskId}
                      onChange={(taskId) => onAssignTask(m.id, taskId)}
                      astronautId={m.id}
                      crewData={crewData}
                      records={records}
                      missions={missions}
                    />
                    {soloEva && (
                      <span className="flex items-center gap-1 text-xs text-vital-orange">
                        <AlertTriangle size={13} /> EVA without a partner
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-gray-500">
        A crew shares its mission phase; within it, astronauts split into tasks and several can share
        one. Spacewalks are done in pairs. Reassigning stores the finished session in Records;
        one-time tasks can't be repeated once completed.
      </p>
    </div>
  );
}
