"use client";

import { useMemo, useState } from "react";

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

type CalendarCell = {
  label: number | null;
  dateKey: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarHistory({ habits, logs }: CalendarHistoryProps) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const completionCountByDate = useMemo(() => {
    const map = new Map<string, number>();

    for (const log of logs) {
      map.set(log.completed_date, (map.get(log.completed_date) ?? 0) + 1);
    }

    return map;
  }, [logs]);

  const dayCells = useMemo(() => {
    const cells: CalendarCell[] = [];
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ label: null, dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ label: day, dateKey: toDateKey(date) });
    }

    return cells;
  }, [displayMonth]);

  const selectedCompletionCount = selectedDateKey
    ? completionCountByDate.get(selectedDateKey) ?? 0
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <CardTitle>Calendar History</CardTitle>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
          >
            Prev
          </Button>
          <p className="text-sm font-medium">
            {displayMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
          >
            Next
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayCells.map((cell, index) => {
            if (cell.dateKey === null || cell.label === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const completionCount = completionCountByDate.get(cell.dateKey) ?? 0;
            const hasCompletions = completionCount > 0;
            const selected = selectedDateKey === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={[
                  "aspect-square rounded-md border text-xs transition-colors",
                  hasCompletions
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "border-border hover:bg-muted",
                  selected ? "ring-2 ring-primary ring-offset-1" : "",
                ].join(" ")}
              >
                {cell.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border p-3 text-sm">
          {selectedDateKey ? (
            <p>
              <span className="font-medium">{selectedDateKey}</span>
              {" - "}
              {selectedCompletionCount} completion
              {selectedCompletionCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Select a day to see completion count. Tracking {habits.length} habit
              {habits.length === 1 ? "" : "s"}.
            </p>
          )}

          {selectedDateKey ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-8 px-2 text-xs"
              onClick={() => setSelectedDateKey(null)}
            >
              Clear selection
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

