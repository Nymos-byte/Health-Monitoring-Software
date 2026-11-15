import { Clock, MonitorDot, User, Watch } from 'lucide-react';
import { useState, useEffect } from 'react';

const VIEWS = [
  { id: 'ground', label: 'Ground Control', icon: MonitorDot },
  { id: 'crew', label: 'Crew Display', icon: User },
  { id: 'wrist', label: 'Wrist', icon: Watch },
];

export default function Header({ view, onChangeView }) {
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
            alt="Vital-X — Space Health Monitoring System"
            className="h-8 sm:h-10 w-auto"
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

        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={14} />
          <span className="text-sm font-mono font-bold text-white">{utcTime}</span>
          <span className="text-[10px] text-gray-500">UTC</span>
        </div>
      </div>
    </header>
  );
}
