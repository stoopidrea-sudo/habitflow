"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { HabitWithLogs } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HabitCardProps = {
  habit: HabitWithLogs;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day) + days * DAY_IN_MS;
  return new Date(utcMs).toISOString().slice(0, 10);
}

function getLongestStreak(dateKeys: string[]) {
  if (dateKeys.length === 0) return 0;

  const sortedKeys = [...dateKeys].sort();
  let longest = 1;
  let running = 1;

  for (let i = 1; i < sortedKeys.length; i += 1) {
    const previous = sortedKeys[i - 1];
    const current = sortedKeys[i];

    if (addDaysToKey(previous, 1) === current) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  return longest;
}

function getCurrentStreak(dateKeysSet: Set<string>, todayKey: string) {
  let current = 0;
  let cursor = dateKeysSet.has(todayKey) ? todayKey : addDaysToKey(todayKey, -1);

  while (dateKeysSet.has(cursor)) {
    current += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  return current;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const supabase = createClient();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const todayKey = toLocalDateKey();

  const { hasCompletedToday, currentStreak, longestStreak } = useMemo(() => {
    const uniqueDateKeys = Array.from(
      new Set(habit.logs.map((log) => log.completed_date))
    );
    const dateKeysSet = new Set(uniqueDateKeys);

    return {
      hasCompletedToday: dateKeysSet.has(todayKey),
      currentStreak: getCurrentStreak(dateKeysSet, todayKey),
      longestStreak: getLongestStreak(uniqueDateKeys),
    };
  }, [habit.logs, todayKey]);

  async function handleMarkComplete() {
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habit.id,
      completed_date: todayKey,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setErrorMessage("Already marked complete for today.");
      } else {
        setErrorMessage(error.message);
      }
      return;
    }

    router.refresh();
  }

  return (
    <Card className="h-full">
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

        <Button
          className="w-full"
          variant={hasCompletedToday ? "secondary" : "default"}
          onClick={handleMarkComplete}
          disabled={isSubmitting || hasCompletedToday}
        >
          {hasCompletedToday
            ? "Completed Today"
            : isSubmitting
              ? "Saving..."
              : "Mark Complete for Today"}
        </Button>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
