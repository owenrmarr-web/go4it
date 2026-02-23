"use client";

interface StageData {
  stage: string;
  count: number;
  totalValue: number;
}

const stageColors: Record<string, string> = {
  INTERESTED: "bg-blue-500",
  QUOTED: "bg-orange-500",
  COMMITTED: "bg-purple-500",
  WON: "bg-green-500",
  LOST: "bg-red-500",
};

const stageLabels: Record<string, string> = {
  INTERESTED: "Interested",
  QUOTED: "Quoted",
  COMMITTED: "Committed",
  WON: "Won",
  LOST: "Lost",
};

export default function PipelineChart({ data }: { data: StageData[] }) {
  const maxValue = Math.max(...data.map((d) => d.totalValue), 1);

  if (data.every((d) => d.totalValue === 0 && d.count === 0)) {
    return (
      <p className="text-sm text-text-faint text-center py-8">
        No deal data yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = Math.max((item.totalValue / maxValue) * 100, 2);
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-24 shrink-0">
              {stageLabels[item.stage] || item.stage}
            </span>
            <div className="flex-1 bg-hover-bg rounded-full h-7 relative overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  stageColors[item.stage] || "bg-gray-400"
                } transition-all duration-500`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-sm font-medium text-text-secondary w-32 text-right shrink-0">
              ${item.totalValue.toLocaleString()}{" "}
              <span className="text-text-faint">({item.count})</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
