"use client";

import { useState, useEffect } from "react";

export default function TimezoneLabel() {
  const [tz, setTz] = useState<string | null>(null);

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  if (!tz) return null;

  return (
    <span className="text-xs text-fg-dim">
      All times in {tz.replace(/_/g, " ")}
    </span>
  );
}
