"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function BarChart({
  data,
  color = "#9333ea",
  height = 200,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="w-full">
      {/* Hover tooltip area */}
      <div className="h-5 mb-1 text-center text-xs text-fg-muted">
        {hovered !== null && (
          <span>
            <span className="font-medium text-fg-secondary">{data[hovered].label}</span>
            {" — "}
            {data[hovered].value} appointment{data[hovered].value !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div
        className="flex items-end gap-[2px]"
        style={{ height: `${height}px` }}
      >
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  opacity: hovered === null || hovered === i ? 1 : 0.4,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
