"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemePreferenceSync({
  preference
}: {
  preference: "system" | "light" | "dark";
}) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== preference) {
      setTheme(preference);
    }
  }, [preference, setTheme, theme]);

  return null;
}
