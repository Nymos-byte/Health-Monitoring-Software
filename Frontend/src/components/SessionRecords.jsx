import { useState } from 'react';
import { ChevronDown, Lock, RefreshCw } from 'lucide-react';
import HistoryPanel from './HistoryPanel';
import VitalCards from './VitalCards';
import {
  metricDefinitions,
  getVitalContext,
  getTaskMetrics,
  getTaskPrimaryMetrics,
} from '../data/mockData';
import { getVitalStatus, getStatusColor, formatTimestamp, formatDuration } from '../utils/helpers';
import { formatMetricValue } from '../utils/metrics';

// Recorded readings never blink: the emergency, if any, was handled live
const NO_BLINK = new Set();

// Completed task sessions kept on the ground. A repeatable task keeps its latest session until
// the astronaut does it again; a one-time task keeps its record for good.
export default function SessionRecords({ records, crewData, title }) {
  const [open, setOpen] = useState(null);
  const sorted = [...records].sort((a, b) => b.endedAt - a.endedAt);

  return (
    <div className="bg-space-800/80 border border-space-600 rounded-xl">
      <h3 className="px-4 pt-3 pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
        {title} <span className="text-gray-600">· {records.length}</span>
      </h3>
      {sorted.length === 0 && (
        <p className="px-4 pb-4 text-sm text-gray-500">No completed sessions recorded yet.</p>
      )}
      <ul>
        {sorted.map((record) => {
          const { member } = record;
          const vitals = member.data.currentVitals;
          const context = getVitalContext(member, vitals);
          const repeatingNow = crewData[member.id].taskId === member.taskId;
          const isOpen = open === record.key;

          return (
            <li key={record.key} className="border-t border-space-700/60">
              <button
                onClick={() => setOpen(isOpen ? null : record.key)}
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-space-700/30 cursor-pointer"
              >
                <span className="flex items-center gap-2 min-w-[220px]">
                  <span className="text-xl">{member.avatar}</span>
                  <span>
                    <span className="block text-sm text-white">{member.task.name}</span>
                    <span className="block text-[11px] text-gray-500">{member.name}</span>
                  </span>
                </span>

                <span className="text-[11px] text-gray-400">
                  Ended {formatTimestamp(new Date(record.endedAt).toISOString())} ·{' '}
                  {formatDuration(record.endedAt - record.startedAt)}
                </span>

                {member.task.once ? (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Lock size={12} /> One-time · final record
                  </span>
                ) : repeatingNow ? (
                  <span className="flex items-center gap-1 text-[11px] text-vital-cyan">
                    <RefreshCw size={12} /> Being repeated now · updates when it ends
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <RefreshCw size={12} /> Latest session · updates if repeated
                  </span>
                )}

                <span className="ml-auto flex flex-wrap items-center gap-3 font-mono text-xs">
                  {getTaskPrimaryMetrics(member.task).map((key) => {
                    const status = getVitalStatus(key, vitals[key], member.env, context);
                    return (
                      <span key={key} style={{ color: status === 'nominal' ? 'var(--color-gray-300)' : getStatusColor(status) }}>
                        {metricDefinitions[key].label.split(' (')[0]} {formatMetricValue(key, vitals)}
                      </span>
                    );
                  })}
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <VitalCards
                    title="Last recorded readings"
                    metrics={getTaskPrimaryMetrics(member.task)}
                    vitals={vitals}
                    astronautId={member.id}
                    selectedSection={member.env}
                    context={context}
                    blinking={NO_BLINK}
                    size="lg"
                  />
                  <VitalCards
                    metrics={getTaskMetrics(member.task).filter(
                      (k) => !metricDefinitions[k].isCategorical && !getTaskPrimaryMetrics(member.task).includes(k)
                    )}
                    vitals={vitals}
                    astronautId={member.id}
                    selectedSection={member.env}
                    context={context}
                    blinking={NO_BLINK}
                  />
                  <HistoryPanel
                    vitals={member.data.vitals}
                    metrics={getTaskMetrics(member.task).filter((k) => !metricDefinitions[k].isCategorical)}
                    defaultMetric={getTaskPrimaryMetrics(member.task)[0]}
                    selectedSection={member.env}
                    context={context}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
