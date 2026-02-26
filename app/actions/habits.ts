"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Habit } from "@/types/database";

async function getSupabaseAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  return { supabase, userId: user.id };
}

export async function createHabit(name: string): Promise<Habit> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Habit name is required.");
  }

  const { supabase, userId } = await getSupabaseAndUser();

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name: trimmedName,
    })
    .select("id, user_id, name, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data as Habit;
}

export async function updateHabit(habitId: string, name: string): Promise<Habit> {
  const trimmedHabitId = habitId.trim();
  const trimmedName = name.trim();

  if (!trimmedHabitId) {
    throw new Error("Habit ID is required.");
  }

  if (!trimmedName) {
    throw new Error("Habit name is required.");
  }

  const { supabase, userId } = await getSupabaseAndUser();

  const { data, error } = await supabase
    .from("habits")
    .update({ name: trimmedName })
    .eq("id", trimmedHabitId)
    .eq("user_id", userId)
    .select("id, user_id, name, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data as Habit;
}

export async function deleteHabit(habitId: string): Promise<{ success: true }> {
  const trimmedHabitId = habitId.trim();

  if (!trimmedHabitId) {
    throw new Error("Habit ID is required.");
  }

  const { supabase, userId } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", trimmedHabitId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return { success: true };
}
