import { Tag, Sparkles } from "lucide-react";

export default function ATSKeywordsCard({ keywords = [] }) {
    return (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Tag size={18} className="text-signal" />
                <h3 className="font-display text-base font-semibold text-ink">Detected Technical Keywords</h3>
            </div>

            {keywords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink/60">
                    No technical keywords detected yet.
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line/80 bg-paper/50 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-signal/40"
                        >
                            <Sparkles size={12} className="text-signal" />
                            {kw}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
