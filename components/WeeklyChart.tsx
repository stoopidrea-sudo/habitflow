"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HabitLog } from "@/types/database";

type AnalyticsHabit = {
  id: string;
  frequency_days?: unknown;
};

type WeeklyChartProps = {
  habits: AnalyticsHabit[];
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

function normalizeFrequencyDays(value: unknown) {
  if (!Array.isArray(value)) return [0, 1, 2, 3, 4, 5, 6];

  const valid = Array.from(
    new Set(
      value
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  );

  return valid.length > 0 ? valid : [0, 1, 2, 3, 4, 5, 6];
}

function getWeekStart(date: Date) {
  return addDays(date, -date.getDay());
}

function getWeekStats(
  start: Date,
  habits: AnalyticsHabit[],
  completionSet: Set<string>
) {
  let expected = 0;
  let completed = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = addDays(start, dayOffset);
    const dateKey = toDateKey(date);
    const weekday = date.getDay();

    for (const habit of habits) {
      const frequencyDays = normalizeFrequencyDays(habit.frequency_days);
      const scheduled = frequencyDays.includes(weekday);

      if (!scheduled) continue;

      expected += 1;
      if (completionSet.has(`${habit.id}|${dateKey}`)) {
        completed += 1;
      }
    }
  }

  const percentage = expected === 0 ? 0 : Math.round((completed / expected) * 100);
  return { expected, completed, percentage };
}

export default function WeeklyChart({ habits, logs }: WeeklyChartProps) {
  const data = useMemo(() => {
    const completionSet = new Set(logs.map((log) => `${log.habit_id}|${log.completed_date}`));
    const thisWeekStart = getWeekStart(new Date());
    const lastWeekStart = addDays(thisWeekStart, -7);

    const lastWeek = getWeekStats(lastWeekStart, habits, completionSet);
    const thisWeek = getWeekStats(thisWeekStart, habits, completionSet);

    return [
      { label: "Last Week", percentage: lastWeek.percentage },
      { label: "This Week", percentage: thisWeek.percentage },
    ];
  }, [habits, logs]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Weekly Completion Comparison</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number | string | undefined) =>
                `${value ?? 0}%`
              }
            />
            <Bar dataKey="percentage" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
