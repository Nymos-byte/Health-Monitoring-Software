import { Clock, Satellite, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SECTIONS } from '../data/mockData';

export default function Header({ selectedSection = 'space_station' }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcTime = time.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false });
  const activeSec = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];

  return (
    <header className="bg-space-800/90 backdrop-blur-md border-b border-space-600 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left — Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-nasa-blue flex items-center justify-center">
                  <Satellite size={20} className="text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-vital-green rounded-full border-2 border-space-800 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">
                  ASTRO<span className="text-nasa-blue">VITALS</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
                  Space Health Monitoring System
                </p>
              </div>
            </div>
          </div>

          {/* Center — Mission Information */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin size={14} className="text-vital-cyan" />
              <span className="text-xs font-mono">{activeSec.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={14} className="text-vital-purple" />
              <span className="text-xs font-mono">{activeSec.missionDayLabel}</span>
            </div>
          </div>

          {/* Right — UTC Clock & Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock size={14} />
                <span className="text-sm font-mono font-bold text-white">{utcTime}</span>
                <span className="text-[10px] text-gray-500">UTC</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-vital-green/10 border border-vital-green/30 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-vital-green animate-pulse" />
              <span className="text-[10px] font-mono text-vital-green uppercase tracking-wider">
                Systems Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
