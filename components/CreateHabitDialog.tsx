"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createHabit, type HabitType } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WEEK_DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function CreateHabitDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [habitType, setHabitType] = useState<HabitType>("boolean");
  const [goalValue, setGoalValue] = useState("1");
  const [unit, setUnit] = useState("");
  const [priority, setPriority] = useState("3");
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function toggleFrequencyDay(day: number) {
    setFrequencyDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  function getUnitPlaceholder(type: HabitType) {
    if (type === "numeric") return "ml";
    if (type === "timer") return "minutes";
    return "times";
  }

  function getGoalLabel(type: HabitType) {
    if (type === "numeric") return "Daily goal value";
    if (type === "timer") return "Timer duration";
    return "Daily completions";
  }

  function resetForm() {
    setName("");
    setHabitType("boolean");
    setGoalValue("1");
    setUnit("");
    setPriority("3");
    setFrequencyDays([0, 1, 2, 3, 4, 5, 6]);
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const habitName = name.trim();
    if (!habitName) {
      setErrorMessage("Habit name is required.");
      return;
    }

    const parsedGoalValue = Number(goalValue);
    if (!Number.isFinite(parsedGoalValue) || parsedGoalValue <= 0) {
      setErrorMessage("Goal value must be greater than 0.");
      return;
    }

    if (frequencyDays.length === 0) {
      setErrorMessage("Select at least one day for this habit.");
      return;
    }

    const parsedPriority = Number(priority);
    if (!Number.isFinite(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
      setErrorMessage("Priority must be a number between 1 and 5.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createHabit({
        name: habitName,
        type: habitType,
        goal_value: parsedGoalValue,
        unit: unit.trim(),
        frequency_days: frequencyDays,
        priority: parsedPriority,
      });

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create habit.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Add Habit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a New Habit</DialogTitle>
          <DialogDescription>
            Set your habit type, target, and weekly schedule.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="habit-name">Habit name</Label>
            <Input
              id="habit-name"
              placeholder="Drink 2L of water"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="habit-type">Habit type</Label>
              <select
                id="habit-type"
                value={habitType}
                onChange={(event) => setHabitType(event.target.value as HabitType)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="boolean">Boolean (done / not done)</option>
                <option value="numeric">Numeric (track quantity)</option>
                <option value="timer">Timer (countdown)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="habit-priority">Priority (1-5)</Label>
              <Input
                id="habit-priority"
                type="number"
                min={1}
                max={5}
                step={1}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-value">{getGoalLabel(habitType)}</Label>
              <Input
                id="goal-value"
                type="number"
                min={1}
                step={habitType === "numeric" ? "0.1" : "1"}
                value={goalValue}
                onChange={(event) => setGoalValue(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-unit">Unit</Label>
              <Input
                id="goal-unit"
                placeholder={getUnitPlaceholder(habitType)}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Repeat on</Label>
            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => {
                const selected = frequencyDays.includes(day.value);
                return (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFrequencyDay(day.value)}
                    className="w-full"
                  >
                    {day.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
