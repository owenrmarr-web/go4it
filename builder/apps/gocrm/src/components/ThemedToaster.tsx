"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export default function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" theme={theme} />;
}
