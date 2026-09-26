export default function ScoreCard({ label, score }) {
    return (
        <div className="rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{score}<span className="text-sm font-normal text-ink/40">/100</span></p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-signal" style={{ width: `${score}%` }} />
            </div>
        </div>
    );
}