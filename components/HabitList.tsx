"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import CreateHabitDialog from "@/components/CreateHabitDialog";
import HabitCard from "@/components/HabitCard";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import type { HabitWithLogs } from "@/types/database";

type HabitListProps = {
  habits: HabitWithLogs[];
};

type UserMetadata = {
  habit_order?: unknown;
};

type SortableHabitItemProps = {
  habit: HabitWithLogs;
};

function SortableHabitItem({ habit }: SortableHabitItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "z-20 opacity-80" : ""}
    >
      <div className="relative">
        <button
          type="button"
          className="absolute top-2 right-2 z-10 rounded-md border bg-background/90 p-1 text-muted-foreground"
          aria-label="Drag habit"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <HabitCard habit={habit} />
      </div>
    </div>
  );
}

export default function HabitList({ habits }: HabitListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [savedOrderIds, setSavedOrderIds] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active || error || !data.user) return;

        const metadata = (data.user.user_metadata ?? {}) as UserMetadata;
        if (!Array.isArray(metadata.habit_order)) return;

        const ids = metadata.habit_order
          .map((value) => String(value))
          .filter((value) => value.length > 0);

        if (ids.length > 0) {
          setSavedOrderIds(ids);
        }
      })
      .catch(() => {
        // Ignore order-loading errors; UI will fallback to default order.
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  const orderedHabits = useMemo(() => {
    if (!savedOrderIds) return habits;

    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const ordered = savedOrderIds
      .map((habitId) => byId.get(habitId))
      .filter((habit): habit is HabitWithLogs => Boolean(habit));

    const seen = new Set(ordered.map((habit) => habit.id));
    const remaining = habits.filter((habit) => !seen.has(habit.id));

    return [...ordered, ...remaining];
  }, [habits, savedOrderIds]);

  const persistOrder = useCallback(
    async (nextOrderIds: string[]) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Could not save order. Please try again.");
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          habit_order: nextOrderIds,
        },
      });

      if (updateError) {
        setErrorMessage(updateError.message);
      }
    },
    [supabase]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const oldIndex = orderedHabits.findIndex((habit) => habit.id === activeId);
      const newIndex = orderedHabits.findIndex((habit) => habit.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(orderedHabits, oldIndex, newIndex);
      const nextOrderIds = reordered.map((habit) => habit.id);

      setErrorMessage("");
      setSavedOrderIds(nextOrderIds);
      void persistOrder(nextOrderIds);
    },
    [orderedHabits, persistOrder]
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your Habits</h2>
        <CreateHabitDialog />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {orderedHabits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              You do not have any habits yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedHabits.map((habit) => habit.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedHabits.map((habit) => (
                <SortableHabitItem key={habit.id} habit={habit} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
