import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  metricDefinitions,
  getEnvironment,
  getTaskMetrics,
  getTaskPrimaryMetrics,
  getVitalContext,
} from '../../data/mockData';
import { formatTimestamp, formatDuration } from '../../utils/helpers';
import CrewVitalTile from '../../components/CrewVitalTile';
import { ReadingRow } from './VitalsPage';

// My previous activities with the last readings recorded in each, shown like the live ones
export default function LogPage({ member, records }) {
  const mine = Object.values(records)
    .filter((r) => r.member.id === member.id)
    .sort((a, b) => b.endedAt - a.endedAt);
  const [selectedKey, setSelectedKey] = useState(mine[0]?.key);
  const selected = mine.find((r) => r.key === selectedKey) ?? mine[0];

  if (!selected) {
    return <p className="text-gray-400 text-lg py-8 text-center">No previous activities yet.</p>;
  }

  const recorded = selected.member;
  const vitals = recorded.data.currentVitals;
  const context = getVitalContext(recorded, vitals);
  const primary = getTaskPrimaryMetrics(recorded.task);
  const others = getTaskMetrics(recorded.task).filter(
    (k) => !metricDefinitions[k].isCategorical && !primary.includes(k)
  );

  return (
    <div className="space-y-3">
      {/* Swipeable row of activities, newest first */}
      <div className="-mx-3 px-3 flex gap-2 overflow-x-auto no-scrollbar">
        {mine.map((r) => (
          <button
            key={r.key}
            onClick={() => setSelectedKey(r.key)}
            className={`shrink-0 min-h-[52px] px-4 rounded-xl border-2 text-base cursor-pointer whitespace-nowrap ${
              r.key === selected.key
                ? 'bg-nasa-blue/25 border-nasa-blue text-white'
                : 'border-space-600 text-gray-400'
            }`}
          >
            {r.member.task.name}
          </button>
        ))}
      </div>

      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-gray-400">
        {getEnvironment(recorded.env).name} · {formatTimestamp(new Date(selected.endedAt).toISOString())} ·{' '}
        {formatDuration(selected.endedAt - selected.startedAt)}
        {recorded.task.once && (
          <span className="flex items-center gap-1">
            · <Lock size={13} /> one-time
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {primary.map((key) => (
          <CrewVitalTile key={key} metricKey={key} vitals={vitals} sectionId={recorded.env} context={context} />
        ))}
      </div>

      {others.length > 0 && (
        <section className="rounded-2xl bg-space-800/60 border border-space-600 px-4 py-2">
          {others.map((key) => (
            <ReadingRow key={key} metricKey={key} vitals={vitals} sectionId={recorded.env} context={context} />
          ))}
        </section>
      )}
    </div>
  );
}
