import type { HabitLog } from "@/types/database";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

export function calculateCurrentStreak(logs: HabitLog[]) {
  const uniqueDateKeys = getUniqueSortedDateKeys(logs);
  const dateKeySet = new Set(uniqueDateKeys);

  if (dateKeySet.size === 0) {
    return 0;
  }

  const todayKey = toLocalDateKey();
  let cursor = dateKeySet.has(todayKey) ? todayKey : addDaysToDateKey(todayKey, -1);
  let streak = 0;

  while (dateKeySet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
}

export function calculateLongestStreak(logs: HabitLog[]) {
  const sortedDateKeys = getUniqueSortedDateKeys(logs);

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
