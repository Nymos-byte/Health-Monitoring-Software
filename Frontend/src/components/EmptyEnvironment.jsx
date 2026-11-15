import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { getEnvironment, TASKS } from '../data/mockData';
import { canAssignTask } from '../hooks/useRealtimeVitals';
import { environmentIcons } from '../utils/metrics';
import EnvironmentPanel from './EnvironmentPanel';
import TaskSelect from './TaskSelect';

// Environment with nobody working in it: explain it and offer to assign someone
export default function EmptyEnvironment({ envId, crewData, records, recordsPanel, onAssignTask }) {
  const env = getEnvironment(envId);
  const Icon = environmentIcons[envId];
  const members = Object.values(crewData);
  // Suggest a task here that the chosen astronaut is still allowed to do
  const firstAvailableTask = (id) =>
    TASKS.find((t) => t.environment === envId && canAssignTask(records, id, t.id))?.id ?? '';
  const [astronautId, setAstronautId] = useState(members[0].id);
  const [taskId, setTaskId] = useState(() => firstAvailableTask(members[0].id));
  const current = crewData[astronautId];

  return (
    <div className="space-y-4">
      <div className="bg-space-800/80 border border-space-600 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Icon size={28} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-bold">{env.name}</h2>
            <p className="text-sm text-gray-400">
              {env.subtitle} · No crew assigned here right now
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400">Assign</span>
          <select
            value={astronautId}
            onChange={(e) => {
              setAstronautId(e.target.value);
              setTaskId(firstAvailableTask(e.target.value));
            }}
            className="bg-space-900 border border-space-600 rounded-md px-2 py-1 text-gray-200 cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <span className="text-gray-400">to</span>
          <TaskSelect
            value={taskId}
            onChange={setTaskId}
            envId={envId}
            astronautId={astronautId}
            crewData={crewData}
            records={records}
          />
          <button
            onClick={() => onAssignTask(astronautId, taskId)}
            disabled={!taskId || !canAssignTask(records, astronautId, taskId)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-nasa-blue enabled:hover:bg-nasa-blue/80 text-white enabled:cursor-pointer disabled:opacity-40"
          >
            <UserPlus size={15} />
            Assign
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {current.name} is currently on “{current.task.name}” ({getEnvironment(current.env).name}).
          An astronaut can only do one task at a time, so assigning ends that task.
        </p>
      </div>

      {recordsPanel}
      <EnvironmentPanel selectedSection={envId} />
    </div>
  );
}
