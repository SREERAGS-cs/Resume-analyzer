import { History, Calendar, ChevronRight } from "lucide-react";

export default function ATSHistoryCard({ history = [], activeAnalysisId, onSelectAnalysis }) {
    if (!history || history.length === 0) {
        return (
            <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <History size={18} className="text-ink/60" />
                    <h3 className="font-display text-base font-semibold text-ink">Analysis History</h3>
                </div>
                <p className="text-xs text-ink/60">No previous ATS analyses recorded.</p>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <History size={18} className="text-ink/70" />
                    <h3 className="font-display text-base font-semibold text-ink">Analysis History</h3>
                </div>
                <span className="text-xs text-ink/50">{history.length} Runs</span>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => {
                    const isActive = String(item.id) === String(activeAnalysisId);
                    let scoreBadge = "bg-emerald-100 text-emerald-800";
                    if (item.ats_score < 60) scoreBadge = "bg-rose-100 text-rose-800";
                    else if (item.ats_score < 75) scoreBadge = "bg-amber-100 text-amber-800";

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectAnalysis && onSelectAnalysis(item.id)}
                            className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all text-xs ${
                                isActive
                                    ? "border-signal bg-signal/5 shadow-2xs"
                                    : "border-line/70 bg-white hover:border-line hover:bg-paper/30"
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <Calendar size={14} className="text-ink/40 shrink-0" />
                                <div>
                                    <div className="font-medium text-ink">{formatDate(item.created_at)}</div>
                                    <div className="text-[10px] text-ink/50 mt-0.5">
                                        {item.target_role ? `${item.target_role} • Run #${item.id}` : `Run #${item.id}`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`rounded-md px-2 py-0.5 font-bold ${scoreBadge}`}>
                                    {item.ats_score} / 100
                                </span>
                                <ChevronRight size={14} className="text-ink/40" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
