import { getMetricRange, getTaskMetrics, getVitalContext, COMBINED_RULES } from '../data/mockData';

// context: { activity, age, eva } so task-dependent limits can be applied (see getMetricRange)
export function getVitalStatus(vitalName, value, sectionId = 'space_station', context = {}) {
  // Activity level comes from the assigned task, so it is never an alarm by itself
  if (vitalName === 'activity_level') return 'nominal';
  if (vitalName === 'flight_phase') {
    if (value === 'Launch' || value === 'Reentry') return 'caution';
    return 'nominal';
  }

  const range = getMetricRange(vitalName, sectionId, context);
  if (!range || typeof value !== 'number') return 'nominal';

  if (value <= range.criticalLow || value >= range.criticalHigh) return 'critical';
  if (value < range.min || value > range.max) return 'caution';
  return 'nominal';
}

function metricStatuses(member, vitals) {
  const context = getVitalContext(member, vitals);
  return getTaskMetrics(member.task).map((key) => ({
    key,
    status: getVitalStatus(key, vitals[key], member.env, context),
  }));
}

// Overall status of an astronaut for their current task (defaults to the latest readings)
export function getMemberStatus(member, vitals = member.data.currentVitals) {
  const statuses = metricStatuses(member, vitals);
  const outOfRange = new Set(statuses.filter((s) => s.status !== 'nominal').map((s) => s.key));
  const metrics = getTaskMetrics(member.task);

  // Several readings out of range together count as critical (see COMBINED_RULES)
  const combined = COMBINED_RULES.some(
    (rule) =>
      rule.metrics.every((key) => metrics.includes(key)) &&
      rule.metrics.filter((key) => outOfRange.has(key)).length >= rule.min
  );
  if (combined || statuses.some((s) => s.status === 'critical')) return 'critical';
  if (outOfRange.size) return 'caution';
  return 'nominal';
}

export function calculateHealthScore(member, vitals = member.data.currentVitals) {
  const score = metricStatuses(member, vitals).reduce(
    (acc, { status }) => acc - (status === 'critical' ? 18 : status === 'caution' ? 8 : 0),
    100
  );
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getStatusColor(status) {
  switch (status) {
    case 'critical':
      return '#ff4444';
    case 'caution':
      return '#ff9100';
    case 'nominal':
      return '#00ff88';
    default:
      return '#00ff88';
  }
}

export function getStatusBgClass(status) {
  switch (status) {
    case 'critical':
      return 'bg-vital-red/20 border-vital-red';
    case 'caution':
      return 'bg-vital-orange/20 border-vital-orange';
    case 'nominal':
      return 'bg-vital-green/20 border-vital-green';
    default:
      return 'bg-vital-green/20 border-vital-green';
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case 'critical':
      return 'CRITICAL';
    case 'caution':
      return 'CAUTION';
    case 'nominal':
      return 'NOMINAL';
    default:
      return 'NOMINAL';
  }
}

export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-US');
}

// Human-friendly length of an activity or session
export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 && hours < 10 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}
