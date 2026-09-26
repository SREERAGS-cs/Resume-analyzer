export default function AnalysisLoadingState() {
    return (
        <div className="rounded-lg border border-line bg-white p-8 text-center">
            <p className="mb-4 text-sm font-medium text-ink">Analyzing your resume…</p>
            <div className="mx-auto flex max-w-md flex-col gap-3">
                {[100, 85, 70].map((w, i) => (
                    <div key={i} className="h-3 animate-pulse rounded-full bg-line" style={{ width: `${w}%` }} />
                ))}
            </div>
        </div>
    );
}