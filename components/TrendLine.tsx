"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

type TrendLineProps = {
  habits: AnalyticsHabit[];
  logs: HabitLog[];
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toShortLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

export default function TrendLine({ habits, logs }: TrendLineProps) {
  const data = useMemo(() => {
    const completionSet = new Set(logs.map((log) => `${log.habit_id}|${log.completed_date}`));
    const today = new Date();
    const rows = [];

    for (let i = 29; i >= 0; i -= 1) {
      const date = addDays(today, -i);
      const dateKey = toDateKey(date);
      const weekday = date.getDay();

      let expected = 0;
      let completed = 0;

      for (const habit of habits) {
        const frequencyDays = normalizeFrequencyDays(habit.frequency_days);
        const scheduled = frequencyDays.includes(weekday);
        if (!scheduled) continue;

        expected += 1;
        if (completionSet.has(`${habit.id}|${dateKey}`)) {
          completed += 1;
        }
      }

      rows.push({
        date: toShortLabel(date),
        percentage: expected === 0 ? 0 : Math.round((completed / expected) * 100),
      });
    }

    return rows;
  }, [habits, logs]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>30-Day Consistency Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
