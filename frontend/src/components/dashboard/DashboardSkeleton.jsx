export default function DashboardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="mb-8 h-16 w-2/3 rounded bg-ink/5" />
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-lg bg-ink/5" />)}
            </div>
            <div className="mb-8 h-32 rounded-lg bg-ink/5" />
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-64 rounded-lg bg-ink/5" />
                <div className="h-64 rounded-lg bg-ink/5" />
            </div>
        </div>
    );
}