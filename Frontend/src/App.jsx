import { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import GroundView from './views/GroundView';
import CrewView from './views/CrewView';
import WristView from './views/WristView';
import CriticalAlertModal from './components/CriticalAlertModal';
import { generateCrewData, initialAlerts, getTask } from './data/mockData';
import { useRealtimeVitals } from './hooks/useRealtimeVitals';
import { useDownlink } from './hooks/useDownlink';
import { useBlackBox } from './hooks/useBlackBox';
import { getCriticalReadings, criticalKey } from './utils/metrics';
import { getAutoTheme, readThemeChoice, saveThemeChoice } from './utils/theme';

// Each view has its own URL so it can be opened on a separate screen
const VIEW_HASHES = { ground: '#/ground', crew: '#/crew', wrist: '#/wrist' };

function getViewFromHash() {
  return Object.keys(VIEW_HASHES).find((v) => VIEW_HASHES[v] === window.location.hash) ?? 'ground';
}

function App() {
  const initialData = useMemo(() => generateCrewData(), []);
  const {
    crewData,
    records,
    missions,
    emergencies,
    toggleEmergency,
    assignTask,
    planTask,
    advancePhase,
  } = useRealtimeVitals(initialData);
  // Crew sees onboard data; ground sees only what the downlink has delivered
  const { groundData, links, now, forcedLoss, toggleLinkLoss } = useDownlink(crewData);
  const [view, setView] = useState(getViewFromHash);
  const [selectedAstronaut, setSelectedAstronaut] = useState('ast-001');
  const [selectedSection, setSelectedSection] = useState(() => initialData['ast-001'].env);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [groundTab, setGroundTab] = useState('live');
  const [crewPage, setCrewPage] = useState('vitals');
  const [themeChoice, setThemeChoice] = useState(readThemeChoice);
  // The selected astronaut's device: records on its own, keeps data onboard without a link
  const wearer = crewData[selectedAstronaut];
  const blackBox = useBlackBox(wearer, links[wearer.env].status === 'aos');
  // Acknowledged critical readings, kept separately for ground and crew:
  // "<audience>|<astronaut>:<phase>:<metric>". The wrist and tablet belong to the same astronaut,
  // so acknowledging on one silences both.
  const [acknowledged, setAcknowledged] = useState(() => new Set());
  const audience = view === 'ground' ? 'ground' : 'crew';

  // Ground watches the whole crew (as received); crew devices only the astronaut wearing them
  const criticalReadings =
    audience === 'crew'
      ? getCriticalReadings(crewData, { astronautId: selectedAstronaut })
      : getCriticalReadings(groundData);
  const unacknowledged = criticalReadings.filter((r) => !acknowledged.has(`${audience}|${r.id}`));
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
    setAcknowledged((prev) => new Set([...prev, ...ids.map((id) => `${audience}|${id}`)]));
    const focus = unacknowledged[0];
    setSelectedAstronaut(focus.member.id);
    setSelectedSection(focus.section.id);
    setGroundTab('live');
    setCrewPage('vitals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ground Control keeps the cabin theme; crew devices use the astronaut's choice or Auto
  const theme =
    view === 'ground'
      ? 'cabin'
      : themeChoice === 'auto'
        ? getAutoTheme(crewData[selectedAstronaut])
        : themeChoice;
  useEffect(() => {
    if (theme === 'cabin') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleThemeChoice = (choice) => {
    setThemeChoice(choice);
    saveThemeChoice(choice);
  };

  useEffect(() => {
    const onHashChange = () => setView(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Selecting an astronaut opens the environment they are in; selecting an environment
  // focuses someone working there (if anyone is)
  const handleSelectAstronaut = (id) => {
    setSelectedAstronaut(id);
    setSelectedSection(crewData[id].env);
  };
  const handleSelectSection = (envId) => {
    setSelectedSection(envId);
    const first = Object.values(crewData).find((m) => m.env === envId);
    if (first) setSelectedAstronaut(first.id);
  };
  const handleAssignTask = (id, taskId) => {
    if (!assignTask(id, taskId)) return false;
    setSelectedAstronaut(id);
    setSelectedSection(getTask(taskId).environment);
    return true;
  };

  // Moving a mission to its next phase takes its whole crew there; follow the selected astronaut
  const handleAdvancePhase = (missionId) => {
    const assigned = advancePhase(missionId);
    const taskId = assigned?.[selectedAstronaut];
    if (taskId) setSelectedSection(getTask(taskId).environment);
  };

  const handleChangeView = (next) => {
    window.location.hash = VIEW_HASHES[next];
  };

  const handleAcknowledge = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const shared = {
    crewData,
    records,
    alerts,
    selectedSection,
    selectedAstronaut,
    onSelectSection: handleSelectSection,
    onSelectAstronaut: handleSelectAstronaut,
    onAssignTask: handleAssignTask,
    missions,
    onAdvancePhase: handleAdvancePhase,
    onPlanTask: planTask,
    links,
    now,
    blinking,
    emergencies,
    onToggleEmergency: toggleEmergency,
    themeChoice,
    theme,
    onThemeChoice: handleThemeChoice,
    blackBox,
  };

  return (
    <div className="min-h-screen bg-space-900 text-white">
      {/* Crew devices have their own compact chrome to save space on small screens */}
      {view === 'ground' && (
        <Header
          view={view}
          onChangeView={handleChangeView}
          blackBox={blackBox}
          wearer={wearer}
        />
      )}
      {view === 'wrist' && (
        <WristView
          {...shared}
          criticals={unacknowledged}
          onAcknowledgeCritical={handleAcknowledgeCritical}
          onChangeView={handleChangeView}
        />
      )}
      {view === 'crew' && (
        <CrewView
          {...shared}
          page={crewPage}
          onChangePage={setCrewPage}
          onChangeView={handleChangeView}
        />
      )}
      {view === 'ground' && (
        <GroundView
          {...shared}
          crewData={groundData}
          onboardData={crewData}
          forcedLoss={forcedLoss}
          onToggleLinkLoss={toggleLinkLoss}
          onAcknowledge={handleAcknowledge}
          tab={groundTab}
          onChangeTab={setGroundTab}
        />
      )}
      {/* The wrist display shows emergencies on its own screen */}
      {view !== 'wrist' && (
        <CriticalAlertModal
          readings={unacknowledged}
          audience={audience}
          onAcknowledge={handleAcknowledgeCritical}
        />
      )}
    </div>
  );
}

export default App;
