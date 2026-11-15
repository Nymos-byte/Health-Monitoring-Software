import {
  getStatusColor,
  getStatusLabel,
  getMemberStatus,
  calculateHealthScore,
} from '../utils/helpers';
import { getEnvironment, MISSION_PHASES } from '../data/mockData';
import { getEvaPartners } from '../utils/missions';
import TaskSelect from './TaskSelect';

export default function AstronautProfile({ member, crewData, records, missions, onAssignTask }) {
  if (!member) return null;

  const cv = member.data.currentVitals;
  const env = getEnvironment(member.env);
  const status = getMemberStatus(member);
  const statusColor = getStatusColor(status);
  const healthScore = calculateHealthScore(member);
  const mission = missions[member.missionId];
  const partners = getEvaPartners(member, crewData);

  const facts = [
    `${mission.name} · ${MISSION_PHASES[mission.phase].label}`,
    member.role,
    `${member.age} yrs · ${member.nationality}`,
    env.missionDayLabel,
    member.env === 'spacecraft' && cv.flight_phase && `Phase: ${cv.flight_phase}`,
    member.task.evaLocation && `EVA: ${member.task.evaLocation}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-4 bg-space-800/80 border border-space-600 rounded-xl px-5 py-4">
      <span className="text-4xl">{member.avatar}</span>
      <div className="flex-1 min-w-[240px]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-white">{member.name}</h2>
          <span className="text-[11px] font-mono text-gray-500">{member.astronautId}</span>
          {cv.event && cv.event !== 'Normal' && (
            <span className="px-2 py-0.5 text-[11px] rounded bg-vital-orange/10 border border-vital-orange/40 text-vital-orange">
              {cv.event.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">{facts.join('  ·  ')}</p>
        <label className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
          Current task
          <TaskSelect
            value={member.taskId}
            onChange={(taskId) => onAssignTask(member.id, taskId)}
            astronautId={member.id}
            crewData={crewData}
            records={records}
            missions={missions}
          />
          <span className="text-xs text-gray-500">
            ({env.name} · {member.task.activity} activity)
          </span>
        </label>
        {member.task.eva && (
          <p className={`mt-1 text-xs ${partners.length ? 'text-gray-400' : 'text-vital-orange'}`}>
            {partners.length
              ? `EVA partner: ${partners.map((p) => p.name).join(', ')}`
              : 'EVA without a partner — spacewalks are done in pairs; assign a crewmate'}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-3xl font-bold font-mono" style={{ color: statusColor }}>
          {healthScore}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor }}>
          {getStatusLabel(status)} · score
        </div>
      </div>
    </div>
  );
}
