"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { updateHabit } from "@/app/actions/habits";
import { createClient } from "@/lib/supabase/client";
import {
  calculateCurrentStreak,
  calculateFreezeSummary,
  calculateLongestStreak,
} from "@/lib/streaks";
import type { HabitWithLogs } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HabitType = "boolean" | "numeric" | "timer";

type ChecklistStep = {
  id: string;
  label: string;
  completed: boolean;
};

type HabitFreezeMetadataEntry = {
  used_dates?: unknown;
};

type UserMetadata = {
  sick_mode_enabled?: unknown;
  habit_freezes?: Record<string, HabitFreezeMetadataEntry>;
};

type ExtendedHabit = HabitWithLogs & {
  type?: HabitType | null;
  goal_value?: number | null;
  unit?: string | null;
  frequency_days?: unknown;
  steps?: unknown;
  sub_tasks?: unknown;
  subtasks?: unknown;
};

type HabitCardProps = {
  habit: HabitWithLogs;
};

const DEFAULT_FREQUENCY_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MAX_FREEZES = 2;
const SICK_MODE_EVENT = "habitflow:sick-mode-changed";
const SWIPE_THRESHOLD = 70;

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKeys(values: string[]) {
  return Array.from(
    new Set(values.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)))
  ).sort();
}

function readHabitFreezeDates(metadata: UserMetadata, habitId: string) {
  const raw = metadata.habit_freezes?.[habitId]?.used_dates;
  if (!Array.isArray(raw)) return [];

  return normalizeDateKeys(
    raw.map((value) => (typeof value === "string" ? value : ""))
  );
}

function createUpdatedMetadataWithFreeze(
  metadata: UserMetadata,
  habitId: string,
  usedDates: string[]
): UserMetadata {
  const habitFreezes = metadata.habit_freezes ?? {};

  return {
    ...metadata,
    habit_freezes: {
      ...habitFreezes,
      [habitId]: {
        ...(habitFreezes[habitId] ?? {}),
        used_dates: normalizeDateKeys(usedDates),
      },
    },
  };
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainingSeconds).padStart(2, "0");

  return hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function normalizeHabitType(value: unknown): HabitType {
  if (value === "numeric" || value === "timer" || value === "boolean") {
    return value;
  }
  return "boolean";
}

function normalizeGoalValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

function normalizeFrequencyDays(value: unknown) {
  if (!value) return [...DEFAULT_FREQUENCY_DAYS];

  let rawValues: unknown[] = [];
  if (Array.isArray(value)) {
    rawValues = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      rawValues = Array.isArray(parsed) ? parsed : value.split(",");
    } catch {
      rawValues = value.split(",");
    }
  } else {
    return [...DEFAULT_FREQUENCY_DAYS];
  }

  const dayMap: Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };

  const parsedDays = Array.from(
    new Set(
      rawValues
        .map((day) => {
          if (typeof day === "number") return day;
          if (typeof day === "string") {
            const lowered = day.trim().toLowerCase();
            if (lowered in dayMap) return dayMap[lowered];
            return Number(lowered);
          }
          return NaN;
        })
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  ).sort((a, b) => a - b);

  return parsedDays.length > 0 ? parsedDays : [...DEFAULT_FREQUENCY_DAYS];
}

function getTimerTotalSeconds(goalValue: number, unit: string) {
  const normalizedUnit = unit.trim().toLowerCase();

  if (["s", "sec", "second", "seconds"].includes(normalizedUnit)) {
    return Math.round(goalValue);
  }
  if (["h", "hr", "hour", "hours"].includes(normalizedUnit)) {
    return Math.round(goalValue * 3600);
  }
  return Math.round(goalValue * 60);
}

function parseChecklistSteps(habit: ExtendedHabit): ChecklistStep[] {
  const raw = habit.steps ?? habit.sub_tasks ?? habit.subtasks;

  if (!raw) return [];

  let values: unknown[] = [];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string") {
    values = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const steps = values
    .map((value, index) => {
      if (typeof value === "string") {
        return {
          id: `${index}-${value}`,
          label: value,
          completed: false,
        };
      }

      if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        const labelSource = record.label ?? record.title ?? record.name;
        const label = typeof labelSource === "string" ? labelSource.trim() : "";
        if (!label) return null;

        return {
          id: String(record.id ?? `${index}-${label}`),
          label,
          completed: Boolean(record.completed),
        };
      }

      return null;
    })
    .filter((step): step is ChecklistStep => Boolean(step));

  return steps.length > 1 ? steps : [];
}

function formatDayList(days: number[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((day) => labels[day]).join(", ");
}

export default function HabitCard({ habit }: HabitCardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const habitData = habit as ExtendedHabit;

  const habitType = normalizeHabitType(habitData.type);
  const goalValue = normalizeGoalValue(habitData.goal_value);
  const unit = (habitData.unit ?? "").trim();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [checkedStepsById, setCheckedStepsById] = useState<Record<string, boolean>>({});
  const [usedFreezeDates, setUsedFreezeDates] = useState<string[]>([]);
  const [sickModeEnabled, setSickModeEnabled] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [ignoreCurrentTouch, setIgnoreCurrentTouch] = useState(false);

  const todayKey = toLocalDateKey();
  const todayDayIndex = new Date().getDay();

  const frequencyDays = useMemo(
    () => normalizeFrequencyDays(habitData.frequency_days),
    [habitData.frequency_days]
  );
  const isScheduledToday = frequencyDays.includes(todayDayIndex);

  const baseTodayLogsCount = useMemo(
    () => habit.logs.filter((log) => log.completed_date === todayKey).length,
    [habit.logs, todayKey]
  );
  const [optimisticTodayLogsCount, setOptimisticTodayLogsCount] = useState(baseTodayLogsCount);

  const streakOptions = useMemo(
    () => ({ sickModeEnabled, usedFreezeDates }),
    [sickModeEnabled, usedFreezeDates]
  );

  const currentStreak = useMemo(
    () => calculateCurrentStreak(habit.logs, streakOptions),
    [habit.logs, streakOptions]
  );
  const longestStreak = useMemo(
    () => calculateLongestStreak(habit.logs, streakOptions),
    [habit.logs, streakOptions]
  );
  const freezeSummary = useMemo(
    () => calculateFreezeSummary(habit.logs, streakOptions),
    [habit.logs, streakOptions]
  );

  const hasUsedFreezeToday = freezeSummary.usedDates.includes(todayKey);

  const numericProgressValue =
    habitType === "numeric" ? Math.min(optimisticTodayLogsCount, goalValue) : 0;
  const numericProgressPercent =
    habitType === "numeric" ? Math.min(100, (numericProgressValue / goalValue) * 100) : 0;

  const hasCompletedToday =
    habitType === "numeric" ? numericProgressValue >= goalValue : optimisticTodayLogsCount > 0;

  const checklistSteps = useMemo(() => parseChecklistSteps(habitData), [habitData]);
  const completedStepsCount = useMemo(
    () =>
      checklistSteps.filter((step) => checkedStepsById[step.id] ?? step.completed).length,
    [checkedStepsById, checklistSteps]
  );

  const timerTotalSeconds = habitType === "timer" ? getTimerTotalSeconds(goalValue, unit) : 0;
  const [remainingSeconds, setRemainingSeconds] = useState(timerTotalSeconds);
  const displayedRemainingSeconds = hasCompletedToday ? 0 : remainingSeconds;

  useEffect(() => {
    setOptimisticTodayLogsCount(baseTodayLogsCount);
  }, [baseTodayLogsCount]);

  useEffect(() => {
    let active = true;

    const onSickModeChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled === "boolean") {
        setSickModeEnabled(customEvent.detail.enabled);
      }
    };

    window.addEventListener(SICK_MODE_EVENT, onSickModeChanged as EventListener);

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;

        if (error || !data.user) {
          setMetadataReady(true);
          return;
        }

        const metadata = (data.user.user_metadata ?? {}) as UserMetadata;
        setUsedFreezeDates(readHabitFreezeDates(metadata, habit.id));
        setSickModeEnabled(Boolean(metadata.sick_mode_enabled));
        setMetadataReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMetadataReady(true);
      });

    return () => {
      active = false;
      window.removeEventListener(SICK_MODE_EVENT, onSickModeChanged as EventListener);
    };
  }, [habit.id, supabase]);

  const handleMarkComplete = useCallback(
    async (silentDuplicate = false) => {
      setErrorMessage("");
      const previousCount = optimisticTodayLogsCount;
      const optimisticNextCount =
        habitType === "numeric"
          ? previousCount + 1
          : Math.max(previousCount, 1);

      setOptimisticTodayLogsCount(optimisticNextCount);
      setIsSubmitting(true);

      const { error } = await supabase.from("habit_logs").insert({
        habit_id: habit.id,
        completed_date: todayKey,
      });

      setIsSubmitting(false);

      if (error) {
        const isDuplicate = error.message.toLowerCase().includes("duplicate");

        if (isDuplicate) {
          setOptimisticTodayLogsCount(Math.max(previousCount, 1));

          if (!silentDuplicate) {
            if (habitType === "numeric") {
              setErrorMessage(
                "This habit already has a log for today. If you want incremental numeric progress, allow multiple daily logs in your database."
              );
            } else {
              setErrorMessage("Already completed for today.");
            }
          }
          return;
        }

        setOptimisticTodayLogsCount(previousCount);
        setErrorMessage(error.message);
        return;
      }

      router.refresh();
    },
    [habit.id, habitType, optimisticTodayLogsCount, router, supabase, todayKey]
  );

  useEffect(() => {
    if (habitType !== "timer" || !timerRunning || hasCompletedToday || !isScheduledToday) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          void handleMarkComplete(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleMarkComplete, hasCompletedToday, habitType, isScheduledToday, timerRunning]);

  async function handleUseFreeze() {
    setErrorMessage("");

    if (hasCompletedToday) {
      setErrorMessage("Today is already completed. No freeze needed.");
      return;
    }

    if (!isScheduledToday) {
      setErrorMessage("This habit is not scheduled today.");
      return;
    }

    if (hasUsedFreezeToday) {
      setErrorMessage("A freeze is already active for today.");
      return;
    }

    if (freezeSummary.available <= 0) {
      setErrorMessage("No freezes available. Complete habits to earn more.");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSubmitting(false);
      setErrorMessage("You must be logged in to use a freeze.");
      return;
    }

    const metadata = (user.user_metadata ?? {}) as UserMetadata;
    const existingDates = readHabitFreezeDates(metadata, habit.id);
    const nextDates = normalizeDateKeys([...existingDates, todayKey]);

    const { error: updateError } = await supabase.auth.updateUser({
      data: createUpdatedMetadataWithFreeze(metadata, habit.id, nextDates),
    });

    setIsSubmitting(false);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    setUsedFreezeDates(nextDates);
    router.refresh();
  }

  async function handleQuickEdit() {
    const rawName = window.prompt("Edit habit name", habit.name);
    if (rawName === null) return;

    const nextName = rawName.trim();
    if (!nextName || nextName === habit.name) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await updateHabit(habit.id, { name: nextName });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update habit.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const touchedInteractiveElement = Boolean(
      target.closest("button,a,input,textarea,select,[role='button']")
    );

    if (touchedInteractiveElement || event.touches.length !== 1) {
      setIgnoreCurrentTouch(true);
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    setIgnoreCurrentTouch(false);
    setTouchStart({
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    });
    setTouchEnd(null);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!touchStart || ignoreCurrentTouch || event.touches.length !== 1) return;

    setTouchEnd({
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    });
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd || ignoreCurrentTouch || isSubmitting) {
      setTouchStart(null);
      setTouchEnd(null);
      setIgnoreCurrentTouch(false);
      return;
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;

    const mostlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const passedThreshold = Math.abs(deltaX) >= SWIPE_THRESHOLD;

    if (mostlyHorizontal && passedThreshold) {
      if (deltaX < 0) {
        if (isScheduledToday && !hasCompletedToday) {
          void handleMarkComplete();
        }
      } else {
        void handleQuickEdit();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIgnoreCurrentTouch(false);
  }

  function toggleTimer() {
    if (!isScheduledToday || hasCompletedToday) return;

    if (remainingSeconds === 0) {
      setRemainingSeconds(timerTotalSeconds);
    }
    setTimerRunning((previous) => !previous);
  }

  function resetTimer() {
    setTimerRunning(false);
    setRemainingSeconds(timerTotalSeconds);
  }

  return (
    <Card
      className="h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader>
        <CardTitle className="line-clamp-2">{habit.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Current Streak</p>
            <p className="mt-1 text-2xl font-semibold">{currentStreak}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Longest Streak</p>
            <p className="mt-1 text-2xl font-semibold">{longestStreak}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Type: {habitType}</p>
          <p className="text-xs text-muted-foreground">
            Goal: {goalValue} {unit || (habitType === "timer" ? "minutes" : "times")}
          </p>
          <p className="text-xs text-muted-foreground">Repeats: {formatDayList(frequencyDays)}</p>
          <p className="text-xs text-muted-foreground md:hidden">
            Swipe left to complete, swipe right to edit.
          </p>
          {sickModeEnabled ? (
            <p className="text-xs font-medium text-amber-600">
              Sick Mode is enabled. Streak decay is paused.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Freezes Available</span>
            <span>{metadataReady ? `${freezeSummary.available}/${MAX_FREEZES}` : "..."}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleUseFreeze}
            disabled={
              isSubmitting ||
              !metadataReady ||
              !isScheduledToday ||
              hasCompletedToday ||
              hasUsedFreezeToday ||
              freezeSummary.available <= 0
            }
          >
            {hasUsedFreezeToday ? "Freeze Active Today" : "Use Freeze for Today"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Earn 1 freeze every 7 completed days (max 2).
          </p>
        </div>

        {habitType === "numeric" ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Today&apos;s Progress</span>
              <span>
                {numericProgressValue}/{goalValue} {unit || ""}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${numericProgressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {habitType === "timer" ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Countdown</p>
              <p className="font-mono text-lg font-semibold">{formatTimer(displayedRemainingSeconds)}</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={toggleTimer}
                disabled={!isScheduledToday || hasCompletedToday || isSubmitting}
              >
                {timerRunning ? "Pause Timer" : "Start Timer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetTimer}
                disabled={isSubmitting || hasCompletedToday}
              >
                Reset
              </Button>
            </div>
          </div>
        ) : null}

        {checklistSteps.length > 0 ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Checklist</span>
              <span>
                {completedStepsCount}/{checklistSteps.length}
              </span>
            </div>
            <ul className="space-y-2">
              {checklistSteps.map((step, index) => {
                const checked = checkedStepsById[step.id] ?? step.completed;

                return (
                  <li key={step.id} className="flex items-start gap-2">
                    <input
                      id={`${habit.id}-step-${index}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedStepsById((previous) => ({
                          ...previous,
                          [step.id]: !checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-input"
                    />
                    <label
                      htmlFor={`${habit.id}-step-${index}`}
                      className={`text-sm ${checked ? "text-muted-foreground line-through" : ""}`}
                    >
                      {step.label}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!isScheduledToday ? (
          <p className="text-sm text-muted-foreground">Off day. This habit is not scheduled today.</p>
        ) : null}

        {habitType === "boolean" ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={hasCompletedToday}
              onChange={() => {
                if (!hasCompletedToday) {
                  void handleMarkComplete();
                }
              }}
              disabled={isSubmitting || hasCompletedToday || !isScheduledToday}
              className="h-4 w-4 rounded border-input"
            />
            <span>
              {hasCompletedToday
                ? "Completed Today"
                : isSubmitting
                  ? "Saving..."
                  : "Mark Complete for Today"}
            </span>
          </label>
        ) : (
          <Button
            className="w-full"
            variant={hasCompletedToday ? "secondary" : "default"}
            onClick={() => void handleMarkComplete()}
            disabled={isSubmitting || hasCompletedToday || !isScheduledToday}
          >
            {habitType === "numeric"
              ? hasCompletedToday
                ? "Goal Reached Today"
                : isSubmitting
                  ? "Saving..."
                  : `Add Progress (+1${unit ? ` ${unit}` : ""})`
              : hasCompletedToday
                ? "Completed Today"
                : isSubmitting
                  ? "Saving..."
                  : "Mark Complete for Today"}
          </Button>
        )}

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
