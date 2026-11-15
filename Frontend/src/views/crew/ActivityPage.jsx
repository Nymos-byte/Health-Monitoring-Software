import { useState } from 'react';
import { Play, CalendarClock, X, Lock, Users } from 'lucide-react';
import { TASKS, getTask, getEnvironment } from '../../data/mockData';
import { formatDuration } from '../../utils/helpers';
import { getAllowedEnvironments, getEvaPartners, taskBlocker } from '../../utils/missions';

// What I'm doing now, what's next, and a one-column list of the activities this phase allows.
// Vitals are sent automatically; the astronaut only taps the activity when it changes.
export default function ActivityPage({ member, crewData, records, missions, now, onAssignTask, onPlanTask }) {
  const [pending, setPending] = useState(null);
  const allowed = getAllowedEnvironments(missions, member);
  const tasks = TASKS.filter((t) => allowed.includes(t.environment) && t.id !== member.taskId);
  const partners = getEvaPartners(member, crewData);
  const planned = member.plannedTaskId && getTask(member.plannedTaskId);
  const crewOn = (taskId) =>
    Object.values(crewData).filter(
      (m) => m.taskId === taskId && m.id !== member.id && m.missionId === member.missionId
    ).length;

  return (
    <div className="space-y-4">
      {/* Now */}
      <section className="p-4 rounded-2xl border-2 border-vital-cyan bg-vital-cyan/10">
        <p className="text-xs font-bold tracking-wider text-vital-cyan">NOW</p>
        <p className="text-2xl font-bold text-white leading-tight">{member.task.name}</p>
        <p className="text-gray-300">
          {member.task.activity} activity · {formatDuration(now - member.startedAt)}
        </p>
        {member.task.eva && (
          <p className={`mt-1 ${partners.length ? 'text-gray-300' : 'text-vital-orange font-semibold'}`}>
            {partners.length
              ? `With ${partners.map((p) => p.name).join(', ')}`
              : 'No EVA partner — do not go out alone'}
          </p>
        )}
      </section>

      {/* Next */}
      {planned && (
        <section className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border border-space-600 bg-space-800/60">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-wider text-gray-500">NEXT</p>
            <p className="text-lg text-white truncate">{planned.name}</p>
          </div>
          <button
            onClick={() => onPlanTask(member.id, null)}
            className="flex items-center justify-center w-14 h-14 rounded-xl text-gray-400 hover:text-white hover:bg-space-700 cursor-pointer"
            aria-label="Clear next activity"
          >
            <X size={26} />
          </button>
        </section>
      )}

      {/* Change activity */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-gray-500">Change activity</h3>
        {tasks.map((task) => {
          const blocked = taskBlocker(records, missions, member, task.id) !== null;
          const others = crewOn(task.id);
          return (
            <button
              key={task.id}
              disabled={blocked}
              onClick={() => setPending(task.id)}
              className={`w-full min-h-[64px] px-4 py-3 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                pending === task.id
                  ? 'border-nasa-blue bg-nasa-blue/20'
                  : blocked
                    ? 'border-space-700 opacity-40'
                    : 'border-space-600 bg-space-800/40 hover:bg-space-700/50 cursor-pointer'
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-white leading-tight">{task.name}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
                  {task.activity}
                  {allowed.length > 1 && <span>· {getEnvironment(task.environment).shortName}</span>}
                  {task.eva && <span>· in pairs</span>}
                  {blocked && <span>· done</span>}
                  {others > 0 && (
                    <span className="flex items-center gap-1">
                      · <Users size={13} /> {others}
                    </span>
                  )}
                </span>
              </span>
              {task.id === member.plannedTaskId && (
                <span className="shrink-0 px-2 py-0.5 rounded-md border border-vital-cyan text-vital-cyan text-xs font-bold">
                  NEXT
                </span>
              )}
              {blocked && <Lock size={18} className="shrink-0 text-gray-500" />}
            </button>
          );
        })}
      </section>

      {/* Bottom sheet above the tab bar: big targets, and a stray tap changes nothing */}
      {pending && (
        <div className="fixed inset-x-0 bottom-[76px] z-40 mx-auto w-full max-w-[480px] px-3">
          <div className="p-4 rounded-2xl bg-space-800 border-2 border-nasa-blue shadow-2xl shadow-black/60 space-y-3">
            <p className="text-lg text-white">
              <span className="text-gray-400">Switch to </span>
              {getTask(pending).name}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onAssignTask(member.id, pending);
                  setPending(null);
                }}
                className="flex items-center justify-center gap-2 min-h-[60px] rounded-xl bg-nasa-blue hover:bg-nasa-blue/80 text-white text-lg font-semibold cursor-pointer"
              >
                <Play size={22} /> Start now
              </button>
              <button
                onClick={() => {
                  onPlanTask(member.id, pending);
                  setPending(null);
                }}
                className="flex items-center justify-center gap-2 min-h-[60px] rounded-xl border-2 border-space-500 hover:border-vital-cyan text-gray-100 text-lg cursor-pointer"
              >
                <CalendarClock size={22} /> Next
              </button>
            </div>
            <button
              onClick={() => setPending(null)}
              className="w-full min-h-[52px] rounded-xl text-gray-400 hover:text-white hover:bg-space-700 text-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
