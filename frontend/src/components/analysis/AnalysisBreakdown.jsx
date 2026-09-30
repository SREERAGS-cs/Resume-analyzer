export default function AnalysisBreakdown({ sections }) {
    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-ink">Analysis Breakdown</h2>
            <div className="flex flex-col gap-4">
                {sections.map((s) => (
                    <div key={s.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-ink">{s.name}</span>
                            <span className="text-ink/50">{s.score}/{s.maxScore}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-ink" style={{ width: `${(s.score / s.maxScore) * 100}%` }} />
                        </div>
                        {s.description && <p className="mt-1.5 text-xs text-ink/60">{s.description}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}