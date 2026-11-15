import { Radio, Container, Inbox } from 'lucide-react';

const ROWS = 8;

const LINK_LABELS = {
  conectado: { text: 'Connected', className: 'text-gray-400' },
  sin_red: { text: 'No network (real)', className: 'text-vital-red' },
  perdida_simulada_manual: { text: 'Link loss (simulated)', className: 'text-vital-orange' },
  perdida_simulada_programada: { text: 'Scheduled outage (simulated)', className: 'text-vital-orange' },
};

function clock(ms) {
  return ms
    ? new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';
}

function formatDelay(s) {
  if (s === null) return '—';
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function DeliveryBadge({ delivery }) {
  if (delivery === 'tiempo_real') {
    return (
      <span className="inline-flex items-center gap-1 text-vital-green">
        <Radio size={12} />
        Live
      </span>
    );
  }
  if (delivery === 'caja_negra') {
    return (
      <span className="inline-flex items-center gap-1 text-vital-orange">
        <Container size={12} />
        Black box
      </span>
    );
  }
  return <span className="text-gray-500">—</span>;
}

// Ground Control only: how this astronaut's records reached Azure. Shows whether data arrives
// live or as a black-box backlog after an outage, and whether that outage was real or simulated.
export default function ReceptionLog({ member, enabled }) {
  if (!enabled) return null;
  const log = member.cloudLog ?? [];
  const backlog = log.filter((r) => r.delivery === 'caja_negra');
  const lastBacklog = backlog.reduce((max, r) => Math.max(max, r.receivedAt ?? 0), 0);

  return (
    <section className="rounded-xl border border-space-600 bg-space-800/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Inbox size={16} className="text-vital-cyan" />
        <h3 className="text-sm font-medium text-white">Azure reception</h3>
        <span className="text-xs text-gray-500">Ground control only · last 10 min</span>
        {log.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            Last record: <DeliveryBadge delivery={log[0].delivery} />
            {backlog.length > 0 && (
              <span className="text-gray-500">
                {' '}· {backlog.length} from black box, last delivered {clock(lastBacklog)}
              </span>
            )}
          </span>
        )}
      </div>

      {log.length === 0 ? (
        <p className="text-xs text-gray-500">
          No records from this astronaut's device in Azure. Open the crew display for them on a device
          with a connection; it records every 15 s.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="font-normal py-1 pr-4">Recorded</th>
                <th className="font-normal py-1 pr-4">Received</th>
                <th className="font-normal py-1 pr-4">Delay</th>
                <th className="font-normal py-1 pr-4">Delivery</th>
                <th className="font-normal py-1">Link when recorded</th>
              </tr>
            </thead>
            <tbody className="font-mono text-gray-300">
              {log.slice(0, ROWS).map((r) => {
                const link = LINK_LABELS[r.link];
                return (
                  <tr key={r.id} className="border-t border-space-700">
                    <td className="py-1 pr-4 whitespace-nowrap">{clock(r.recordedAt)}</td>
                    <td className="py-1 pr-4 whitespace-nowrap">{clock(r.receivedAt)}</td>
                    <td className="py-1 pr-4 whitespace-nowrap">{formatDelay(r.delay)}</td>
                    <td className="py-1 pr-4 whitespace-nowrap font-sans">
                      <DeliveryBadge delivery={r.delivery} />
                    </td>
                    <td className={`py-1 whitespace-nowrap font-sans ${link?.className ?? 'text-gray-500'}`}>
                      {link?.text ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
