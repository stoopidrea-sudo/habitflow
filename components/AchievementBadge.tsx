"use client";

import { BadgeCheck, CalendarCheck2, Footprints } from "lucide-react";

import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementKey,
} from "@/lib/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AchievementBadgeProps = {
  earnedBadgeKeys: AchievementKey[];
  newlyUnlockedKeys?: AchievementKey[];
  showLocked?: boolean;
};

function getIcon(key: AchievementKey) {
  if (key === "first_step") return <Footprints className="size-4" />;
  if (key === "thirty_day_club") return <BadgeCheck className="size-4" />;
  return <CalendarCheck2 className="size-4" />;
}

function BadgeCard({
  badge,
  earned,
  isNew,
}: {
  badge: AchievementDefinition;
  earned: boolean;
  isNew: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border p-3 transition-colors",
        earned ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-muted/20",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "rounded-md p-2",
            earned ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {getIcon(badge.key)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{badge.title}</p>
            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-xs",
                earned
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {earned ? (isNew ? "New" : "Earned") : "Locked"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function AchievementBadge({
  earnedBadgeKeys,
  newlyUnlockedKeys = [],
  showLocked = true,
}: AchievementBadgeProps) {
  const earned = new Set(earnedBadgeKeys);
  const newlyUnlocked = new Set(newlyUnlockedKeys);

  const visibleBadges = ACHIEVEMENTS.filter(
    (badge) => showLocked || earned.has(badge.key)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges unlocked yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleBadges.map((badge) => (
              <BadgeCard
                key={badge.key}
                badge={badge}
                earned={earned.has(badge.key)}
                isNew={newlyUnlocked.has(badge.key)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
