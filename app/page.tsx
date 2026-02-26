import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">HabitFlow</h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg">
            Build better habits one day at a time. Track streaks, stay consistent,
            and make progress that lasts.
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
