"use client";

import CreateHabitDialog from "@/components/CreateHabitDialog";
import HabitCard from "@/components/HabitCard";
import { Card, CardContent } from "@/components/ui/card";
import type { HabitWithLogs } from "@/types/database";

type HabitListProps = {
  habits: HabitWithLogs[];
};

export default function HabitList({ habits }: HabitListProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your Habits</h2>
        <CreateHabitDialog />
      </div>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              You do not have any habits yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}
    </section>
  );
}
