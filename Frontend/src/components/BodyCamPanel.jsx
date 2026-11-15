import { CameraOff } from 'lucide-react';
import SimulatedCamFeed, { SNAPSHOT_INTERVAL_MS } from './SimulatedCamFeed';
import { bodyCamStreams, getEnvironment } from '../data/mockData';

// What the body camera sees depends on the task, not only the environment
function sceneFor(member) {
  if (member.task.eva) return member.env === 'space_station' ? 'eva_orbit' : 'lunar_surface';
  if (member.env === 'planetary_base') return 'lunar_habitat';
  return member.env;
}

// A spacewalk goes through the suit radio, so it never has bandwidth for full video
function videoMode(member, link) {
  return link.profile.bandwidth === 'high' && !member.task.eva ? 'live' : 'snapshot';
}

function CamFeed({ member, index, link, now, large = false }) {
  const live = link.status === 'aos';
  const mode = videoMode(member, link);
  const stream = bodyCamStreams[member.id];
  const utc = new Date(now).toISOString().slice(11, 19);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-space-600">
      {live ? (
        stream ? (
          <video src={stream} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <SimulatedCamFeed scene={sceneFor(member)} seed={(index + 1) * 7919} mode={mode} />
        )
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500">
          <CameraOff size={large ? 36 : 20} />
          <span className={large ? 'text-sm' : 'text-[11px]'}>No signal</span>
        </div>
      )}

      {/* HUD */}
      <div
        className={`absolute inset-x-0 top-0 flex justify-between p-2 font-mono text-white/90 bg-gradient-to-b from-black/60 to-transparent ${
          large ? 'text-xs' : 'text-[10px]'
        }`}
      >
        <span>
          CAM {member.astronautId}
          {large && ` · ${member.name}`}
        </span>
        {live &&
          (mode === 'live' ? (
            <span className="flex items-center gap-1.5 text-vital-red">
              <span className="w-2 h-2 rounded-full bg-vital-red animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="text-vital-orange">SNAPSHOT</span>
          ))}
      </div>
      {large && (
        <div className="absolute inset-x-0 bottom-0 flex justify-between p-2 font-mono text-[11px] text-white/80 bg-gradient-to-t from-black/60 to-transparent">
          <span>{utc} UTC</span>
          {!stream && <span>SIMULATED FEED</span>}
        </div>
      )}
    </div>
  );
}

// Body-cam view for ground: each camera depends on the link of the environment its astronaut is in
export default function BodyCamPanel({ crewData, selectedId, links, now, onSelect }) {
  const members = Object.values(crewData);
  const selected = crewData[selectedId];
  const link = links[selected.env];

  let note;
  if (link.status !== 'aos') {
    note = 'No signal: video is live-only and resumes when the link returns. Telemetry is still stored onboard.';
  } else if (videoMode(selected, link) === 'live') {
    note = `Live video over ${link.profile.route}.`;
  } else {
    note = `${selected.task.eva ? 'Suit radio' : 'Low-bandwidth link'} (${link.profile.route}): one still frame every ${
      SNAPSHOT_INTERVAL_MS / 1000
    } s to keep telemetry flowing.`;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_200px] gap-4 max-w-5xl">
      <div className="space-y-2">
        <CamFeed member={selected} index={members.indexOf(selected)} link={link} now={now} large />
        <p className="text-xs text-gray-400">{note}</p>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 content-start">
        {members
          .filter((m) => m.id !== selectedId)
          .map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className="text-left cursor-pointer rounded-xl hover:ring-2 hover:ring-nasa-blue transition"
              title={`Show ${m.name}`}
            >
              <CamFeed member={m} index={members.indexOf(m)} link={links[m.env]} now={now} />
              <span className="block mt-1 text-xs text-gray-400 truncate">
                {m.name} · {getEnvironment(m.env).shortName}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
