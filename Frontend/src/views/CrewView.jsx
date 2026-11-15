import { useState, useEffect } from 'react';
import { HeartPulse, ClipboardList, Users, History, Settings, SatelliteDish, WifiOff } from 'lucide-react';
import {
  metricDefinitions,
  getVitalContext,
  getEnvironment,
  getTaskMetrics,
  getTaskPrimaryMetrics,
} from '../data/mockData';
import { getVitalStatus, getStatusColor, getMemberStatus } from '../utils/helpers';
import { criticalKey, getCriticalReadings } from '../utils/metrics';
import VitalsPage from './crew/VitalsPage';
import ActivityPage from './crew/ActivityPage';
import CrewPage from './crew/CrewPage';
import LogPage from './crew/LogPage';
import SettingsPage from './crew/SettingsPage';

const severityRank = { critical: 0, caution: 1, nominal: 2 };
const TEXT_SIZE_KEY = 'vitalx.crew.textSize';

const TABS = [
  { id: 'vitals', label: 'Vitals', icon: HeartPulse },
  { id: 'activity', label: 'Activity', icon: ClipboardList },
  { id: 'crew', label: 'Crew', icon: Users },
  { id: 'log', label: 'Log', icon: History },
];

function readTextSize() {
  try {
    return localStorage.getItem(TEXT_SIZE_KEY) || 'normal';
  } catch {
    return 'normal';
  }
}

// Crew display built for small cabin tablets and wrist/arm displays: a compact top bar,
// one focused page at a time and a bottom tab bar with large targets.
export default function CrewView({
  crewData,
  records,
  missions,
  links,
  now,
  selectedAstronaut,
  onSelectAstronaut,
  onAssignTask,
  onPlanTask,
  blinking,
  emergencies,
  onToggleEmergency,
  page,
  onChangePage,
  onOpenGround,
}) {
  const [textSize, setTextSize] = useState(readTextSize);
  const member = crewData[selectedAstronaut];
  const env = getEnvironment(member.env);
  const vitals = member.data.currentVitals;
  const context = getVitalContext(member, vitals);
  const link = links[member.env];

  // Larger text scales the whole crew display (Tailwind sizes are rem-based)
  useEffect(() => {
    document.documentElement.style.fontSize = textSize === 'large' ? '18px' : '';
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [textSize]);

  const handleTextSize = (size) => {
    setTextSize(size);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, size);
    } catch {
      // Storage unavailable: the choice still applies for this session
    }
  };

  // The readings follow the current task (e.g. suit telemetry during EVA)
  const numericMetrics = getTaskMetrics(member.task).filter((k) => !metricDefinitions[k].isCategorical);
  const primary = getTaskPrimaryMetrics(member.task);
  const secondary = numericMetrics.filter((k) => !primary.includes(k));
  const issues = numericMetrics
    .map((key) => ({ key, status: getVitalStatus(key, vitals[key], env.id, context) }))
    .filter((i) => i.status !== 'nominal')
    .sort(
      (a, b) =>
        severityRank[a.status] - severityRank[b.status] ||
        primary.includes(b.key) - primary.includes(a.key)
    );
  const rules = getCriticalReadings(crewData, { astronautId: member.id })
    .map((r) => r.rule)
    .filter(Boolean);
  const isBlinking = (key) => blinking.has(criticalKey(member.id, env.id, key));

  // Tab badges: my status on Vitals, the worst crewmate status on Crew
  const myStatus = getMemberStatus(member);
  const crewStatus = Object.values(crewData)
    .filter((m) => m.missionId === member.missionId && m.id !== member.id)
    .map((m) => getMemberStatus(m))
    .sort((a, b) => severityRank[a] - severityRank[b])[0];
  const badges = { vitals: myStatus, crew: crewStatus };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[480px] min-h-[100dvh] flex flex-col sm:border-x sm:border-space-700 bg-space-900/70">
        {/* Compact top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-3 h-16 bg-space-800/95 backdrop-blur border-b border-space-600">
          <span className="text-3xl">{member.avatar}</span>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-white truncate leading-tight">{member.name}</p>
            <p className="text-xs text-gray-400 truncate">
              {env.shortName} · {member.task.name}
            </p>
          </div>
          {link.status === 'aos' ? (
            <span className="flex flex-col items-center text-vital-green" title="Vitals are sent to ground automatically">
              <SatelliteDish size={20} />
              <span className="text-[10px] leading-tight">Sending</span>
            </span>
          ) : (
            <span className="flex flex-col items-center text-vital-orange" title="No ground link: vitals saved onboard">
              <WifiOff size={20} />
              <span className="text-[10px] leading-tight">Onboard</span>
            </span>
          )}
          <button
            onClick={() => onChangePage(page === 'settings' ? 'vitals' : 'settings')}
            className={`flex items-center justify-center w-12 h-12 rounded-xl cursor-pointer ${
              page === 'settings' ? 'bg-space-600 text-white' : 'text-gray-300 hover:bg-space-700'
            }`}
            aria-label="Settings"
          >
            <Settings size={24} />
          </button>
        </header>

        <main className="flex-1 px-3 py-3">
          {page === 'vitals' && (
            <VitalsPage
              vitals={vitals}
              envId={env.id}
              context={context}
              primary={primary}
              secondary={secondary}
              issues={issues}
              rules={rules}
              isBlinking={isBlinking}
            />
          )}
          {page === 'activity' && (
            <ActivityPage
              key={`${member.id}:${member.taskId}`}
              member={member}
              crewData={crewData}
              records={records}
              missions={missions}
              now={now}
              onAssignTask={onAssignTask}
              onPlanTask={onPlanTask}
            />
          )}
          {page === 'crew' && <CrewPage member={member} crewData={crewData} />}
          {page === 'log' && <LogPage key={member.id} member={member} records={records} />}
          {page === 'settings' && (
            <SettingsPage
              crewData={crewData}
              member={member}
              onSelectAstronaut={onSelectAstronaut}
              textSize={textSize}
              onTextSize={handleTextSize}
              emergencyActive={emergencies.has(member.id)}
              onToggleEmergency={() => onToggleEmergency(member.id)}
              onOpenGround={onOpenGround}
            />
          )}
        </main>

        {/* Bottom tab bar: thumb-reachable, large targets */}
        <nav className="sticky bottom-0 z-30 grid grid-cols-4 bg-space-800/95 backdrop-blur border-t border-space-600 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const badge = badges[id];
            return (
              <button
                key={id}
                onClick={() => onChangePage(id)}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[72px] cursor-pointer ${
                  page === id ? 'text-vital-cyan' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {page === id && <span className="absolute top-0 inset-x-4 h-1 rounded-b bg-vital-cyan" />}
                <span className="relative">
                  <Icon size={26} />
                  {badge && badge !== 'nominal' && (
                    <span
                      className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full border-2 border-space-800"
                      style={{ backgroundColor: getStatusColor(badge) }}
                    />
                  )}
                </span>
                <span className="text-sm">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
