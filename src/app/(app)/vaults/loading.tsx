export default function VaultsLoading() {
  return (
    <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-5 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-muted animate-pulse rounded-sm" />
          <div className="h-3 w-72 bg-muted/60 animate-pulse rounded-sm" />
        </div>
        <div className="h-9 w-32 bg-muted animate-pulse rounded-sm" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="panel-elevated p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
                <div className="h-4 w-40 bg-muted animate-pulse rounded-sm" />
                <div className="h-3 w-24 bg-muted/60 animate-pulse rounded-sm" />
              </div>
              <div className="h-5 w-20 bg-muted animate-pulse rounded-sm" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-7 w-28 bg-muted animate-pulse rounded-sm" />
                <div className="h-3 w-16 bg-muted/60 animate-pulse rounded-sm" />
              </div>
              <div className="h-1 w-full bg-muted animate-pulse rounded-sm" />
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-muted/60 animate-pulse rounded-sm" />
                <div className="h-3 w-24 bg-muted/60 animate-pulse rounded-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-border">
              <div className="flex-1 h-9 bg-muted animate-pulse rounded-sm" />
              <div className="h-9 w-16 bg-muted animate-pulse rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
