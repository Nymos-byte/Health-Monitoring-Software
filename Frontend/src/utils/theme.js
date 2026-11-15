// Colour themes for the crew devices (see index.css). Ground Control always uses `cabin`.
export const THEMES = [
  { id: 'auto', label: 'Auto', hint: 'Follows your activity' },
  { id: 'cabin', label: 'Cabin', hint: 'Interior lighting' },
  { id: 'sun', label: 'Sunlight', hint: 'Direct sun, EVA, outdoors' },
  { id: 'night', label: 'Night', hint: 'Sleep periods, no blue light' },
];

const THEME_KEY = 'vitalx.crew.theme';

// Auto: dim amber while resting or sleeping, high contrast on a spacewalk, cabin otherwise
export function getAutoTheme(member) {
  if (member.task.eva) return 'sun';
  if (member.task.activity === 'Rest' && /sleep|rest/i.test(member.task.name)) return 'night';
  return 'cabin';
}

export function readThemeChoice() {
  try {
    return localStorage.getItem(THEME_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function saveThemeChoice(choice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage unavailable: the choice still applies for this session
  }
}
