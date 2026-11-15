import { getStatusColor, getMemberStatus } from '../utils/helpers';
import { crewStatusLabel } from '../utils/metrics';

// One line with the rest of the mission crew: where they are and whether they are OK
export default function CrewmatesStrip({ member, crewData }) {
  const crewmates = Object.values(crewData).filter(
    (m) => m.missionId === member.missionId && m.id !== member.id
  );
  if (!crewmates.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-gray-500 mr-1">Crew</span>
      {crewmates.map((m) => {
        const status = getMemberStatus(m);
        const color = getStatusColor(status);
        return (
          <span
            key={m.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-space-800/80 border border-space-600 text-sm"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-200">{m.name.replace(/^(Dr|Eng)\. /, '')}</span>
            <span className="text-gray-500">· {m.task.name}</span>
            {status !== 'nominal' && <span style={{ color }}>· {crewStatusLabel[status]}</span>}
          </span>
        );
      })}
    </div>
  );
}
