import { useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, ChevronDown } from 'lucide-react';
import { SECTIONS, metricDefinitions, getMetricRange, getVitalContext } from '../data/mockData';
import { getVitalStatus, getStatusColor } from '../utils/helpers';
import {
  metricIcons,
  crewLabels,
  getCrewAdvice,
  formatMetricValue,
  criticalKey,
  getStatusOutline,
  getCriticalReadings,
} from '../utils/metrics';

const crewStatusLabel = { nominal: 'Normal', caution: 'Watch', critical: 'Alert' };
const severityRank = { critical: 0, caution: 1, nominal: 2 };

export default function CrewView({
  crewData,
  selectedSection,
  selectedAstronaut,
  onSelectSection,
  onSelectAstronaut,
  blinking,
  emergencies,
  onToggleEmergency,
}) {
  const [showMore, setShowMore] = useState(false);
  const member = crewData[selectedAstronaut];
  const section = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  const vitals = member?.sections?.[selectedSection]?.currentVitals || {};
  const context = getVitalContext(member, vitals);

  const numericMetrics = section.metrics.filter((k) => !metricDefinitions[k]?.isCategorical);
  const primary = section.primaryMetrics;
  const secondary = numericMetrics.filter((k) => !primary.includes(k));

  // Every out-of-range reading becomes an action item, whether or not it is on the main screen
  const issues = numericMetrics
    .map((key) => ({ key, status: getVitalStatus(key, vitals[key], selectedSection, context) }))
    .filter((i) => i.status !== 'nominal')
    .sort(
      (a, b) =>
        severityRank[a.status] - severityRank[b.status] ||
        primary.includes(b.key) - primary.includes(a.key)
    );
  const secondaryIssues = issues.filter((i) => secondary.includes(i.key)).length;
  const isBlinking = (key) => blinking.has(criticalKey(selectedAstronaut, selectedSection, key));
  const emergencyActive = emergencies.has(`${selectedAstronaut}:${selectedSection}`);
  const activeRules = getCriticalReadings(crewData, {
    astronautId: selectedAstronaut,
    sectionId: selectedSection,
  })
    .map((r) => r.rule)
    .filter(Boolean);

  if (!member) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Who and where */}
      <div className="flex items-center gap-4">
        <span className="text-5xl">{member.avatar}</span>
        <div>
          <h2 className="text-2xl font-bold">{member.name}</h2>
          <p className="text-gray-400">
            {section.name} · {section.missionDayLabel}
            {vitals.flight_phase && section.id === 'spacecraft' && ` · ${vitals.flight_phase}`}
            {vitals.activity_level && ` · Activity: ${vitals.activity_level}`}
          </p>
        </div>
      </div>

      <StatusBanner
        issues={issues}
        rules={activeRules}
        vitals={vitals}
        sectionId={selectedSection}
        context={context}
      />

      {/* Essential readings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primary.map((key) => (
          <PrimaryTile
            key={key}
            metricKey={key}
            vitals={vitals}
            sectionId={selectedSection}
            context={context}
            blinking={isBlinking(key)}
          />
        ))}
      </div>

      {/* Less critical readings, hidden by default */}
      <div className="bg-space-800/60 border border-space-600 rounded-2xl">
        <button
          onClick={() => setShowMore((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
        >
          <span className="text-gray-300">
            More readings
            <span className="text-gray-500"> · {secondary.length}</span>
            {secondaryIssues > 0 && (
              <span className="ml-2 text-vital-orange">{secondaryIssues} to watch</span>
            )}
          </span>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${showMore ? 'rotate-180' : ''}`}
          />
        </button>
        {showMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 px-5 pb-4">
            {secondary.map((key) => (
              <SecondaryRow
                key={key}
                metricKey={key}
                vitals={vitals}
                sectionId={selectedSection}
                context={context}
                blinking={isBlinking(key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Demo controls: on a real mission these come from the suit / vehicle context */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-space-700 text-xs text-gray-500">
        <span className="uppercase tracking-wider">Simulation</span>
        <select
          value={selectedAstronaut}
          onChange={(e) => onSelectAstronaut(e.target.value)}
          className="bg-space-800 border border-space-600 rounded-md px-2 py-1 text-gray-300"
        >
          {Object.values(crewData).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={selectedSection}
          onChange={(e) => onSelectSection(e.target.value)}
          className="bg-space-800 border border-space-600 rounded-md px-2 py-1 text-gray-300"
        >
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => onToggleEmergency(selectedAstronaut, selectedSection)}
          className={`px-2 py-1 rounded-md border cursor-pointer ${
            emergencyActive
              ? 'border-vital-red text-vital-red'
              : 'border-space-600 text-gray-400 hover:text-white'
          }`}
        >
          {emergencyActive ? 'End emergency' : 'Simulate emergency'}
        </button>
      </div>
    </main>
  );
}

function StatusBanner({ issues, rules, vitals, sectionId, context }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-vital-green/10 border border-vital-green/40">
        <CheckCircle2 size={40} className="text-vital-green shrink-0" />
        <div>
          <p className="text-2xl font-bold text-vital-green">All readings normal</p>
          <p className="text-gray-300">No action needed. Continue your activity.</p>
        </div>
      </div>
    );
  }

  // A combined-sign emergency outranks its individual (orange) readings
  const top = rules.length ? 'critical' : issues[0].status;
  const color = getStatusColor(top);
  const Icon = top === 'critical' ? AlertOctagon : AlertTriangle;

  return (
    <div
      className={`p-5 rounded-2xl border ${top === 'critical' ? 'pulse-critical' : ''}`}
      style={{ backgroundColor: `${color}1a`, borderColor: `${color}80` }}
    >
      <div className="flex items-center gap-4 mb-3">
        <Icon size={40} style={{ color }} className="shrink-0" />
        <p className="text-2xl font-bold" style={{ color }}>
          {top === 'critical' ? 'Action required' : 'Keep an eye on'}
        </p>
      </div>
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={rule.id} className="flex flex-wrap items-baseline gap-x-3 text-lg">
            <span className="font-semibold text-vital-red">{rule.label}</span>
            <span className="text-gray-200">{rule.advice}</span>
          </li>
        ))}
        {issues.map(({ key, status }) => (
          <li key={key} className="flex flex-wrap items-baseline gap-x-3 text-lg">
            <span className="font-semibold" style={{ color: getStatusColor(status) }}>
              {crewLabels[key]} {formatMetricValue(key, vitals)} {metricDefinitions[key].unit}
            </span>
            <span className="text-gray-200">{getCrewAdvice(key, vitals[key], sectionId, context)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrimaryTile({ metricKey, vitals, sectionId, context, blinking }) {
  const def = metricDefinitions[metricKey];
  const Icon = metricIcons[metricKey];
  const status = getVitalStatus(metricKey, vitals[metricKey], sectionId, context);
  const color = getStatusColor(status);
  const range = getMetricRange(metricKey, sectionId, context);
  const outline = getStatusOutline(status, blinking);

  return (
    <div className={`p-5 rounded-2xl bg-space-800/80 border-2 ${outline.className}`} style={outline.style}>
      <div className="flex items-center gap-2 text-gray-300 mb-3">
        <Icon size={20} />
        <span className="text-base">{crewLabels[metricKey]}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold font-mono tracking-tight" style={{ color }}>
          {formatMetricValue(metricKey, vitals)}
        </span>
        <span className="text-gray-400">{def.unit}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color }}>{crewStatusLabel[status]}</span>
        {range && (
          <span className="text-gray-500 font-mono text-right">
            {range.min}–{range.max}
            {range.adjustedFor && (
              <span className="block text-[11px] text-vital-cyan">{range.adjustedFor} activity</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function SecondaryRow({ metricKey, vitals, sectionId, context, blinking }) {
  const def = metricDefinitions[metricKey];
  const status = getVitalStatus(metricKey, vitals[metricKey], sectionId, context);
  const color = getStatusColor(status);

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-space-700/70">
      <span className="flex items-center gap-2 text-gray-300">
        <span
          className={`w-2 h-2 rounded-full ${blinking ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: color }}
        />
        {crewLabels[metricKey]}
      </span>
      <span className="font-mono">
        <span style={{ color: status === 'nominal' ? '#e5e7eb' : color }}>
          {formatMetricValue(metricKey, vitals)}
        </span>
        <span className="text-gray-500 text-sm ml-1">{def.unit}</span>
      </span>
    </div>
  );
}
