"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { createHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const pressedK = event.key.toLowerCase() === "k";
      if (!pressedK) return;

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleQuickAddHabit() {
    const habitName = query.trim();
    if (!habitName) return;

    setIsCreating(true);
    try {
      await createHabit({
        name: habitName,
        type: "boolean",
        goal_value: 1,
        unit: "times",
        frequency_days: [0, 1, 2, 3, 4, 5, 6],
        priority: 3,
      });

      toast.success(`Created habit: ${habitName}`);
      setQuery("");
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create habit.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  function goTo(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Command</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">
          {isMac ? "Cmd+K" : "Ctrl+K"}
        </kbd>
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Command shouldFilter value={query} onValueChange={setQuery} className="w-full">
              <Command.Input
                autoFocus
                placeholder="Type a command or search..."
                className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-2 py-4 text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Quick Actions" className="px-2 py-1 text-xs text-muted-foreground">
                  <Command.Item
                    value="go-dashboard"
                    onSelect={() => goTo("/dashboard")}
                    className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    Go to Dashboard
                  </Command.Item>
                  <Command.Item
                    value="go-analytics"
                    onSelect={() => goTo("/analytics")}
                    className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    Go to Analytics
                  </Command.Item>
                  <Command.Item
                    value="go-login"
                    onSelect={() => goTo("/login")}
                    className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    Go to Login
                  </Command.Item>
                </Command.Group>

                {query.trim() ? (
                  <>
                    <Command.Separator className="my-2 h-px bg-border" />
                    <Command.Group heading="Create" className="px-2 py-1 text-xs text-muted-foreground">
                      <Command.Item
                        value={`create-habit-${query}`}
                        onSelect={() => void handleQuickAddHabit()}
                        disabled={isCreating}
                        className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-accent data-[disabled=true]:opacity-50"
                      >
                        {isCreating ? "Creating..." : `Add habit "${query.trim()}"`}
                      </Command.Item>
                    </Command.Group>
                  </>
                ) : null}
              </Command.List>
            </Command>
          </div>
        </div>
      ) : null}
    </>
  );
}
