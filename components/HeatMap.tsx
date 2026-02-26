"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HabitLog } from "@/types/database";

type HeatMapProps = {
  logs: HabitLog[];
};

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

function getIntensityClass(count: number) {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900/60";
  if (count === 2) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

export default function HeatMap({ logs }: HeatMapProps) {
  const { days, totalCompletions } = useMemo(() => {
    const countByDate = new Map<string, number>();

    for (const log of logs) {
      const existing = countByDate.get(log.completed_date) ?? 0;
      countByDate.set(log.completed_date, existing + 1);
    }

    const today = new Date();
    const start = addDays(today, -364);
    const nextDays = [];
    let total = 0;

    for (let i = 0; i < 365; i += 1) {
      const date = addDays(start, i);
      const dateKey = toDateKey(date);
      const count = countByDate.get(dateKey) ?? 0;
      total += count;

      nextDays.push({
        dateKey,
        count,
        intensityClass: getIntensityClass(count),
      });
    }

    return { days: nextDays, totalCompletions: total };
  }, [logs]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Activity Heatmap (Last 365 Days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-flow-col grid-rows-7 gap-1">
            {days.map((day) => (
              <div
                key={day.dateKey}
                className={`h-3.5 w-3.5 rounded-[3px] ${day.intensityClass}`}
                title={`${day.dateKey}: ${day.count} completions`}
                aria-label={`${day.dateKey}: ${day.count} completions`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="h-3 w-3 rounded-[3px] bg-muted" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-900/60" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-700" />
            <div className="h-3 w-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-500" />
            <span>More</span>
          </div>
          <p>Total completions: {totalCompletions}</p>
        </div>
      </CardContent>
    </Card>
  );
}
