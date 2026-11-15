import { useState } from 'react';
import { Play, CalendarClock, X, Lock, Users } from 'lucide-react';
import { TASKS, getTask, getEnvironment } from '../data/mockData';
import { formatDuration } from '../utils/helpers';
import { getAllowedEnvironments, getEvaPartners, taskBlocker } from '../utils/missions';

// What the astronaut is doing, and a glove-friendly way to tell ground when it changes.
// Vitals are sent automatically; the astronaut only taps the activity they are in.
export default function CrewActivityPanel({
  member,
  crewData,
  records,
  missions,
  now,
  onAssignTask,
  onPlanTask,
}) {
  const [pending, setPending] = useState(null);
  const allowed = getAllowedEnvironments(missions, member);
  const tasks = TASKS.filter((t) => allowed.includes(t.environment));
  const partners = getEvaPartners(member, crewData);
  const planned = member.plannedTaskId && getTask(member.plannedTaskId);
  const showEnvironment = allowed.length > 1;

  return (
    <div className="bg-space-800/60 border border-space-600 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wider text-gray-500">What are you doing?</p>
          {member.task.eva && (
            <p className={`mt-1 ${partners.length ? 'text-gray-300' : 'text-vital-orange'}`}>
              {partners.length
                ? `EVA with ${partners.map((p) => p.name).join(', ')}`
                : 'No EVA partner assigned — do not go out alone'}
            </p>
          )}
        </div>
        {planned && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-vital-cyan/40 bg-vital-cyan/5">
            <span className="text-gray-300">
              Next: <span className="text-white font-medium">{planned.name}</span>
            </span>
            <button
              onClick={() => onPlanTask(member.id, null)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-space-700 text-gray-400 hover:text-white cursor-pointer"
              aria-label="Clear next activity"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Large tap targets: one card per activity this mission phase allows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map((task) => {
          const isNow = task.id === member.taskId;
          const isNext = task.id === member.plannedTaskId;
          const blocked = !isNow && taskBlocker(records, missions, member, task.id) !== null;
          const others = Object.values(crewData).filter(
            (m) => m.taskId === task.id && m.id !== member.id && m.missionId === member.missionId
          ).length;
          const isPending = pending === task.id;

          return (
            <button
              key={task.id}
              disabled={isNow || blocked}
              onClick={() => setPending(isPending ? null : task.id)}
              className={`min-h-[84px] p-4 rounded-xl border-2 text-left transition-colors ${
                isNow
                  ? 'border-vital-cyan bg-vital-cyan/10'
                  : isPending
                    ? 'border-nasa-blue bg-nasa-blue/20 cursor-pointer'
                    : blocked
                      ? 'border-space-700 opacity-40'
                      : 'border-space-600 hover:border-space-500 hover:bg-space-700/40 cursor-pointer'
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold text-white leading-tight">{task.name}</span>
                {isNow && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-vital-cyan text-space-900 text-xs font-bold">
                    NOW
                  </span>
                )}
                {isNext && !isNow && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md border border-vital-cyan text-vital-cyan text-xs font-bold">
                    NEXT
                  </span>
                )}
                {blocked && <Lock size={16} className="shrink-0 text-gray-500" />}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
                {task.activity}
                {showEnvironment && <span>· {getEnvironment(task.environment).shortName}</span>}
                {isNow && <span className="text-vital-cyan">· {formatDuration(now - member.startedAt)}</span>}
                {task.eva && <span>· in pairs</span>}
                {blocked && <span>· done</span>}
                {others > 0 && (
                  <span className="flex items-center gap-1">
                    · <Users size={13} /> {others}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confirm step so a stray tap with gloves doesn't change the activity */}
      {pending && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-nasa-blue/10 border border-nasa-blue/50">
          <span className="text-lg text-white mr-auto">{getTask(pending).name}</span>
          <button
            onClick={() => {
              onAssignTask(member.id, pending);
              setPending(null);
            }}
            className="flex items-center gap-2 px-6 py-4 rounded-xl bg-nasa-blue hover:bg-nasa-blue/80 text-white text-lg font-semibold cursor-pointer"
          >
            <Play size={22} /> Start now
          </button>
          <button
            onClick={() => {
              onPlanTask(member.id, pending);
              setPending(null);
            }}
            className="flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-space-500 hover:border-vital-cyan text-gray-100 text-lg cursor-pointer"
          >
            <CalendarClock size={22} /> Next
          </button>
          <button
            onClick={() => setPending(null)}
            className="px-6 py-4 rounded-xl text-gray-400 hover:text-white text-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
