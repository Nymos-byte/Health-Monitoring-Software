import { Database, Cpu } from 'lucide-react';

const STATUS_TEXT = {
  connecting: 'Connecting to Azure Cosmos DB…',
  unconfigured: 'Azure is not configured on this deployment · showing simulation',
  unreachable: 'Azure unreachable · showing simulation until it answers',
};

function formatAgo(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

// Where Ground Control's data comes from: the crew devices' uploads in Azure, or the local
// simulation (fallback switch for the demo)
export default function DataSourceBar({ source, onChangeSource, cloud, total, now }) {
  const azure = source === 'azure';
  const detail = !azure
    ? 'Local simulation only · Azure is not being read'
    : cloud.status === 'live'
      ? `${cloud.reporting} of ${total} astronauts reporting from their devices · checked ${formatAgo(now - cloud.fetchedAt)} · the rest simulated`
      : STATUS_TEXT[cloud.status];
  const healthy = !azure || cloud.status === 'live';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 rounded-xl border bg-space-800/60 border-space-600 text-sm">
      <span className="text-gray-400">Data</span>
      <div className="flex rounded-lg border border-space-600 overflow-hidden">
        {[
          { id: 'azure', label: 'Azure', icon: Database },
          { id: 'simulation', label: 'Simulation', icon: Cpu },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChangeSource(id)}
            className={`flex items-center gap-1.5 px-3 py-1 cursor-pointer ${
              source === id ? 'bg-space-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      <span className={healthy ? 'text-gray-400' : 'text-vital-orange'}>{detail}</span>
    </div>
  );
}
