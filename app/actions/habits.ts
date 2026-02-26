"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Habit } from "@/types/database";

export type HabitType = "boolean" | "numeric" | "timer";

export type HabitMutationInput = {
  name?: string;
  type?: HabitType;
  goal_value?: number;
  unit?: string | null;
  frequency_days?: number[];
  priority?: number;
};

const DEFAULT_HABIT_TYPE: HabitType = "boolean";
const DEFAULT_PRIORITY = 3;
const DEFAULT_FREQUENCY_DAYS = [0, 1, 2, 3, 4, 5, 6];

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

function normalizeHabitType(value: unknown): HabitType {
  if (value === "numeric" || value === "timer" || value === "boolean") {
    return value;
  }
  return DEFAULT_HABIT_TYPE;
}

function normalizeGoalValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.round(parsed * 100) / 100;
}

function normalizeUnit(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizePriority(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRIORITY;
  }
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeFrequencyDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_FREQUENCY_DAYS];
  }

  const parsedDays = Array.from(
    new Set(
      value
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  ).sort((a, b) => a - b);

  return parsedDays.length > 0 ? parsedDays : [...DEFAULT_FREQUENCY_DAYS];
}

function normalizeCreateInput(input: HabitMutationInput) {
  const name = (input.name ?? "").trim();

  if (!name) {
    throw new Error("Habit name is required.");
  }

  return {
    name,
    type: normalizeHabitType(input.type),
    goal_value: normalizeGoalValue(input.goal_value),
    unit: normalizeUnit(input.unit),
    frequency_days: normalizeFrequencyDays(input.frequency_days),
    priority: normalizePriority(input.priority),
  };
}

function normalizeUpdateInput(input: HabitMutationInput) {
  const payload: Record<string, unknown> = {};

  if (typeof input.name !== "undefined") {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Habit name cannot be empty.");
    }
    payload.name = name;
  }

  if (typeof input.type !== "undefined") {
    payload.type = normalizeHabitType(input.type);
  }

  if (typeof input.goal_value !== "undefined") {
    payload.goal_value = normalizeGoalValue(input.goal_value);
  }

  if (typeof input.unit !== "undefined") {
    payload.unit = normalizeUnit(input.unit);
  }

  if (typeof input.frequency_days !== "undefined") {
    payload.frequency_days = normalizeFrequencyDays(input.frequency_days);
  }

  if (typeof input.priority !== "undefined") {
    payload.priority = normalizePriority(input.priority);
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No habit fields provided to update.");
  }

  return payload;
}

export async function createHabit(input: HabitMutationInput): Promise<Habit> {
  const payload = normalizeCreateInput(input);

  const { supabase, userId } = await getSupabaseAndUser();

  const insertPayload = {
    user_id: userId,
    name: payload.name,
    type: payload.type,
    goal_value: payload.goal_value,
    unit: payload.unit,
    frequency_days: payload.frequency_days,
    priority: payload.priority,
  };

  const { data, error } = await supabase
    .from("habits")
    .insert(insertPayload)
    .select("id, user_id, name, created_at, type, goal_value, unit, frequency_days, priority")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data as Habit;
}

export async function updateHabit(
  habitId: string,
  input: HabitMutationInput
): Promise<Habit> {
  const trimmedHabitId = habitId.trim();

  if (!trimmedHabitId) {
    throw new Error("Habit ID is required.");
  }

  const { supabase, userId } = await getSupabaseAndUser();
  const payload = normalizeUpdateInput(input);

  const { data, error } = await supabase
    .from("habits")
    .update(payload)
    .eq("id", trimmedHabitId)
    .eq("user_id", userId)
    .select("id, user_id, name, created_at, type, goal_value, unit, frequency_days, priority")
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
