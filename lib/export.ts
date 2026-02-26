import type { SupabaseClient } from "@supabase/supabase-js";

export type ExportLog = {
  id: string;
  habit_id: string;
  completed_date: string;
  created_at: string;
  mood_score: number | null;
  note: string | null;
};

export type ExportHabit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  type: string | null;
  goal_value: number | null;
  unit: string | null;
  frequency_days: number[] | null;
  priority: number | null;
  logs: ExportLog[];
};

export type UserHabitExport = {
  exported_at: string;
  user: {
    id: string;
    email: string | null;
  };
  habits: ExportHabit[];
};

function getDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function quoteCsv(value: string | number | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("File download is only available in the browser.");
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function fetchUserHabitData(supabase: SupabaseClient): Promise<UserHabitExport> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be logged in to export your data.");
  }

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to load habits: ${habitsError.message}`);
  }

  const habits = (habitRows ?? []) as Record<string, unknown>[];
  const habitIds = habits.map((habit) => String(habit.id));

  let logs: Record<string, unknown>[] = [];

  if (habitIds.length > 0) {
    const { data: logRows, error: logsError } = await supabase
      .from("habit_logs")
      .select("*")
      .in("habit_id", habitIds)
      .order("completed_date", { ascending: true });

    if (logsError) {
      throw new Error(`Failed to load habit logs: ${logsError.message}`);
    }

    logs = (logRows ?? []) as Record<string, unknown>[];
  }

  const logsByHabitId = new Map<string, ExportLog[]>();

  for (const rawLog of logs) {
    const habitId = String(rawLog.habit_id ?? "");
    if (!habitId) continue;

    const existing = logsByHabitId.get(habitId) ?? [];
    const moodScoreRaw = rawLog.mood_score;
    const moodScore = typeof moodScoreRaw === "number" ? moodScoreRaw : null;

    existing.push({
      id: String(rawLog.id ?? ""),
      habit_id: habitId,
      completed_date: String(rawLog.completed_date ?? ""),
      created_at: String(rawLog.created_at ?? ""),
      mood_score: moodScore,
      note: typeof rawLog.note === "string" ? rawLog.note : null,
    });

    logsByHabitId.set(habitId, existing);
  }

  const exportHabits: ExportHabit[] = habits.map((rawHabit) => {
    const habitId = String(rawHabit.id ?? "");
    const frequencyDaysRaw = rawHabit.frequency_days;
    const frequencyDays = Array.isArray(frequencyDaysRaw)
      ? frequencyDaysRaw
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : null;

    return {
      id: habitId,
      user_id: String(rawHabit.user_id ?? user.id),
      name: String(rawHabit.name ?? ""),
      created_at: String(rawHabit.created_at ?? ""),
      type: typeof rawHabit.type === "string" ? rawHabit.type : null,
      goal_value: Number.isFinite(Number(rawHabit.goal_value))
        ? Number(rawHabit.goal_value)
        : null,
      unit: typeof rawHabit.unit === "string" ? rawHabit.unit : null,
      frequency_days: frequencyDays,
      priority: Number.isFinite(Number(rawHabit.priority)) ? Number(rawHabit.priority) : null,
      logs: logsByHabitId.get(habitId) ?? [],
    };
  });

  return {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    habits: exportHabits,
  };
}

function toCsv(exportData: UserHabitExport) {
  const header = [
    "habit_id",
    "habit_name",
    "habit_created_at",
    "habit_type",
    "habit_goal_value",
    "habit_unit",
    "habit_frequency_days",
    "habit_priority",
    "log_id",
    "completed_date",
    "log_created_at",
    "mood_score",
    "note",
  ];

  const rows: string[] = [header.join(",")];

  for (const habit of exportData.habits) {
    const baseColumns = [
      quoteCsv(habit.id),
      quoteCsv(habit.name),
      quoteCsv(habit.created_at),
      quoteCsv(habit.type),
      quoteCsv(habit.goal_value),
      quoteCsv(habit.unit),
      quoteCsv(habit.frequency_days ? JSON.stringify(habit.frequency_days) : ""),
      quoteCsv(habit.priority),
    ];

    if (habit.logs.length === 0) {
      rows.push([...baseColumns, "", "", "", "", ""].join(","));
      continue;
    }

    for (const log of habit.logs) {
      rows.push(
        [
          ...baseColumns,
          quoteCsv(log.id),
          quoteCsv(log.completed_date),
          quoteCsv(log.created_at),
          quoteCsv(log.mood_score),
          quoteCsv(log.note),
        ].join(",")
      );
    }
  }

  return rows.join("\n");
}

export async function exportUserDataAsJson(supabase: SupabaseClient) {
  const exportData = await fetchUserHabitData(supabase);
  const fileName = `habitflow-export-${getDateStamp()}.json`;

  downloadTextFile(fileName, JSON.stringify(exportData, null, 2), "application/json;charset=utf-8");
  return exportData;
}

export async function exportUserDataAsCsv(supabase: SupabaseClient) {
  const exportData = await fetchUserHabitData(supabase);
  const csv = toCsv(exportData);
  const fileName = `habitflow-export-${getDateStamp()}.csv`;

  downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
  return csv;
}

