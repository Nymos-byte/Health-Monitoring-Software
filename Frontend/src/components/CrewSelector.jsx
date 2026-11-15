import { getStatusColor, getStatusLabel } from '../utils/helpers';

export default function CrewSelector({ crewData, selectedId, selectedSection, onSelect }) {
  const members = Object.values(crewData);

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const isActive = member.id === selectedId;
        const secData = member.sections?.[selectedSection];
        const status = secData?.status || member.status || 'nominal';
        const statusColor = getStatusColor(status);
        const statusLabel = getStatusLabel(status);

        return (
          <button
            key={member.id}
            onClick={() => onSelect(member.id)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer
              ${
                isActive
                  ? 'bg-nasa-blue/20 border-nasa-blue shadow-lg shadow-nasa-blue/10'
                  : 'bg-space-800/60 border-space-600 hover:border-space-500 hover:bg-space-700/50'
              }
            `}
          >
            <span className="text-2xl">{member.avatar}</span>
            <div className="text-left">
              <div className="text-sm font-medium text-white">{member.name}</div>
              <div className="text-xs text-gray-400">
                {member.role} • <span className="font-mono text-gray-500">{member.astronautId}</span>
              </div>
            </div>
            <div className="ml-2 flex flex-col items-center">
              <div
                className="w-2.5 h-2.5 rounded-full mb-1"
                style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
              />
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
