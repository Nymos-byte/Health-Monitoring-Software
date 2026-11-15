import { Activity, History, Route, Globe2, Video } from 'lucide-react';
import PhaseTabs from '../components/PhaseTabs';
import CrewRoster from '../components/CrewRoster';
import AlertsPanel from '../components/AlertsPanel';
import AstronautProfile from '../components/AstronautProfile';
import VitalCards from '../components/VitalCards';
import HistoryPanel from '../components/HistoryPanel';
import MissionPhases from '../components/MissionPhases';
import EnvironmentPanel from '../components/EnvironmentPanel';
import LinkStatusBar from '../components/LinkStatusBar';
import BodyCamPanel from '../components/BodyCamPanel';
import { getBufferedSamples } from '../hooks/useDownlink';
import { SECTIONS, metricDefinitions, getVitalContext } from '../data/mockData';

const TABS = [
  { id: 'live', label: 'Live', icon: Activity },
  { id: 'history', label: 'History', icon: History },
  { id: 'camera', label: 'Body Cam', icon: Video },
  { id: 'mission', label: 'Mission Phases', icon: Route },
  { id: 'environment', label: 'Environment', icon: Globe2 },
];

export default function GroundView({
  crewData,
  alerts,
  selectedSection,
  selectedAstronaut,
  onSelectSection,
  onSelectAstronaut,
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
  const section = SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  const sectionData = member?.sections?.[selectedSection] || { currentVitals: {}, vitals: [] };
  const context = getVitalContext(member, sectionData.currentVitals);

  const numericMetrics = section.metrics.filter((k) => !metricDefinitions[k]?.isCategorical);
  const otherMetrics = numericMetrics.filter((k) => !section.primaryMetrics.includes(k));
  const emergencyActive = emergencies.has(`${selectedAstronaut}:${selectedSection}`);
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
            selectedId={selectedAstronaut}
            selectedSection={selectedSection}
            blinking={blinking}
            onSelect={onSelectAstronaut}
          />
          <AlertsPanel
            alerts={alerts}
            selectedSection={selectedSection}
            onAcknowledge={onAcknowledge}
          />
        </aside>

        {/* Main column: one astronaut at a time, split into tabs */}
        <section className="space-y-4 min-w-0">
          <AstronautProfile member={member} selectedSection={selectedSection} />

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
            {/* Demo only: forces a critical reading for the selected astronaut and phase */}
            <button
              onClick={() => onToggleEmergency(selectedAstronaut, selectedSection)}
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
              <VitalCards
                title="Key readings"
                metrics={section.primaryMetrics}
                vitals={sectionData.currentVitals}
                astronautId={selectedAstronaut}
                selectedSection={selectedSection}
                context={context}
                blinking={blinking}
                size="lg"
              />
              <VitalCards
                title="Other readings"
                metrics={otherMetrics}
                vitals={sectionData.currentVitals}
                astronautId={selectedAstronaut}
                selectedSection={selectedSection}
                context={context}
                blinking={blinking}
              />
            </div>
          )}
          {tab === 'history' && (
            <HistoryPanel
              vitals={sectionData.vitals}
              metrics={numericMetrics}
              defaultMetric={section.primaryMetrics[0]}
              selectedSection={selectedSection}
              context={context}
            />
          )}
          {tab === 'camera' && (
            <BodyCamPanel
              crewData={crewData}
              selectedId={selectedAstronaut}
              selectedSection={selectedSection}
              link={link}
              now={now}
              onSelect={onSelectAstronaut}
            />
          )}
          {tab === 'mission' && (
            <MissionPhases
              crewData={crewData}
              selectedId={selectedAstronaut}
              selectedSection={selectedSection}
              onSelectSection={onSelectSection}
              onSelectAstronaut={onSelectAstronaut}
            />
          )}
          {tab === 'environment' && <EnvironmentPanel selectedSection={selectedSection} />}
        </section>
      </div>
    </main>
  );
}
