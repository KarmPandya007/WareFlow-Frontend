export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      
      <div className="p-6 border rounded-lg shadow bg-white space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border rounded-lg shadow bg-white space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border rounded-lg shadow bg-white space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
}
