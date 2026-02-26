import type { HabitLog } from "@/types/database";

export type HabitType = "boolean" | "numeric" | "timer";

export type CompletionXpInput = {
  habitType?: HabitType;
  currentStreak?: number;
  completedAllToday?: boolean;
  milestoneReached?: boolean;
};

export type CompletionXpResult = {
  total: number;
  breakdown: {
    base: number;
    habitTypeBonus: number;
    streakBonus: number;
    allHabitsBonus: number;
    milestoneBonus: number;
  };
};

export type LevelInfo = {
  level: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
};

const BASE_XP = 20;
const NUMERIC_BONUS_XP = 5;
const TIMER_BONUS_XP = 8;
const STREAK_MILESTONE_XP = 15;
const ALL_DAILY_HABITS_XP = 25;
const MILESTONE_XP = 50;

function xpNeededForNextLevel(level: number) {
  return 100 + (level - 1) * 25;
}

export function calculateCompletionXp({
  habitType = "boolean",
  currentStreak = 0,
  completedAllToday = false,
  milestoneReached = false,
}: CompletionXpInput = {}): CompletionXpResult {
  const habitTypeBonus =
    habitType === "numeric" ? NUMERIC_BONUS_XP : habitType === "timer" ? TIMER_BONUS_XP : 0;
  const streakBonus = currentStreak > 0 && currentStreak % 7 === 0 ? STREAK_MILESTONE_XP : 0;
  const allHabitsBonus = completedAllToday ? ALL_DAILY_HABITS_XP : 0;
  const milestoneBonus = milestoneReached ? MILESTONE_XP : 0;

  const total = BASE_XP + habitTypeBonus + streakBonus + allHabitsBonus + milestoneBonus;

  return {
    total,
    breakdown: {
      base: BASE_XP,
      habitTypeBonus,
      streakBonus,
      allHabitsBonus,
      milestoneBonus,
    },
  };
}

export function calculateTotalXpFromLogs(logs: HabitLog[], averageXpPerCompletion = BASE_XP) {
  const completions = logs.length;
  return completions * Math.max(1, Math.round(averageXpPerCompletion));
}

export function getLevelFromXp(totalXp: number): LevelInfo {
  const safeTotalXp = Math.max(0, Math.floor(totalXp));

  let level = 1;
  let xpInCurrentLevel = safeTotalXp;
  let xpForNextLevel = xpNeededForNextLevel(level);

  while (xpInCurrentLevel >= xpForNextLevel) {
    xpInCurrentLevel -= xpForNextLevel;
    level += 1;
    xpForNextLevel = xpNeededForNextLevel(level);
  }

  const xpToNextLevel = xpForNextLevel - xpInCurrentLevel;
  const progressPercent = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);

  return {
    level,
    totalXp: safeTotalXp,
    xpInCurrentLevel,
    xpForNextLevel,
    xpToNextLevel,
    progressPercent,
  };
}
