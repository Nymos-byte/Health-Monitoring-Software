import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Siren, SatelliteDish, WifiOff, Play, CalendarClock } from 'lucide-react';
import {
  TASKS,
  getTask,
  metricDefinitions,
  getVitalContext,
  getTaskMetrics,
} from '../data/mockData';
import { getVitalStatus, getStatusColor, getMemberStatus, formatDuration } from '../utils/helpers';
import { crewLabels, crewStatusLabel, formatMetricValue, getCrewAdvice } from '../utils/metrics';
import { getAllowedEnvironments, taskBlocker } from '../utils/missions';
import { THEMES } from '../utils/theme';

const SWIPE_PX = 40;
// How long the stabilisation instruction stays up after acknowledging an emergency
const INSTRUCTION_MS = 12000;
// Labels short enough for a watch-size screen
const WRIST_LABELS = { spo2_pct: 'SpO₂', suit_pressure_psia: 'Suit' };

// Watch-size display worn on the wrist: one idea per screen, changed by swiping or with the
// side button, so nothing depends on hitting small targets. Emergencies take over the screen.
export default function WristView({
  crewData,
  records,
  missions,
  links,
  now,
  selectedAstronaut,
  onSelectAstronaut,
  onAssignTask,
  onPlanTask,
  emergencies,
  onToggleEmergency,
  criticals,
  onAcknowledgeCritical,
  onChangeView,
  themeChoice,
  onThemeChoice,
}) {
  const member = crewData[selectedAstronaut];
  const vitals = member.data.currentVitals;
  const context = getVitalContext(member, vitals);
  const issues = getTaskMetrics(member.task)
    .filter((k) => !metricDefinitions[k].isCategorical)
    .map((key) => ({ key, status: getVitalStatus(key, vitals[key], member.env, context) }))
    .filter((i) => i.status !== 'nominal')
    .sort((a, b) => (a.status === 'critical' ? -1 : 0) - (b.status === 'critical' ? -1 : 0));

  // The alerts screen only exists while there is something to show
  const pages = ['status', 'activity', 'crew', ...(issues.length ? ['alerts'] : [])];
  const [page, setPage] = useState('status');
  // Shown right after OK: what to do to stabilise
  const [instruction, setInstruction] = useState(null);

  useEffect(() => {
    if (!instruction) return;
    const timer = setTimeout(() => setInstruction(null), INSTRUCTION_MS);
    return () => clearTimeout(timer);
  }, [instruction]);
  const index = Math.max(0, pages.indexOf(page));
  const go = (step) => setPage(pages[(index + step + pages.length) % pages.length]);

  // Keyboard arrows stand in for the side button on a desktop demo
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goRef.current(1);
      if (e.key === 'ArrowLeft') goRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Haptic alert when a new emergency appears (where the device supports vibration)
  const criticalIds = criticals.map((c) => c.id).join(',');
  useEffect(() => {
    if (!criticalIds) return;
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      // Vibration unavailable: the red screen is the alert
    }
  }, [criticalIds]);

  const swipeStart = useRef(null);
  const onPointerDown = (e) => {
    swipeStart.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-8 px-4 py-8">
      {/* Watch body */}
      <div className="relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-16 w-40 h-20 rounded-t-3xl bg-[#2a2c2f]" />
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-16 w-40 h-20 rounded-b-3xl bg-[#2a2c2f]" />
        <button
          onClick={() => go(1)}
          className="absolute -right-3 top-20 w-3 h-14 rounded-r-lg bg-[#5c6066] hover:bg-[#767a80] cursor-pointer"
          aria-label="Side button: next screen"
        />
        <div className="relative p-[6px] rounded-[58px] bg-[#3a3d41] shadow-2xl shadow-black/60">
          <div
            className="relative w-[220px] h-[268px] rounded-[52px] overflow-hidden bg-space-900 select-none touch-pan-y"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            {criticals.length > 0 ? (
              <EmergencyScreen
                criticals={criticals}
                onAcknowledge={() => {
                  setInstruction(stabiliseInstruction(criticals[0]));
                  onAcknowledgeCritical(criticals.map((c) => c.id));
                  setPage('status');
                }}
              />
            ) : instruction ? (
              <InstructionScreen instruction={instruction} onDone={() => setInstruction(null)} />
            ) : (
              <>
                {pages[index] === 'status' && (
                  <StatusScreen member={member} vitals={vitals} context={context} issues={issues} link={links[member.env]} />
                )}
                {pages[index] === 'activity' && (
                  <ActivityScreen
                    key={member.taskId}
                    member={member}
                    records={records}
                    missions={missions}
                    now={now}
                    onAssignTask={onAssignTask}
                    onPlanTask={onPlanTask}
                  />
                )}
                {pages[index] === 'crew' && <CrewScreen member={member} crewData={crewData} />}
                {pages[index] === 'alerts' && (
                  <AlertsScreen issues={issues} vitals={vitals} member={member} context={context} />
                )}
                {/* Page dots */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
                  {pages.map((p, i) => (
                    <span
                      key={p}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i === index ? (p === 'alerts' ? 'bg-vital-orange' : 'bg-white') : 'bg-space-500'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Demo controls, outside the device */}
      <div className="mt-8 w-full max-w-sm space-y-3 text-sm">
        <p className="text-center text-gray-500">Swipe the screen, press the side button or use ← →</p>
        <select
          value={selectedAstronaut}
          onChange={(e) => onSelectAstronaut(e.target.value)}
          className="w-full bg-space-800 border border-space-600 rounded-lg px-3 py-2 text-gray-200"
        >
          {Object.values(crewData).map((m) => (
            <option key={m.id} value={m.id}>Worn by {m.name}</option>
          ))}
        </select>
        <select
          value={themeChoice}
          onChange={(e) => onThemeChoice(e.target.value)}
          className="w-full bg-space-800 border border-space-600 rounded-lg px-3 py-2 text-gray-200"
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>Colours: {t.label} — {t.hint}</option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onToggleEmergency(member.id)}
            className={`py-2 rounded-lg border cursor-pointer ${
              emergencies.has(member.id) ? 'border-vital-red text-vital-red' : 'border-space-600 text-gray-300'
            }`}
          >
            {emergencies.has(member.id) ? 'End emergency' : 'Emergency'}
          </button>
          <button
            onClick={() => onChangeView('crew')}
            className="py-2 rounded-lg border border-space-600 text-gray-300 cursor-pointer"
          >
            Crew tablet
          </button>
          <button
            onClick={() => onChangeView('ground')}
            className="py-2 rounded-lg border border-space-600 text-gray-300 cursor-pointer"
          >
            Ground
          </button>
        </div>
      </div>
    </main>
  );
}

// Overall state as a coloured ring around the heart rate, oxygen underneath
function StatusScreen({ member, vitals, context, issues, link }) {
  const status = getMemberStatus(member);
  const color = getStatusColor(status);
  const second = member.task.eva ? 'suit_pressure_psia' : 'spo2_pct';
  const secondStatus = getVitalStatus(second, vitals[second], member.env, context);
  const r = 56;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="h-full flex flex-col items-center pt-5">
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: link.status === 'aos' ? 'var(--color-vital-green)' : 'var(--color-vital-orange)' }}>
        {link.status === 'aos' ? <SatelliteDish size={12} /> : <WifiOff size={12} />}
        {link.status === 'aos' ? 'Sending' : 'Saved onboard'}
      </div>
      <div className="relative mt-1">
        <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
          <circle cx="68" cy="68" r={r} fill="none" style={{ stroke: 'var(--color-space-700)' }} strokeWidth="10" />
          <circle
            cx="68"
            cy="68"
            r={r}
            fill="none"
            style={{ stroke: color }}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={status === 'nominal' ? 0 : circumference * 0.25}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-mono leading-none">{formatMetricValue('heart_rate_bpm', vitals)}</span>
          <span className="text-xs text-gray-400">bpm</span>
        </div>
      </div>
      <p className="mt-1 text-lg font-mono" style={{ color: secondStatus === 'nominal' ? 'var(--color-white)' : getStatusColor(secondStatus) }}>
        {WRIST_LABELS[second]} {formatMetricValue(second, vitals)}
        <span className="text-xs text-gray-500 ml-1">{metricDefinitions[second].unit}</span>
      </p>
      <p className="text-sm font-semibold truncate max-w-[180px]" style={{ color }}>
        {issues.length ? `${crewStatusLabel[status]} · ${crewLabels[issues[0].key]}` : 'All normal'}
      </p>
    </div>
  );
}

// Current activity; changing it is a short list of big rows and a confirmation
function ActivityScreen({ member, records, missions, now, onAssignTask, onPlanTask }) {
  const [step, setStep] = useState('now');
  const [choice, setChoice] = useState(null);
  const allowed = getAllowedEnvironments(missions, member);
  const options = TASKS.filter(
    (t) =>
      allowed.includes(t.environment) &&
      t.id !== member.taskId &&
      taskBlocker(records, missions, member, t.id) === null
  );
  const planned = member.plannedTaskId && getTask(member.plannedTaskId);

  if (step === 'pick') {
    return (
      <div className="h-full flex flex-col pt-5 pb-7 px-3">
        <button onClick={() => setStep('now')} className="flex items-center gap-1 h-10 px-2 text-gray-300 cursor-pointer">
          <ChevronLeft size={20} /> Back
        </button>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-2">
          {options.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setChoice(t.id);
                setStep('confirm');
              }}
              className="w-full min-h-[52px] px-3 rounded-2xl bg-space-700 text-left text-base leading-tight cursor-pointer active:bg-space-600"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="h-full flex flex-col justify-center gap-2 px-4 pb-4">
        <p className="text-center text-base leading-tight mb-1">{getTask(choice).name}</p>
        <button
          onClick={() => onAssignTask(member.id, choice)}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-nasa-blue text-on-accent text-lg font-semibold cursor-pointer"
        >
          <Play size={20} /> Start
        </button>
        <button
          onClick={() => {
            onPlanTask(member.id, choice);
            setStep('now');
          }}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-space-700 text-base cursor-pointer"
        >
          <CalendarClock size={18} /> Next
        </button>
        <button onClick={() => setStep('pick')} className="h-10 text-gray-400 cursor-pointer">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-5 pt-8 pb-8">
      <p className="text-[11px] font-bold tracking-wider text-vital-cyan">NOW</p>
      <p className="text-xl font-bold leading-tight line-clamp-2">{member.task.name}</p>
      <p className="text-sm text-gray-400">{formatDuration(now - member.startedAt)}</p>
      {planned && <p className="mt-1 text-sm text-gray-300 truncate">Next: {planned.name}</p>}
      <button
        onClick={() => setStep('pick')}
        className="mt-auto h-12 rounded-2xl bg-space-700 text-base font-semibold cursor-pointer active:bg-space-600"
      >
        Change
      </button>
    </div>
  );
}

// One line per crewmate: status colour, short name and pulse
function CrewScreen({ member, crewData }) {
  const crewmates = Object.values(crewData).filter(
    (m) => m.missionId === member.missionId && m.id !== member.id
  );

  return (
    <div className="h-full flex flex-col px-4 pt-7 pb-8">
      <p className="text-[11px] font-bold tracking-wider text-gray-400 mb-2 text-center">CREW</p>
      {crewmates.length === 0 && <p className="text-center text-gray-500 mt-6">No other crew</p>}
      <div className="space-y-2">
        {crewmates.map((m) => {
          const status = getMemberStatus(m);
          return (
            <div key={m.id} className="flex items-center gap-2 min-h-[44px] px-3 rounded-2xl bg-space-800">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(status) }} />
              <span className="flex-1 truncate text-base">{m.name.replace(/^(Dr|Eng)\. /, '').split(' ')[0]}</span>
              <span className="font-mono text-lg">{formatMetricValue('heart_rate_bpm', m.data.currentVitals)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// What is out of range and what to do, most serious first
function AlertsScreen({ issues, vitals, member, context }) {
  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pt-7 pb-9 space-y-3">
      {issues.map(({ key, status }) => (
        <div key={key}>
          <p className="font-semibold leading-tight" style={{ color: getStatusColor(status) }}>
            {crewLabels[key]} {formatMetricValue(key, vitals)}
          </p>
          <p className="text-sm text-gray-300 leading-snug">{getCrewAdvice(key, vitals[key], member.env, context)}</p>
        </div>
      ))}
    </div>
  );
}

// Emergency takes over the whole screen; the acknowledge button is the whole lower half
function EmergencyScreen({ criticals, onAcknowledge }) {
  const first = criticals[0];
  const key = first.metricKeys[0];
  const label = first.rule ? first.rule.label : `${crewLabels[key]} ${formatMetricValue(key, first.vitals)}`;

  return (
    <div className="h-full flex flex-col bg-vital-red text-on-accent">
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center animate-pulse">
        <Siren size={34} />
        <p className="text-2xl font-black tracking-wide">ALERT</p>
        <p className="text-base font-semibold leading-tight">{label}</p>
      </div>
      <button
        onClick={onAcknowledge}
        className="h-[46%] bg-black/30 active:bg-black/50 text-2xl font-bold cursor-pointer"
      >
        OK
      </button>
    </div>
  );
}

// What to do right after acknowledging: the combined-rule or reading-specific advice
function stabiliseInstruction(critical) {
  const key = critical.metricKeys[0];
  return {
    title: critical.rule ? critical.rule.label : crewLabels[key],
    text: critical.rule
      ? critical.rule.advice
      : getCrewAdvice(key, critical.vitals[key], critical.section.id, critical.context),
  };
}

// Brief stabilisation instruction; closes by itself or with a tap anywhere
function InstructionScreen({ instruction, onDone }) {
  return (
    <button
      onClick={onDone}
      className="relative h-full w-full flex flex-col justify-center gap-2 px-5 text-left bg-space-900 cursor-pointer"
    >
      <p className="text-[11px] font-bold tracking-wider text-vital-red">DO THIS NOW · {instruction.title}</p>
      <p className="text-xl font-bold leading-snug text-white">{instruction.text}</p>
      <p className="text-sm text-gray-400">Then tell Mission Control how you feel.</p>
      {/* Time left before the screen closes on its own */}
      <span className="absolute bottom-0 inset-x-0 h-1.5 bg-space-700">
        <span
          className="block h-full bg-vital-red origin-left"
          style={{ animation: `instruction-timer ${INSTRUCTION_MS}ms linear forwards` }}
        />
      </span>
    </button>
  );
}
