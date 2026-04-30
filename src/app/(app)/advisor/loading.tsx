export default function AdvisorLoading() {
  return (
    <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-5 md:py-8 space-y-4">
      <div className="flex gap-1 border-b border-border pb-0">
        <div className="h-8 w-24 bg-muted animate-pulse rounded-sm" />
        <div className="h-8 w-20 bg-muted/50 animate-pulse rounded-sm" />
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="panel-elevated flex flex-col h-[70vh] min-h-[420px] md:h-[600px]">
          <div className="panel-header">
            <div className="h-3 w-48 bg-muted animate-pulse rounded-sm" />
            <div className="h-3 w-28 bg-muted/60 animate-pulse rounded-sm" />
          </div>
          <div className="flex-1 p-5 space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-3/4 bg-muted animate-pulse rounded-sm" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded-sm" />
              </div>
            </div>
          </div>
          <div className="border-t border-border p-3">
            <div className="h-9 w-full bg-muted animate-pulse rounded-sm" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <div className="h-3 w-20 bg-muted animate-pulse rounded-sm" />
            {[0, 1, 2].map(i => (
              <div key={i} className="h-9 w-full bg-muted/60 animate-pulse rounded-sm" />
            ))}
          </div>
          <div className="panel p-4 space-y-2">
            <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
            <div className="h-3 w-full bg-muted/60 animate-pulse rounded-sm" />
            <div className="h-3 w-2/3 bg-muted/60 animate-pulse rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
