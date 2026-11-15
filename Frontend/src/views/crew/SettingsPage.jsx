import { Check, MonitorDot, Siren, Watch } from 'lucide-react';
import { THEMES } from '../../utils/theme';

// Display settings plus the demo controls that a real device would not need on its main screens
export default function SettingsPage({
  crewData,
  member,
  onSelectAstronaut,
  textSize,
  onTextSize,
  emergencyActive,
  onToggleEmergency,
  onChangeView,
  themeChoice,
  theme,
  onThemeChoice,
}) {
  const active = THEMES.find((t) => t.id === theme);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-gray-500">Colours</h3>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChoice(t.id)}
              className={`min-h-[64px] px-3 rounded-xl border-2 text-left cursor-pointer ${
                themeChoice === t.id ? 'border-vital-cyan bg-vital-cyan/10' : 'border-space-600'
              }`}
            >
              <span className="block text-lg text-white">{t.label}</span>
              <span className="block text-xs text-gray-400">{t.hint}</span>
            </button>
          ))}
        </div>
        {themeChoice === 'auto' && (
          <p className="text-sm text-gray-400">Now using: {active.label}</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-gray-500">Text size</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['normal', 'Normal'],
            ['large', 'Large'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => onTextSize(id)}
              className={`min-h-[60px] rounded-xl border-2 text-lg cursor-pointer ${
                textSize === id ? 'border-vital-cyan bg-vital-cyan/10 text-white' : 'border-space-600 text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-gray-500">This device is worn by</h3>
        <div className="space-y-2">
          {Object.values(crewData).map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectAstronaut(m.id)}
              className={`w-full min-h-[56px] px-4 rounded-xl border-2 flex items-center gap-3 text-left cursor-pointer ${
                m.id === member.id ? 'border-vital-cyan bg-vital-cyan/10' : 'border-space-600'
              }`}
            >
              <span className="text-2xl">{m.avatar}</span>
              <span className="flex-1 text-lg text-white">{m.name}</span>
              {m.id === member.id && <Check size={22} className="text-vital-cyan" />}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">Demo only: a real device is paired to one astronaut.</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-gray-500">Demo</h3>
        <button
          onClick={onToggleEmergency}
          className={`w-full min-h-[60px] rounded-xl border-2 flex items-center justify-center gap-2 text-lg cursor-pointer ${
            emergencyActive ? 'border-vital-red text-vital-red' : 'border-space-600 text-gray-200'
          }`}
        >
          <Siren size={22} />
          {emergencyActive ? 'End simulated emergency' : 'Simulate emergency'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChangeView('wrist')}
            className="min-h-[60px] rounded-xl border-2 border-space-600 flex items-center justify-center gap-2 text-lg text-gray-200 cursor-pointer"
          >
            <Watch size={22} />
            Wrist display
          </button>
          <button
            onClick={() => onChangeView('ground')}
            className="min-h-[60px] rounded-xl border-2 border-space-600 flex items-center justify-center gap-2 text-lg text-gray-200 cursor-pointer"
          >
            <MonitorDot size={22} />
            Ground Control
          </button>
        </div>
      </section>
    </div>
  );
}
