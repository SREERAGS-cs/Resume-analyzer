import { Sparkles } from "lucide-react";

const PRIORITY_STYLES = {
    high: "bg-danger/10 text-danger",
    medium: "bg-signal/15 text-signal",
    low: "bg-ink/5 text-ink/50",
};

export default function RecommendationCard({ index, title, description, priority }) {
    return (
        <div className="flex gap-3 rounded-lg border border-line bg-white p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/15 text-signal">
                <Sparkles size={16} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{index}. {title}</p>
                    {priority && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
                            {priority}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-ink/60">{description}</p>
            </div>
        </div>
    );
}