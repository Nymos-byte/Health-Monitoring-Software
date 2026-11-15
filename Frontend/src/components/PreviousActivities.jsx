import { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { getEnvironment, getTaskPrimaryMetrics, getVitalContext } from '../data/mockData';
import { formatTimestamp, formatDuration } from '../utils/helpers';
import CrewVitalTile from './CrewVitalTile';

// The astronaut's last recorded readings for each activity they have done, shown with the same
// large tiles as the live readings. One activity at a time, so the screen stays calm.
export default function PreviousActivities({ member, records }) {
  const [open, setOpen] = useState(false);
  const mine = Object.values(records)
    .filter((r) => r.member.id === member.id)
    .sort((a, b) => b.endedAt - a.endedAt);
  const [selectedKey, setSelectedKey] = useState(mine[0]?.key);
  const selected = mine.find((r) => r.key === selectedKey) ?? mine[0];

  if (!mine.length) return null;

  return (
    <div className="bg-space-800/60 border border-space-600 rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
      >
        <span className="text-gray-300">
          Previous activities <span className="text-gray-500">· {mine.length}</span>
        </span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {mine.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedKey(r.key)}
                className={`px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${
                  r.key === selected.key
                    ? 'bg-nasa-blue/25 border-nasa-blue text-white'
                    : 'border-space-600 text-gray-400 hover:text-white'
                }`}
              >
                {r.member.task.name}
              </button>
            ))}
          </div>

          <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
            {getEnvironment(selected.member.env).name} · last recorded{' '}
            {formatTimestamp(new Date(selected.endedAt).toISOString())} · lasted{' '}
            {formatDuration(selected.endedAt - selected.startedAt)}
            {selected.member.task.once && (
              <span className="flex items-center gap-1 text-gray-500">
                · <Lock size={13} /> one-time
              </span>
            )}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {getTaskPrimaryMetrics(selected.member.task).map((key) => (
              <CrewVitalTile
                key={key}
                metricKey={key}
                vitals={selected.member.data.currentVitals}
                sectionId={selected.member.env}
                context={getVitalContext(selected.member, selected.member.data.currentVitals)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
