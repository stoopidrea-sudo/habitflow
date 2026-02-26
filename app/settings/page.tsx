"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { exportUserDataAsCsv, exportUserDataAsJson } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  "UTC",
  "Asia/Manila",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  const [timezoneMessage, setTimezoneMessage] = useState("");
  const [timezoneError, setTimezoneError] = useState("");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;
        const metadataTimezone = user.user_metadata?.timezone;
        const selectedTimezone =
          typeof metadataTimezone === "string" && TIMEZONES.includes(metadataTimezone)
            ? metadataTimezone
            : "UTC";

        setEmail(user.email ?? "");
        setTimezone(selectedTimezone);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/login");
      });

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleSaveTimezone() {
    setTimezoneMessage("");
    setTimezoneError("");
    setIsSavingTimezone(true);

    const { error } = await supabase.auth.updateUser({
      data: { timezone },
    });

    setIsSavingTimezone(false);

    if (error) {
      setTimezoneError(error.message);
      return;
    }

    setTimezoneMessage("Timezone saved.");
  }

  async function handleExportJson() {
    setExportMessage("");
    setExportError("");
    setIsExportingJson(true);

    try {
      await exportUserDataAsJson(supabase);
      setExportMessage("JSON export started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export JSON.";
      setExportError(message);
    } finally {
      setIsExportingJson(false);
    }
  }

  async function handleExportCsv() {
    setExportMessage("");
    setExportError("");
    setIsExportingCsv(true);

    try {
      await exportUserDataAsCsv(supabase);
      setExportMessage("CSV export started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export CSV.";
      setExportError(message);
    } finally {
      setIsExportingCsv(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Loading settings...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account email.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{email || "No email found"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>Select your timezone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" onClick={() => void handleSaveTimezone()} disabled={isSavingTimezone}>
              {isSavingTimezone ? "Saving..." : "Save Timezone"}
            </Button>

            {timezoneMessage ? <p className="text-sm text-muted-foreground">{timezoneMessage}</p> : null}
            {timezoneError ? (
              <p className="text-sm text-destructive" role="alert">
                {timezoneError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Download your habit data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleExportJson()}
                disabled={isExportingJson || isExportingCsv}
              >
                {isExportingJson ? "Preparing JSON..." : "Export JSON"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExportCsv()}
                disabled={isExportingCsv || isExportingJson}
              >
                {isExportingCsv ? "Preparing CSV..." : "Export CSV"}
              </Button>
            </div>

            {exportMessage ? <p className="text-sm text-muted-foreground">{exportMessage}</p> : null}
            {exportError ? (
              <p className="text-sm text-destructive" role="alert">
                {exportError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

