"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserMetadata = {
  full_name?: unknown;
  timezone?: unknown;
  [key: string]: unknown;
};

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function getTimezoneOptions() {
  const intlWithSupportedValues = Intl as Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
    try {
      const zones = intlWithSupportedValues.supportedValuesOf("timeZone");
      if (zones.length > 0) {
        return zones;
      }
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }

  return FALLBACK_TIMEZONES;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [metadata, setMetadata] = useState<UserMetadata>({});

  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("");

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");

  const [isTimezoneSaving, setIsTimezoneSaving] = useState(false);
  const [timezoneStatus, setTimezoneStatus] = useState("");
  const [timezoneError, setTimezoneError] = useState("");

  const [isJsonExporting, setIsJsonExporting] = useState(false);
  const [isCsvExporting, setIsCsvExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;
        const userMetadata = (user.user_metadata ?? {}) as UserMetadata;
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const savedTimezone =
          typeof userMetadata.timezone === "string" && userMetadata.timezone.trim().length > 0
            ? userMetadata.timezone
            : browserTimezone;

        setEmail(user.email ?? "");
        setMetadata(userMetadata);
        setFullName(typeof userMetadata.full_name === "string" ? userMetadata.full_name : "");
        setTimezone(savedTimezone);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileStatus("");
    setProfileError("");
    setIsProfileSaving(true);

    const nextMetadata: UserMetadata = {
      ...metadata,
      full_name: fullName.trim(),
    };

    const { error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    setIsProfileSaving(false);

    if (error) {
      setProfileError(error.message);
      return;
    }

    setMetadata(nextMetadata);
    setProfileStatus("Profile updated.");
  }

  async function handleSaveTimezone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimezoneStatus("");
    setTimezoneError("");

    const trimmedTimezone = timezone.trim();
    if (!trimmedTimezone) {
      setTimezoneError("Timezone is required.");
      return;
    }

    setIsTimezoneSaving(true);

    const nextMetadata: UserMetadata = {
      ...metadata,
      timezone: trimmedTimezone,
    };

    const { error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    setIsTimezoneSaving(false);

    if (error) {
      setTimezoneError(error.message);
      return;
    }

    setMetadata(nextMetadata);
    setTimezoneStatus("Timezone updated.");
  }

  async function handleExportJson() {
    setExportStatus("");
    setExportError("");
    setIsJsonExporting(true);

    try {
      await exportUserDataAsJson(supabase);
      setExportStatus("JSON export started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export JSON.";
      setExportError(message);
    } finally {
      setIsJsonExporting(false);
    }
  }

  async function handleExportCsv() {
    setExportStatus("");
    setExportError("");
    setIsCsvExporting(true);

    try {
      await exportUserDataAsCsv(supabase);
      setExportStatus("CSV export started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export CSV.";
      setExportError(message);
    } finally {
      setIsCsvExporting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground">Loading settings...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, timezone, and data export preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and review your account email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" value={email} disabled readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-full-name">Full name</Label>
                <Input
                  id="settings-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isProfileSaving}>
                  {isProfileSaving ? "Saving..." : "Save Profile"}
                </Button>
                {profileStatus ? <p className="text-sm text-muted-foreground">{profileStatus}</p> : null}
              </div>

              {profileError ? (
                <p className="text-sm text-destructive" role="alert">
                  {profileError}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>
              Choose the timezone used for date-based tracking and streak calculations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveTimezone}>
              <div className="space-y-2">
                <Label htmlFor="settings-timezone">Timezone</Label>
                <Input
                  id="settings-timezone"
                  list="timezone-options"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="America/New_York"
                />
                <datalist id="timezone-options">
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isTimezoneSaving}>
                  {isTimezoneSaving ? "Saving..." : "Save Timezone"}
                </Button>
                {timezoneStatus ? <p className="text-sm text-muted-foreground">{timezoneStatus}</p> : null}
              </div>

              {timezoneError ? (
                <p className="text-sm text-destructive" role="alert">
                  {timezoneError}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>
              Download all of your habit data and logs as JSON or CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleExportJson()} disabled={isJsonExporting || isCsvExporting}>
                {isJsonExporting ? "Preparing JSON..." : "Export JSON"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExportCsv()}
                disabled={isCsvExporting || isJsonExporting}
              >
                {isCsvExporting ? "Preparing CSV..." : "Export CSV"}
              </Button>
            </div>

            {exportStatus ? <p className="text-sm text-muted-foreground">{exportStatus}</p> : null}
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

