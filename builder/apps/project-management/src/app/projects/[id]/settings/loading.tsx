export default function SettingsLoading() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-6 w-40 bg-gray-200 rounded mb-1" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-8 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-9 bg-gray-200 rounded-md" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
              <div className="h-7 w-20 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
