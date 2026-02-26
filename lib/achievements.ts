import { calculateLongestStreak, type StreakOptions } from "@/lib/streaks";
import type { HabitLog } from "@/types/database";

export type AchievementKey = "first_step" | "thirty_day_club" | "weekend_warrior";

export type AchievementDefinition = {
  key: AchievementKey;
  title: string;
  description: string;
};

export type AchievementHabit = {
  id: string;
  frequency_days?: unknown;
};

export type AchievementCheckInput = {
  habits: AchievementHabit[];
  logs: HabitLog[];
  earnedBadgeKeys?: AchievementKey[];
  streakOptions?: StreakOptions;
  today?: Date;
};

export type AchievementCheckResult = {
  unlockedKeys: AchievementKey[];
  newlyUnlockedKeys: AchievementKey[];
  unlockedBadges: AchievementDefinition[];
  newlyUnlockedBadges: AchievementDefinition[];
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "first_step",
    title: "First Step",
    description: "Complete your first habit.",
  },
  {
    key: "thirty_day_club",
    title: "The 30-Day Club",
    description: "Reach a 30-day streak.",
  },
  {
    key: "weekend_warrior",
    title: "Weekend Warrior",
    description: "Complete all weekend habits for the current weekend.",
  },
];

const ACHIEVEMENT_BY_KEY = new Map(
  ACHIEVEMENTS.map((achievement) => [achievement.key, achievement])
);

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeFrequencyDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const parsed = Array.from(
    new Set(
      value
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  ).sort((a, b) => a - b);

  return parsed.length > 0 ? parsed : [0, 1, 2, 3, 4, 5, 6];
}

function hasFirstStep(logs: HabitLog[]) {
  return logs.length > 0;
}

function hasThirtyDayClub(logs: HabitLog[], streakOptions?: StreakOptions) {
  return calculateLongestStreak(logs, streakOptions) >= 30;
}

function hasWeekendWarrior(
  habits: AchievementHabit[],
  logs: HabitLog[],
  today = new Date()
) {
  const completionSet = new Set(logs.map((log) => `${log.habit_id}|${log.completed_date}`));

  const weekday = today.getDay();
  const saturday = addDays(today, -((weekday + 1) % 7));
  const sunday = addDays(saturday, 1);
  const saturdayKey = toDateKey(saturday);
  const sundayKey = toDateKey(sunday);
  const todayKey = toDateKey(today);

  let checks = 0;

  for (const habit of habits) {
    const frequencyDays = normalizeFrequencyDays(habit.frequency_days);
    const includesSaturday = frequencyDays.includes(6);
    const includesSunday = frequencyDays.includes(0);

    if (!includesSaturday && !includesSunday) {
      continue;
    }

    if (includesSaturday) {
      checks += 1;
      if (!completionSet.has(`${habit.id}|${saturdayKey}`)) {
        return false;
      }
    }

    if (includesSunday && sundayKey <= todayKey) {
      checks += 1;
      if (!completionSet.has(`${habit.id}|${sundayKey}`)) {
        return false;
      }
    }
  }

  return checks > 0;
}

export function checkAndUnlockAchievements({
  habits,
  logs,
  earnedBadgeKeys = [],
  streakOptions,
  today = new Date(),
}: AchievementCheckInput): AchievementCheckResult {
  const earned = new Set(earnedBadgeKeys);
  const unlockedNow = new Set<AchievementKey>(earnedBadgeKeys);

  if (hasFirstStep(logs)) {
    unlockedNow.add("first_step");
  }

  if (hasThirtyDayClub(logs, streakOptions)) {
    unlockedNow.add("thirty_day_club");
  }

  if (hasWeekendWarrior(habits, logs, today)) {
    unlockedNow.add("weekend_warrior");
  }

  const unlockedKeys = Array.from(unlockedNow);
  const newlyUnlockedKeys = unlockedKeys.filter((key) => !earned.has(key));

  return {
    unlockedKeys,
    newlyUnlockedKeys,
    unlockedBadges: unlockedKeys
      .map((key) => ACHIEVEMENT_BY_KEY.get(key))
      .filter((achievement): achievement is AchievementDefinition => Boolean(achievement)),
    newlyUnlockedBadges: newlyUnlockedKeys
      .map((key) => ACHIEVEMENT_BY_KEY.get(key))
      .filter((achievement): achievement is AchievementDefinition => Boolean(achievement)),
  };
}
