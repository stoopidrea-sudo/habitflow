"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MoodRatingProps = {
  habitId: string;
  logId?: string | null;
  completedDate?: string;
  initialMoodScore?: number | null;
  disabled?: boolean;
  className?: string;
  onSaved?: (score: number) => void;
};

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MoodRating({
  habitId,
  logId,
  completedDate = getLocalDateKey(),
  initialMoodScore = null,
  disabled = false,
  className,
  onSaved,
}: MoodRatingProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selected, setSelected] = useState<number>(initialMoodScore ?? 0);
  const [hovered, setHovered] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function saveMoodScore(score: number) {
    if (disabled || isSaving) return;

    const trimmedHabitId = habitId.trim();
    if (!trimmedHabitId) {
      setErrorMessage("Habit ID is required.");
      return;
    }

    if (score < 1 || score > 5) {
      setErrorMessage("Mood score must be between 1 and 5.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    if (logId) {
      const { error } = await supabase
        .from("habit_logs")
        .update({ mood_score: score })
        .eq("id", logId);

      setIsSaving(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSelected(score);
      onSaved?.(score);
      return;
    }

    const { data: existingLog, error: findError } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", trimmedHabitId)
      .eq("completed_date", completedDate)
      .maybeSingle();

    if (findError) {
      setIsSaving(false);
      setErrorMessage(findError.message);
      return;
    }

    if (existingLog) {
      const { error: updateError } = await supabase
        .from("habit_logs")
        .update({ mood_score: score })
        .eq("id", existingLog.id);

      setIsSaving(false);

      if (updateError) {
        setErrorMessage(updateError.message);
        return;
      }

      setSelected(score);
      onSaved?.(score);
      return;
    }

    const { error: insertError } = await supabase.from("habit_logs").insert({
      habit_id: trimmedHabitId,
      completed_date: completedDate,
      mood_score: score,
    });

    setIsSaving(false);

    if (insertError) {
      setErrorMessage(insertError.message);
      return;
    }

    setSelected(score);
    onSaved?.(score);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">Mood (1-5 stars)</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = score <= (hovered || selected);
          return (
            <button
              key={score}
              type="button"
              aria-label={`Set mood to ${score} out of 5`}
              onMouseEnter={() => setHovered(score)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => void saveMoodScore(score)}
              disabled={disabled || isSaving}
              className="rounded p-1 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Star
                className={cn(
                  "size-5",
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          );
        })}
      </div>
      {isSaving ? <p className="text-xs text-muted-foreground">Saving mood...</p> : null}
      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

