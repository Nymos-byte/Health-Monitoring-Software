import { getMetricRange, SECTIONS } from '../data/mockData';

// context: { activity, age } so exertion-dependent limits can be applied (see getMetricRange)
export function getVitalStatus(vitalName, value, sectionId = 'space_station', context = {}) {
  if (vitalName === 'activity_level') {
    if (value === 'Intense' && sectionId !== 'eva_vehicle') return 'caution';
    return 'nominal';
  }
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

export function determineSectionStatus(vitals, sectionId, age) {
  const section = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];
  const context = { activity: vitals.activity_level, age };
  let hasCritical = false;
  let hasCaution = false;

  for (const key of section.metrics) {
    if (key === 'activity_level' || key === 'flight_phase') continue;
    const status = getVitalStatus(key, vitals[key], sectionId, context);
    if (status === 'critical') hasCritical = true;
    else if (status === 'caution') hasCaution = true;
  }

  if (hasCritical) return 'critical';
  if (hasCaution) return 'caution';
  return 'nominal';
}

export function calculateSectionHealthScore(vitals, sectionId, age) {
  const section = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];
  const context = { activity: vitals.activity_level, age };
  let score = 100;

  for (const key of section.metrics) {
    if (key === 'activity_level' || key === 'flight_phase') continue;
    const status = getVitalStatus(key, vitals[key], sectionId, context);
    if (status === 'critical') score -= 18;
    else if (status === 'caution') score -= 8;
  }

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
