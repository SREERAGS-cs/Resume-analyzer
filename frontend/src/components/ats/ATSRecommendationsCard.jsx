import { Lightbulb, CheckCircle } from "lucide-react";

export default function ATSRecommendationsCard({ recommendations = [] }) {
    return (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-amber-500" />
                <h3 className="font-display text-base font-semibold text-ink">Actionable Recommendations</h3>
            </div>

            {recommendations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink/60">
                    No recommendations needed — your resume aligns with standard ATS rules.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {recommendations.map((rec, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 rounded-lg border border-line/60 bg-white p-3.5 shadow-2xs text-xs"
                        >
                            <div className="rounded-full bg-emerald-100 p-1 text-emerald-700 shrink-0 mt-0.5">
                                <CheckCircle size={14} />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-[10px] uppercase tracking-wider text-ink/50 block mb-0.5">
                                    {rec.category}
                                </span>
                                <p className="text-sm text-ink leading-relaxed font-medium">{rec.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
