import { useState, useMemo } from 'react';
import Header from './components/Header';
import SectionSelector from './components/SectionSelector';
import CrewSelector from './components/CrewSelector';
import AstronautProfile from './components/AstronautProfile';
import VitalCards from './components/VitalCards';
import VitalCharts from './components/VitalCharts';
import AlertsPanel from './components/AlertsPanel';
import EnvironmentPanel from './components/EnvironmentPanel';
import CrewOverviewRadar from './components/CrewOverviewRadar';
import { generateCrewData, initialAlerts } from './data/mockData';
import { useRealtimeVitals } from './hooks/useRealtimeVitals';

function App() {
  const initialData = useMemo(() => generateCrewData(), []);
  const crewData = useRealtimeVitals(initialData);
  const [selectedSection, setSelectedSection] = useState('earth_preflight');
  const [selectedAstronaut, setSelectedAstronaut] = useState('ast-001');
  const [alerts, setAlerts] = useState(initialAlerts);

  const selectedMember = crewData[selectedAstronaut];
  const activeSectionData = selectedMember?.sections?.[selectedSection] || {
    currentVitals: {},
    vitals: [],
  };

  const handleAcknowledge = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  return (
    <div className="min-h-screen bg-space-900 text-white stars-bg">
      <Header selectedSection={selectedSection} />

      <main className="max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        {/* Mission Environment / Dataset Sections */}
        <section>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-[0.2em] mb-3">
            Mission Environment & Dataset Sections
          </h2>
          <SectionSelector
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
          />
        </section>

        {/* Active Mission Crew Selection */}
        <section>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-[0.2em] mb-3">
            Active Mission Crew
          </h2>
          <CrewSelector
            crewData={crewData}
            selectedId={selectedAstronaut}
            selectedSection={selectedSection}
            onSelect={setSelectedAstronaut}
          />
        </section>

        {/* Astronaut Profile + Section Vitals & Time-Series Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AstronautProfile
              member={selectedMember}
              selectedSection={selectedSection}
            />
            <VitalCards
              vitals={activeSectionData.currentVitals}
              selectedSection={selectedSection}
            />
            <VitalCharts
              vitals={activeSectionData.vitals}
              selectedSection={selectedSection}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <AlertsPanel
              alerts={alerts}
              selectedSection={selectedSection}
              onAcknowledge={handleAcknowledge}
            />
            <EnvironmentPanel selectedSection={selectedSection} />
          </div>
        </div>

        {/* Comparative Crew Radar */}
        <section>
          <CrewOverviewRadar
            crewData={crewData}
            selectedSection={selectedSection}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-space-600 py-4 mt-8">
        <div className="max-w-[1920px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">
            AstroVitals v2.0 — NASA Space Apps Challenge 2026
          </p>
          <p className="text-[10px] text-gray-600">
            Simulated telemetry calibrated with NASA HRP datasets (earth_preflight • eva_vehicle • space_station • spacecraft)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
