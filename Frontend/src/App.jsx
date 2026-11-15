import { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import GroundView from './views/GroundView';
import CrewView from './views/CrewView';
import CriticalAlertModal from './components/CriticalAlertModal';
import { generateCrewData, initialAlerts } from './data/mockData';
import { useRealtimeVitals } from './hooks/useRealtimeVitals';
import { useDownlink } from './hooks/useDownlink';
import { getCriticalReadings, criticalKey } from './utils/metrics';

// Each view has its own URL so it can be opened on a separate screen: #/ground or #/crew
function getViewFromHash() {
  return window.location.hash === '#/crew' ? 'crew' : 'ground';
}

function App() {
  const initialData = useMemo(() => generateCrewData(), []);
  const { crewData, emergencies, toggleEmergency } = useRealtimeVitals(initialData);
  // Crew sees onboard data; ground sees only what the downlink has delivered
  const { groundData, links, now, forcedLoss, toggleLinkLoss } = useDownlink(crewData);
  const [view, setView] = useState(getViewFromHash);
  const [selectedSection, setSelectedSection] = useState('space_station');
  const [selectedAstronaut, setSelectedAstronaut] = useState('ast-001');
  const [alerts, setAlerts] = useState(initialAlerts);
  const [groundTab, setGroundTab] = useState('live');
  // Acknowledged critical readings, kept separately for each view: "<view>|<astronaut>:<phase>:<metric>"
  const [acknowledged, setAcknowledged] = useState(() => new Set());

  // Ground watches the whole crew (as received); the crew display only the astronaut wearing it
  const criticalReadings =
    view === 'crew'
      ? getCriticalReadings(crewData, { astronautId: selectedAstronaut, sectionId: selectedSection })
      : getCriticalReadings(groundData);
  const unacknowledged = criticalReadings.filter((r) => !acknowledged.has(`${view}|${r.id}`));
  // Every reading involved in an unacknowledged emergency blinks
  const blinking = new Set(
    unacknowledged.flatMap((r) =>
      r.metricKeys.map((key) => criticalKey(r.member.id, r.section.id, key))
    )
  );

  // Once a reading leaves the critical zone (as seen by each view), forget its acknowledgement
  // so a new episode alarms again
  const allCriticalKeys = [
    ...getCriticalReadings(crewData).map((r) => `crew|${r.id}`),
    ...getCriticalReadings(groundData).map((r) => `ground|${r.id}`),
  ].join(',');
  const [prevCriticalKeys, setPrevCriticalKeys] = useState(allCriticalKeys);
  if (allCriticalKeys !== prevCriticalKeys) {
    setPrevCriticalKeys(allCriticalKeys);
    const stillCritical = new Set(allCriticalKeys.split(','));
    setAcknowledged((prev) => new Set([...prev].filter((k) => stillCritical.has(k))));
  }

  // After acknowledging, take the viewer straight to the live vitals of the astronaut in trouble
  const handleAcknowledgeCritical = (ids) => {
    setAcknowledged((prev) => new Set([...prev, ...ids.map((id) => `${view}|${id}`)]));
    const focus = unacknowledged[0];
    setSelectedAstronaut(focus.member.id);
    setSelectedSection(focus.section.id);
    setGroundTab('live');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => setView(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleChangeView = (next) => {
    window.location.hash = next === 'crew' ? '#/crew' : '#/ground';
  };

  const handleAcknowledge = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const shared = {
    crewData,
    alerts,
    selectedSection,
    selectedAstronaut,
    onSelectSection: setSelectedSection,
    onSelectAstronaut: setSelectedAstronaut,
    blinking,
    emergencies,
    onToggleEmergency: toggleEmergency,
  };

  return (
    <div className="min-h-screen bg-space-900 text-white stars-bg">
      <Header view={view} onChangeView={handleChangeView} />
      {view === 'crew' ? (
        <CrewView {...shared} />
      ) : (
        <GroundView
          {...shared}
          crewData={groundData}
          onboardData={crewData}
          links={links}
          now={now}
          forcedLoss={forcedLoss}
          onToggleLinkLoss={toggleLinkLoss}
          onAcknowledge={handleAcknowledge}
          tab={groundTab}
          onChangeTab={setGroundTab}
        />
      )}
      <CriticalAlertModal
        readings={unacknowledged}
        audience={view}
        onAcknowledge={handleAcknowledgeCritical}
      />
    </div>
  );
}

export default App;
