interface AgingTableProps {
  buckets: { label: string; count: number; total: number }[];
}

export default function AgingTable({ buckets }: AgingTableProps) {
  const grandTotal = buckets.reduce((sum, b) => sum + b.total, 0);
  const grandCount = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">Aging Bucket</th>
            <th className="text-right py-3 font-medium text-gray-500 dark:text-gray-400">Invoices</th>
            <th className="text-right py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.label} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3 text-gray-700 dark:text-gray-300">{bucket.label}</td>
              <td className="py-3 text-gray-700 dark:text-gray-300 text-right">{bucket.count}</td>
              <td className="py-3 text-gray-700 dark:text-gray-300 text-right font-medium">${bucket.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 dark:border-gray-700">
            <td className="py-3 font-bold text-gray-900 dark:text-gray-100">Total</td>
            <td className="py-3 font-bold text-gray-900 dark:text-gray-100 text-right">{grandCount}</td>
            <td className="py-3 font-bold text-gray-900 dark:text-gray-100 text-right">${grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
