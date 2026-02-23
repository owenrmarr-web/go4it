"use client";

interface RevenueChartProps {
  data: { month: string; revenue: number; expenses: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-purple-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-orange-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Expenses</span>
        </div>
      </div>

      <div className="flex items-end gap-2 h-48">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-1 h-40">
              <div
                className="w-5 bg-purple-500 rounded-t-sm transition-all"
                style={{ height: `${(item.revenue / maxValue) * 100}%`, minHeight: item.revenue > 0 ? "4px" : "0" }}
                title={`Revenue: $${item.revenue.toLocaleString()}`}
              />
              <div
                className="w-5 bg-orange-400 rounded-t-sm transition-all"
                style={{ height: `${(item.expenses / maxValue) * 100}%`, minHeight: item.expenses > 0 ? "4px" : "0" }}
                title={`Expenses: $${item.expenses.toLocaleString()}`}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
