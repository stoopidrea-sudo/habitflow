"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type HabitNoteProps = {
  habitId: string;
  logId?: string | null;
  completedDate?: string;
  initialNote?: string | null;
  disabled?: boolean;
  className?: string;
  onSaved?: (note: string) => void;
};

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HabitNote({
  habitId,
  logId,
  completedDate = getLocalDateKey(),
  initialNote = "",
  disabled = false,
  className,
  onSaved,
}: HabitNoteProps) {
  const supabase = useMemo(() => createClient(), []);
  const [note, setNote] = useState(initialNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function saveNote() {
    if (disabled || isSaving) return;

    const trimmedHabitId = habitId.trim();
    if (!trimmedHabitId) {
      setErrorMessage("Habit ID is required.");
      return;
    }

    const trimmedNote = note.trim();
    setSavedMessage("");
    setErrorMessage("");
    setIsSaving(true);

    if (logId) {
      const { error } = await supabase
        .from("habit_logs")
        .update({ note: trimmedNote || null })
        .eq("id", logId);

      setIsSaving(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSavedMessage("Note saved.");
      onSaved?.(trimmedNote);
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
        .update({ note: trimmedNote || null })
        .eq("id", existingLog.id);

      setIsSaving(false);

      if (updateError) {
        setErrorMessage(updateError.message);
        return;
      }

      setSavedMessage("Note saved.");
      onSaved?.(trimmedNote);
      return;
    }

    const { error: insertError } = await supabase.from("habit_logs").insert({
      habit_id: trimmedHabitId,
      completed_date: completedDate,
      note: trimmedNote || null,
    });

    setIsSaving(false);

    if (insertError) {
      setErrorMessage(insertError.message);
      return;
    }

    setSavedMessage("Note saved.");
    onSaved?.(trimmedNote);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">Journal note (optional)</p>
      <textarea
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          if (savedMessage) setSavedMessage("");
        }}
        placeholder="How did this habit feel today?"
        rows={3}
        disabled={disabled || isSaving}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void saveNote()} disabled={disabled || isSaving}>
          {isSaving ? "Saving..." : "Save Note"}
        </Button>
        {savedMessage ? <p className="text-xs text-muted-foreground">{savedMessage}</p> : null}
      </div>
      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

