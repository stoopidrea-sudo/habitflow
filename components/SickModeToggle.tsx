"use client";

import { useEffect, useState } from "react";
import { BriefcaseMedical, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type UserMetadata = {
  sick_mode_enabled?: unknown;
};

const SICK_MODE_EVENT = "habitflow:sick-mode-changed";

export default function SickModeToggle() {
  const supabase = createClient();

  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;

        if (error || !data.user) {
          setIsLoading(false);
          return;
        }

        const metadata = (data.user.user_metadata ?? {}) as UserMetadata;
        const nextEnabled = Boolean(metadata.sick_mode_enabled);
        setEnabled(nextEnabled);
        window.dispatchEvent(
          new CustomEvent(SICK_MODE_EVENT, { detail: { enabled: nextEnabled } })
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  async function toggleSickMode() {
    setErrorMessage("");
    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setErrorMessage("You must be logged in to use Sick Mode.");
      return;
    }

    const nextEnabled = !enabled;
    const metadata = (user.user_metadata ?? {}) as UserMetadata;

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        sick_mode_enabled: nextEnabled,
      },
    });

    setIsSaving(false);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    setEnabled(nextEnabled);
    window.dispatchEvent(
      new CustomEvent(SICK_MODE_EVENT, { detail: { enabled: nextEnabled } })
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant={enabled ? "secondary" : "outline"}
        onClick={toggleSickMode}
        disabled={isLoading || isSaving}
        aria-label="Toggle Sick Mode"
      >
        {isLoading || isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BriefcaseMedical className="size-4" />
        )}
        {enabled ? "Sick Mode On" : "Sick Mode Off"}
      </Button>
      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
