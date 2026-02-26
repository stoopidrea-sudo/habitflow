"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type ConfettiProps = {
  milestoneReached?: boolean;
  completedAllToday?: boolean;
  triggerKey?: string | number;
  disabled?: boolean;
};

function shouldRespectReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function launchConfetti() {
  const defaults = {
    spread: 70,
    ticks: 200,
    gravity: 0.95,
    startVelocity: 40,
    scalar: 0.95,
  };

  confetti({
    ...defaults,
    particleCount: 90,
    origin: { x: 0.2, y: 0.8 },
  });
  confetti({
    ...defaults,
    particleCount: 90,
    origin: { x: 0.8, y: 0.8 },
  });
}

export default function Confetti({
  milestoneReached = false,
  completedAllToday = false,
  triggerKey,
  disabled = false,
}: ConfettiProps) {
  const lastFireSignatureRef = useRef<string>("");

  useEffect(() => {
    if (disabled || shouldRespectReducedMotion()) {
      return;
    }

    const milestone = Boolean(milestoneReached);
    const dailyWin = Boolean(completedAllToday);
    const hasCustomTrigger = typeof triggerKey !== "undefined";

    if (!milestone && !dailyWin && !hasCustomTrigger) {
      return;
    }

    const signature = `${milestone}-${dailyWin}-${String(triggerKey ?? "")}`;
    if (signature === lastFireSignatureRef.current) {
      return;
    }

    launchConfetti();
    lastFireSignatureRef.current = signature;
  }, [completedAllToday, disabled, milestoneReached, triggerKey]);

  return null;
}
