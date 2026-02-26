"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HabitLog } from "@/types/database";

type AnalyticsHabit = {
  id: string;
  name: string;
};

type CalendarHistoryProps = {
  habits: AnalyticsHabit[];
  logs: HabitLog[];
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarHistory({ habits, logs }: CalendarHistoryProps) {
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const habitNameById = useMemo(
    () => new Map(habits.map((habit) => [habit.id, habit.name])),
    [habits]
  );

  const completionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const log of logs) {
      const entry = map.get(log.completed_date) ?? new Set<string>();
      entry.add(log.habit_id);
      map.set(log.completed_date, entry);
    }

    return map;
  }, [logs]);

  const daysInMonth = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth() + 1,
    0
  ).getDate();
  const firstWeekday = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth(),
    1
  ).getDay();

  const dayCells = useMemo(() => {
    const cells: Array<{ date: Date | null; dateKey: string | null }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ date: null, dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      cells.push({ date, dateKey: toDateKey(date) });
    }

    return cells;
  }, [daysInMonth, displayMonth, firstWeekday]);

  const selectedHabitIds = completionMap.get(selectedDateKey) ?? new Set<string>();
  const selectedHabits = Array.from(selectedHabitIds)
    .map((habitId) => habitNameById.get(habitId) ?? "Unknown habit")
    .sort((a, b) => a.localeCompare(b));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Calendar History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-medium">
            {displayMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAY_LABELS.map((weekday) => (
            <div key={weekday} className="py-1">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayCells.map((cell, index) => {
            if (!cell.date || !cell.dateKey) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const completionCount = completionMap.get(cell.dateKey)?.size ?? 0;
            const selected = selectedDateKey === cell.dateKey;
            const inCurrentMonth = isSameMonth(cell.date, displayMonth);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={[
                  "aspect-square rounded-md border text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                  !inCurrentMonth ? "text-muted-foreground/50" : "",
                ].join(" ")}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <span>{cell.date.getDate()}</span>
                  {completionCount > 0 ? (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">
                      {completionCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">
            Completed on {selectedDateKey}
          </p>
          {selectedHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits completed on this date.</p>
          ) : (
            <ul className="space-y-1">
              {selectedHabits.map((name) => (
                <li key={name} className="text-sm">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
