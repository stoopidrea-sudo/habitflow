"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getLevelFromXp } from "@/lib/xp";

type UserLevelProps = {
  totalXp?: number;
};

type UserMetadata = {
  total_xp?: unknown;
};

const XP_EVENT = "habitflow:xp-changed";

export default function UserLevel({ totalXp }: UserLevelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [fetchedXp, setFetchedXp] = useState(0);
  const [isLoading, setIsLoading] = useState(typeof totalXp !== "number");
  const resolvedXp = typeof totalXp === "number" ? totalXp : fetchedXp;

  useEffect(() => {
    if (typeof totalXp === "number") {
      return;
    }

    let active = true;

    const onXpChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ totalXp?: number }>;
      const nextXp = customEvent.detail?.totalXp;
      if (typeof nextXp === "number") {
        setFetchedXp(nextXp);
      }
    };

    window.addEventListener(XP_EVENT, onXpChanged as EventListener);

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;

        if (error || !data.user) {
          setIsLoading(false);
          return;
        }

        const metadata = (data.user.user_metadata ?? {}) as UserMetadata;
        const xpValue = Number(metadata.total_xp);
        setFetchedXp(Number.isFinite(xpValue) ? Math.max(0, Math.floor(xpValue)) : 0);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener(XP_EVENT, onXpChanged as EventListener);
    };
  }, [supabase, totalXp]);

  const levelInfo = getLevelFromXp(resolvedXp);

  if (isLoading) {
    return (
      <div className="w-36 rounded-md border px-3 py-2 text-xs text-muted-foreground">
        Loading XP...
      </div>
    );
  }

  return (
    <div className="w-44 rounded-md border bg-card px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-medium">
          <Sparkles className="size-3.5" />
          Level {levelInfo.level}
        </span>
        <span className="text-muted-foreground">{levelInfo.totalXp} XP</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${levelInfo.progressPercent}%` }}
        />
      </div>

      <p className="mt-1 text-[11px] text-muted-foreground">
        {levelInfo.xpToNextLevel} XP to level {levelInfo.level + 1}
      </p>
    </div>
  );
}
