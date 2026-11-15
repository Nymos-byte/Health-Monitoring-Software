import { MISSION_PHASES, MISSION_TYPES, TASKS, getTask, recordKey } from '../data/mockData';

export function getMissionPhase(missions, member) {
  return MISSION_PHASES[missions[member.missionId].phase];
}

// Environments an astronaut can be in right now, given their mission's phase
export function getAllowedEnvironments(missions, member) {
  return getMissionPhase(missions, member).environments;
}

export function getNextPhase(mission) {
  const order = MISSION_TYPES[mission.type];
  return order[order.indexOf(mission.phase) + 1] ?? null;
}

// Why a task can't be assigned to an astronaut, or null if it can
export function taskBlocker(records, missions, member, taskId) {
  const task = getTask(taskId);
  if (!getAllowedEnvironments(missions, member).includes(task.environment)) {
    return 'not in this mission phase';
  }
  if (task.once && records[recordKey(member.id, taskId)]) return 'done';
  return null;
}

export function canAssignTask(records, missions, member, taskId) {
  return taskBlocker(records, missions, member, taskId) === null;
}

// Task each crew member gets when the mission enters a phase: the phase default,
// or the first task of that phase they are still allowed to do
export function taskForPhase(records, missions, member) {
  const phase = getMissionPhase(missions, member);
  if (canAssignTask(records, missions, member, phase.defaultTask)) return phase.defaultTask;
  return TASKS.find((t) => canAssignTask(records, missions, member, t.id))?.id ?? null;
}

// Crewmates of the same mission doing the same spacewalk
export function getEvaPartners(member, crewData) {
  if (!member.task.eva) return [];
  return Object.values(crewData).filter(
    (m) => m.id !== member.id && m.missionId === member.missionId && m.taskId === member.taskId
  );
}
