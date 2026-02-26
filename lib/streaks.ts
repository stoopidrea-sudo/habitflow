import type { HabitLog } from "@/types/database";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STREAK_DAYS_PER_FREEZE = 7;
const MAX_FREEZES = 2;

export type StreakOptions = {
  sickModeEnabled?: boolean;
  usedFreezeDates?: string[];
  today?: Date;
  maxFreezes?: number;
  daysPerFreeze?: number;
};

export type FreezeSummary = {
  available: number;
  earned: number;
  used: number;
  usedDates: string[];
};

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day) + days * DAY_IN_MS;
  return new Date(utcMs).toISOString().slice(0, 10);
}

function getUniqueSortedDateKeys(logs: HabitLog[]) {
  return Array.from(new Set(logs.map((log) => log.completed_date))).sort();
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDateKeys(values: string[]) {
  return Array.from(new Set(values.filter(isDateKey))).sort();
}

function getCombinedDateKeys(logs: HabitLog[], usedFreezeDates: string[]) {
  const completionKeys = getUniqueSortedDateKeys(logs);
  const freezeKeys = normalizeDateKeys(usedFreezeDates);

  return normalizeDateKeys([...completionKeys, ...freezeKeys]);
}

function getLatestDateKey(dateKeys: string[]) {
  if (dateKeys.length === 0) return null;
  return dateKeys[dateKeys.length - 1];
}

function resolveOptionDefaults(options: StreakOptions = {}) {
  return {
    sickModeEnabled: options.sickModeEnabled ?? false,
    usedFreezeDates: options.usedFreezeDates ?? [],
    today: options.today ?? new Date(),
    maxFreezes: options.maxFreezes ?? MAX_FREEZES,
    daysPerFreeze: options.daysPerFreeze ?? STREAK_DAYS_PER_FREEZE,
  };
}

export function calculateCurrentStreak(logs: HabitLog[], options: StreakOptions = {}) {
  const resolved = resolveOptionDefaults(options);
  const allDateKeys = getCombinedDateKeys(logs, resolved.usedFreezeDates);
  const dateKeySet = new Set(allDateKeys);

  if (dateKeySet.size === 0) {
    return 0;
  }

  const todayKey = toLocalDateKey(resolved.today);
  const latestDateKey = getLatestDateKey(allDateKeys);
  let cursor = addDaysToDateKey(todayKey, -1);

  if (dateKeySet.has(todayKey)) {
    cursor = todayKey;
  } else if (resolved.sickModeEnabled && latestDateKey) {
    cursor = latestDateKey;
  }

  if (!dateKeySet.has(cursor)) {
    return 0;
  }

  let streak = 0;

  while (dateKeySet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
}

export function calculateLongestStreak(logs: HabitLog[], options: StreakOptions = {}) {
  const resolved = resolveOptionDefaults(options);
  const sortedDateKeys = getCombinedDateKeys(logs, resolved.usedFreezeDates);

  if (sortedDateKeys.length === 0) {
    return 0;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDateKeys.length; i += 1) {
    const previousDay = sortedDateKeys[i - 1];
    const currentDay = sortedDateKeys[i];

    if (addDaysToDateKey(previousDay, 1) === currentDay) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

export function calculateFreezeSummary(
  logs: HabitLog[],
  options: StreakOptions = {}
): FreezeSummary {
  const resolved = resolveOptionDefaults(options);
  const completionDateKeys = getUniqueSortedDateKeys(logs);
  const completionSet = new Set(completionDateKeys);

  const usedDates = normalizeDateKeys(resolved.usedFreezeDates).filter(
    (dateKey) => !completionSet.has(dateKey)
  );

  const earned = Math.floor(completionDateKeys.length / resolved.daysPerFreeze);
  const available = Math.min(
    resolved.maxFreezes,
    Math.max(0, earned - usedDates.length)
  );

  return {
    available,
    earned,
    used: usedDates.length,
    usedDates,
  };
}
