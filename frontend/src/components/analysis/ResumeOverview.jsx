import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function ResumeOverview({ resumeName, lastAnalyzed, sectionsDetected }) {
    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">Resume Overview</h2>
            <p className="text-sm text-ink"><span className="text-ink/50">Resume:</span> {resumeName}</p>
            <p className="mt-0.5 text-sm text-ink"><span className="text-ink/50">Last analyzed:</span> {lastAnalyzed}</p>

            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-ink/50">Sections detected</p>
            <ul className="flex flex-col gap-1.5">
                {sectionsDetected.map((s) => (
                    <li key={s.name} className="flex items-center gap-2 text-sm">
                        {s.detected
                            ? <CheckCircle2 size={15} className="shrink-0 text-success" />
                            : <AlertTriangle size={15} className="shrink-0 text-signal" />}
                        <span className={s.detected ? "text-ink" : "text-ink/60"}>{s.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}