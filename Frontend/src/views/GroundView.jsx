import { Activity, History, ClipboardList, Globe2, Video, Archive, Database, Cpu } from 'lucide-react';
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
import SessionRecords from '../components/SessionRecords';
import DataSourceBar from '../components/DataSourceBar';
import DemoControls from '../components/DemoControls';
import ReceptionLog from '../components/ReceptionLog';
import { getBufferedSamples } from '../hooks/useDownlink';
import {
  metricDefinitions,
  getVitalContext,
  getTaskMetrics,
  getTaskPrimaryMetrics,
  getEnvironment,
} from '../data/mockData';

const TABS = [
  { id: 'live', label: 'Live', icon: Activity },
  { id: 'history', label: 'History', icon: History },
  { id: 'camera', label: 'Body Cam', icon: Video },
  { id: 'records', label: 'Records', icon: Archive },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'environment', label: 'Environment', icon: Globe2 },
];

export default function GroundView({
  crewData,
  records,
  alerts,
  selectedSection,
  selectedAstronaut,
  onSelectSection,
  onSelectAstronaut,
  onAssignTask,
  missions,
  onAdvancePhase,
  onAcknowledge,
  blinking,
  tab,
  onChangeTab,
  onboardData,
  links,
  now,
  forcedLoss,
  onToggleLinkLoss,
  cloud,
  groundSource,
  onChangeGroundSource,
  onSetScenario,
  onSetManualReadings,
}) {
  const member = crewData[selectedAstronaut];
  // The main panel shows an astronaut only when they work in the selected environment
  const focused = member?.env === selectedSection ? member : null;
  const link = links[selectedSection];
  // Completed sessions in this environment stay visible after the crew moves on
  const envRecords = Object.values(records).filter((r) => r.member.env === selectedSection);
  const recordsPanel = (
    <SessionRecords
      records={envRecords}
      crewData={crewData}
      title={`Recorded sessions · ${getEnvironment(selectedSection).name}`}
    />
  );

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

      <DataSourceBar
        source={groundSource}
        onChangeSource={onChangeGroundSource}
        cloud={cloud}
        total={Object.keys(crewData).length}
        now={now}
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
            missions={missions}
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
              records={records}
              missions={missions}
              onAdvancePhase={onAdvancePhase}
              recordsPanel={recordsPanel}
              tab={tab}
              onChangeTab={onChangeTab}
              link={link}
              links={links}
              now={now}
              blinking={blinking}
              onboard={onboardData[focused.id]}
              cloudLive={groundSource === 'azure' && cloud.status === 'live'}
              onSetScenario={onSetScenario}
              onSetManualReadings={onSetManualReadings}
              onSelectAstronaut={onSelectAstronaut}
              onAssignTask={onAssignTask}
            />
          ) : (
            <EmptyEnvironment
              envId={selectedSection}
              crewData={crewData}
              records={records}
              missions={missions}
              recordsPanel={recordsPanel}
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
  records,
  missions,
  onAdvancePhase,
  recordsPanel,
  tab,
  onChangeTab,
  link,
  links,
  now,
  blinking,
  onboard,
  cloudLive,
  onSetScenario,
  onSetManualReadings,
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
      <AstronautProfile
        member={member}
        crewData={crewData}
        records={records}
        missions={missions}
        onAssignTask={onAssignTask}
      />

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
        {/* Where this astronaut's readings come from right now */}
        {member.source === 'azure' ? (
          <span className="ml-auto self-center flex items-center gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap text-vital-green">
            <Database size={13} />
            From device via Azure · {Math.max(0, Math.round((now - member.cloudAt) / 1000))}s ago
            {member.cloudLog?.[0]?.delivery === 'caja_negra' && (
              <span className="text-vital-orange">· black box</span>
            )}
          </span>
        ) : (
          <span className="ml-auto self-center flex items-center gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap text-gray-500">
            <Cpu size={13} />
            Simulated
          </span>
        )}
      </div>

      {tab === 'live' && (
        <div className={`space-y-5 transition-opacity ${link.status === 'aos' ? '' : 'opacity-60'}`}>
          <VitalCards title="Key readings" metrics={primaryMetrics} size="lg" {...cardProps} />
          <VitalCards title="Other readings" metrics={otherMetrics} {...cardProps} />
          <ReceptionLog member={member} enabled={cloudLive} />
          <DemoControls
            key={member.id}
            member={member}
            onboard={onboard}
            metrics={numericMetrics}
            onSetScenario={onSetScenario}
            onSetManualReadings={onSetManualReadings}
          />
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
      {tab === 'records' && recordsPanel}
      {tab === 'assignments' && (
        <AssignmentsPanel
          crewData={crewData}
          records={records}
          missions={missions}
          onAdvancePhase={onAdvancePhase}
          selectedId={member.id}
          onSelectAstronaut={onSelectAstronaut}
          onAssignTask={onAssignTask}
        />
      )}
      {tab === 'environment' && <EnvironmentPanel selectedSection={member.env} />}
    </>
  );
}
