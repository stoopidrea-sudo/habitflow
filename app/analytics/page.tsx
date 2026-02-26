import { redirect } from "next/navigation";

import CalendarHistory from "@/components/CalendarHistory";
import HeatMap from "@/components/HeatMap";
import TrendLine from "@/components/TrendLine";
import WeeklyChart from "@/components/WeeklyChart";
import { createClient } from "@/lib/supabase/server";
import type { HabitLog } from "@/types/database";

type AnalyticsHabit = {
  id: string;
  name: string;
  frequency_days?: unknown;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, frequency_days")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits for analytics: ${habitsError.message}`);
  }

  const habits: AnalyticsHabit[] = habitRows ?? [];
  const habitIds = habits.map((habit) => habit.id);

  let logs: HabitLog[] = [];

  if (habitIds.length > 0) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 365);
    const fromDateKey = toDateKey(fromDate);

    const { data: logRows, error: logsError } = await supabase
      .from("habit_logs")
      .select("id, habit_id, completed_date, created_at")
      .in("habit_id", habitIds)
      .gte("completed_date", fromDateKey)
      .order("completed_date", { ascending: true });

    if (logsError) {
      throw new Error(`Failed to load habit logs for analytics: ${logsError.message}`);
    }

    logs = logRows ?? [];
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            See your completion patterns across weeks, months, and the full year.
          </p>
        </div>

        <HeatMap logs={logs} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyChart habits={habits} logs={logs} />
          <TrendLine habits={habits} logs={logs} />
        </div>

        <CalendarHistory habits={habits} logs={logs} />
      </div>
    </main>
  );
}
