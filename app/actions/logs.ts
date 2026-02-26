"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function toggleHabitLog(
  habitId: string
): Promise<{ completed: boolean; date: string }> {
  const trimmedHabitId = habitId.trim();

  if (!trimmedHabitId) {
    throw new Error("Habit ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", trimmedHabitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (habitError) {
    throw new Error(habitError.message);
  }

  if (!habit) {
    throw new Error("Habit not found.");
  }

  const today = getTodayDateKey();

  const { data: existingLog, error: existingLogError } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", trimmedHabitId)
    .eq("completed_date", today)
    .maybeSingle();

  if (existingLogError) {
    throw new Error(existingLogError.message);
  }

  if (existingLog) {
    const { error: deleteError } = await supabase
      .from("habit_logs")
      .delete()
      .eq("id", existingLog.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath("/dashboard");
    return { completed: false, date: today };
  }

  const { error: insertError } = await supabase.from("habit_logs").insert({
    habit_id: trimmedHabitId,
    completed_date: today,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/dashboard");
  return { completed: true, date: today };
}
