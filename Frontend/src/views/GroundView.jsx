import { Activity, History, ClipboardList, Globe2, Video } from 'lucide-react';
import PhaseTabs from '../components/PhaseTabs';
import CrewRoster from '../components/CrewRoster';
import AlertsPanel from '../components/AlertsPanel';
import AstronautProfile from '../components/AstronautProfile';
import VitalCards from '../components/VitalCards';
import HistoryPanel from '../components/HistoryPanel';
import AssignmentsPanel from '../components/AssignmentsPanel';
import EmptyEnvironment from '../components/EmptyEnvironment';
import EnvironmentPanel from '../components/EnvironmentPanel';
import LinkStatusBar from '../components/LinkStatusBar';
import BodyCamPanel from '../components/BodyCamPanel';
import { getBufferedSamples } from '../hooks/useDownlink';
import {
  metricDefinitions,
  getVitalContext,
  getTaskMetrics,
  getTaskPrimaryMetrics,
} from '../data/mockData';

const TABS = [
  { id: 'live', label: 'Live', icon: Activity },
  { id: 'history', label: 'History', icon: History },
  { id: 'camera', label: 'Body Cam', icon: Video },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'environment', label: 'Environment', icon: Globe2 },
];

export default function GroundView({
  crewData,
  alerts,
  selectedSection,
  selectedAstronaut,
  onSelectSection,
  onSelectAstronaut,
  onAssignTask,
  onAcknowledge,
  blinking,
  emergencies,
  onToggleEmergency,
  tab,
  onChangeTab,
  onboardData,
  links,
  now,
  forcedLoss,
  onToggleLinkLoss,
}) {
  const member = crewData[selectedAstronaut];
  // The main panel shows an astronaut only when they work in the selected environment
  const focused = member?.env === selectedSection ? member : null;
  const link = links[selectedSection];

  return (
    <main className="max-w-[1600px] mx-auto px-4 py-5 space-y-5">
      <PhaseTabs
        crewData={crewData}
        alerts={alerts}
        blinking={blinking}
        links={links}
        selectedSection={selectedSection}
        onSelectSection={onSelectSection}
      />

      <LinkStatusBar
        link={link}
        now={now}
        buffered={getBufferedSamples(crewData, onboardData, selectedSection)}
        forced={forcedLoss.has(selectedSection)}
        onToggleLinkLoss={() => onToggleLinkLoss(selectedSection)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
        {/* Left column: who to look at, and what needs attention */}
        <aside className="space-y-5 lg:sticky lg:top-20">
          <CrewRoster
            crewData={crewData}
            selectedId={focused?.id}
            blinking={blinking}
            onSelect={onSelectAstronaut}
          />
          <AlertsPanel
            alerts={alerts}
            selectedSection={selectedSection}
            onAcknowledge={onAcknowledge}
          />
        </aside>

        <section className="space-y-4 min-w-0">
          {focused ? (
            <AstronautDetail
              member={focused}
              crewData={crewData}
              tab={tab}
              onChangeTab={onChangeTab}
              link={link}
              links={links}
              now={now}
              blinking={blinking}
              emergencyActive={emergencies.has(focused.id)}
              onToggleEmergency={() => onToggleEmergency(focused.id)}
              onSelectAstronaut={onSelectAstronaut}
              onAssignTask={onAssignTask}
            />
          ) : (
            <EmptyEnvironment
              envId={selectedSection}
              crewData={crewData}
              onAssignTask={onAssignTask}
            />
          )}
        </section>
      </div>
    </main>
  );
}

// One astronaut at a time, split into tabs
function AstronautDetail({
  member,
  crewData,
  tab,
  onChangeTab,
  link,
  links,
  now,
  blinking,
  emergencyActive,
  onToggleEmergency,
  onSelectAstronaut,
  onAssignTask,
}) {
  const { currentVitals, vitals } = member.data;
  const context = getVitalContext(member, currentVitals);
  const numericMetrics = getTaskMetrics(member.task).filter((k) => !metricDefinitions[k].isCategorical);
  const primaryMetrics = getTaskPrimaryMetrics(member.task);
  const otherMetrics = numericMetrics.filter((k) => !primaryMetrics.includes(k));
  const cardProps = {
    vitals: currentVitals,
    astronautId: member.id,
    selectedSection: member.env,
    context,
    blinking,
  };

  return (
    <>
      <AstronautProfile member={member} onAssignTask={onAssignTask} />

      <div className="flex gap-1 border-b border-space-600 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChangeTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === id
                ? 'border-vital-cyan text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        {/* Demo only: forces a critical reading for the selected astronaut */}
        <button
          onClick={onToggleEmergency}
          className={`ml-auto self-center px-2.5 py-1 text-xs rounded-md border whitespace-nowrap cursor-pointer ${
            emergencyActive
              ? 'border-vital-red text-vital-red'
              : 'border-space-600 text-gray-500 hover:text-white'
          }`}
        >
          {emergencyActive ? 'End emergency' : 'Simulate emergency'}
        </button>
      </div>

      {tab === 'live' && (
        <div className={`space-y-5 transition-opacity ${link.status === 'aos' ? '' : 'opacity-60'}`}>
          <VitalCards title="Key readings" metrics={primaryMetrics} size="lg" {...cardProps} />
          <VitalCards title="Other readings" metrics={otherMetrics} {...cardProps} />
        </div>
      )}
      {tab === 'history' && (
        <HistoryPanel
          key={member.taskId}
          vitals={vitals}
          metrics={numericMetrics}
          defaultMetric={primaryMetrics[0]}
          selectedSection={member.env}
          context={context}
        />
      )}
      {tab === 'camera' && (
        <BodyCamPanel
          crewData={crewData}
          selectedId={member.id}
          links={links}
          now={now}
          onSelect={onSelectAstronaut}
        />
      )}
      {tab === 'assignments' && (
        <AssignmentsPanel
          crewData={crewData}
          selectedId={member.id}
          onSelectAstronaut={onSelectAstronaut}
          onAssignTask={onAssignTask}
        />
      )}
      {tab === 'environment' && <EnvironmentPanel selectedSection={member.env} />}
    </>
  );
}
