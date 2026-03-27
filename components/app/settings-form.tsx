"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { updateUserPreferences } from "@/lib/actions/preferences-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ThemeMode = "SYSTEM" | "LIGHT" | "DARK";
type ViewMode = "WEEK" | "MONTH";

export function SettingsForm({
  projects,
  current
}: {
  projects: Array<{ id: string; name: string }>;
  current: {
    themePreference: ThemeMode;
    preferredView: ViewMode;
    defaultProjectId: string | null;
    exportFileNameTemplate: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const { setTheme } = useTheme();

  const [themePreference, setThemePreference] = useState<ThemeMode>(current.themePreference);
  const [preferredView, setPreferredView] = useState<ViewMode>(current.preferredView);
  const [defaultProjectId, setDefaultProjectId] = useState<string>(current.defaultProjectId ?? "");
  const [exportFileNameTemplate, setExportFileNameTemplate] = useState<string>(
    current.exportFileNameTemplate ?? "{project}-{from}-{to}"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Control theme and default landing behavior after login.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await updateUserPreferences({
                  themePreference,
                  preferredView,
                  defaultProjectId: defaultProjectId || null,
                  exportFileNameTemplate: exportFileNameTemplate.trim() || null
                });

                setTheme(themePreference.toLowerCase());
                toast.success("Settings saved");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to save settings");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="theme">Theme Mode</Label>
            <select
              id="theme"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value as ThemeMode)}
            >
              <option value="SYSTEM">System</option>
              <option value="LIGHT">Light</option>
              <option value="DARK">Dark</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-project">Default Project</Label>
            <select
              id="default-project"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
            >
              <option value="">None (open Projects list)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-view">Preferred Default View</Label>
            <select
              id="preferred-view"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={preferredView}
              onChange={(e) => setPreferredView(e.target.value as ViewMode)}
            >
              <option value="WEEK">Week View</option>
              <option value="MONTH">Month View</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-template">Export File Naming Template</Label>
            <input
              id="export-template"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={exportFileNameTemplate}
              onChange={(e) => setExportFileNameTemplate(e.target.value)}
              placeholder="{project}-{from}-{to}"
            />
            <p className="text-xs text-muted-foreground">
              Placeholders: {"{project}"}, {"{from}"}, {"{to}"}, {"{name}"}, {"{surname}"}, {"{fullName}"},{" "}
              {"{YYYY}"}, {"{MM}"}, {"{DD}"}, {"{fromYYYY}"}, {"{fromMM}"}, {"{fromDD}"}, {"{toYYYY}"},{" "}
              {"{toMM}"}, {"{toDD}"}
            </p>
          </div>

          <Button type="submit" disabled={pending}>
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
