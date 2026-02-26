import { redirect } from "next/navigation";

import HabitList from "@/components/HabitList";
import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitLog, HabitWithLogs } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, user_id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`);
  }

  const habits: Habit[] = habitRows ?? [];
  const habitIds = habits.map((habit) => habit.id);

  let logs: HabitLog[] = [];

  if (habitIds.length > 0) {
    const { data: logRows, error: logsError } = await supabase
      .from("habit_logs")
      .select("id, habit_id, completed_date, created_at")
      .in("habit_id", habitIds);

    if (logsError) {
      throw new Error(`Failed to load habit logs: ${logsError.message}`);
    }

    logs = logRows ?? [];
  }

  const logsByHabitId = new Map<string, HabitLog[]>();

  for (const log of logs) {
    const existingLogs = logsByHabitId.get(log.habit_id) ?? [];
    existingLogs.push(log);
    logsByHabitId.set(log.habit_id, existingLogs);
  }

  const habitsWithLogs: HabitWithLogs[] = habits.map((habit) => ({
    ...habit,
    logs: logsByHabitId.get(habit.id) ?? [],
  }));

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">HabitFlow Dashboard</h1>
          <p className="text-muted-foreground">
            Track your daily habits and keep your streak alive.
          </p>
        </div>

        <HabitList habits={habitsWithLogs} />
      </div>
    </main>
  );
}
