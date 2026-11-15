import { useState } from 'react';
import { ClipboardList, Play, CalendarClock, X } from 'lucide-react';
import { getTask, TASKS } from '../data/mockData';
import { formatDuration } from '../utils/helpers';
import { canAssignTask, getAllowedEnvironments, getEvaPartners } from '../utils/missions';
import TaskSelect from './TaskSelect';

// What the astronaut is doing, and how they tell ground what they start now or will do next
export default function CrewActivityPanel({
  member,
  crewData,
  records,
  missions,
  now,
  onAssignTask,
  onPlanTask,
}) {
  const allowed = getAllowedEnvironments(missions, member);
  const firstOther = () =>
    TASKS.find(
      (t) =>
        t.id !== member.taskId &&
        allowed.includes(t.environment) &&
        canAssignTask(records, missions, member, t.id)
    )?.id ?? '';
  const [choice, setChoice] = useState(() => member.plannedTaskId || firstOther());
  const partners = getEvaPartners(member, crewData);
  const planned = member.plannedTaskId && getTask(member.plannedTaskId);
  const canReport = choice && choice !== member.taskId && canAssignTask(records, missions, member, choice);

  return (
    <div className="bg-space-800/60 border border-space-600 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Now</p>
          <p className="flex items-center gap-2 text-xl font-semibold text-white">
            <ClipboardList size={20} className="text-vital-cyan" />
            {member.task.name}
          </p>
          <p className="text-sm text-gray-400">
            {member.task.activity} activity · for {formatDuration(now - member.startedAt)}
          </p>
          {member.task.eva && (
            <p className={`text-sm mt-0.5 ${partners.length ? 'text-gray-400' : 'text-vital-orange'}`}>
              {partners.length
                ? `With ${partners.map((p) => p.name).join(', ')}`
                : 'No EVA partner assigned — do not go out alone'}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-gray-500">Up next</p>
          {planned ? (
            <p className="flex items-center justify-end gap-2 text-gray-200">
              {planned.name}
              <button
                onClick={() => onPlanTask(member.id, null)}
                className="p-1 rounded hover:bg-space-700 text-gray-500 hover:text-white cursor-pointer"
                title="Clear next activity"
              >
                <X size={14} />
              </button>
            </p>
          ) : (
            <p className="text-gray-500">Not reported</p>
          )}
        </div>
      </div>

      {/* Report to ground */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-space-700">
        <TaskSelect
          value={choice}
          onChange={setChoice}
          astronautId={member.id}
          crewData={crewData}
          records={records}
          missions={missions}
          className="min-w-[220px]"
        />
        <button
          onClick={() => {
            if (onAssignTask(member.id, choice)) setChoice('');
          }}
          disabled={!canReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nasa-blue text-white text-sm enabled:hover:bg-nasa-blue/80 enabled:cursor-pointer disabled:opacity-40"
        >
          <Play size={15} /> Start now
        </button>
        <button
          onClick={() => onPlanTask(member.id, choice)}
          disabled={!canReport || choice === member.plannedTaskId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-space-500 text-gray-200 text-sm enabled:hover:border-vital-cyan enabled:cursor-pointer disabled:opacity-40"
        >
          <CalendarClock size={15} /> Set as next
        </button>
        <span className="text-xs text-gray-500">Mission Control sees this as soon as the link allows.</span>
      </div>
    </div>
  );
}
