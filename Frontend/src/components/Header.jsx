import { Clock, MonitorDot, User, Watch, Database, CloudOff } from 'lucide-react';
import { useState, useEffect } from 'react';

const VIEWS = [
  { id: 'ground', label: 'Ground Control', icon: MonitorDot },
  { id: 'crew', label: 'Crew Display', icon: User },
  { id: 'wrist', label: 'Wrist', icon: Watch },
];

export default function Header({ view, onChangeView, blackBox, wearer }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcTime = time.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false });

  return (
    <header className="bg-space-800/90 backdrop-blur-md border-b border-space-600 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="shrink-0">
          <img
            src="/logo-vitalx.png"
            alt="Vital-X — Space Health Monitoring System (AI-generated logo)"
            className="h-10 sm:h-12 w-auto"
          />
        </h1>

        {/* View switch */}
        <nav className="flex p-1 bg-space-900/80 border border-space-600 rounded-xl">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChangeView(id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                view === id ? 'bg-nasa-blue text-on-accent' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Black box on the selected astronaut's device: what it holds and whether it reaches ground */}
          <span
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
              blackBox.connected && blackBox.cloud === 'synced'
                ? 'border-vital-green/40 text-vital-green'
                : 'border-vital-orange/50 text-vital-orange'
            }`}
            title={`Black box on ${wearer.name}'s device`}
          >
            {blackBox.connected ? <Database size={13} /> : <CloudOff size={13} />}
            Black box
            <span className="text-gray-400">
              {!blackBox.connected
                ? `· no link · ${blackBox.stored} stored onboard`
                : blackBox.cloud === 'unconfigured'
                  ? `· ${blackBox.stored} waiting · cloud not configured`
                  : blackBox.cloud === 'unreachable'
                    ? `· ${blackBox.stored} waiting · cloud unreachable`
                    : blackBox.lastSync
                      ? `· synced ${blackBox.lastSync.count} to ground`
                      : '· live'}
            </span>
          </span>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} />
            <span className="text-sm font-mono font-bold text-white">{utcTime}</span>
            <span className="text-[10px] text-gray-500">UTC</span>
          </div>
        </div>
      </div>
    </header>
  );
}
