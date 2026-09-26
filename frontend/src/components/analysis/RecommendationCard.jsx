import { Sparkles } from "lucide-react";

export default function RecommendationCard({ index, title, description }) {
    return (
        <div className="flex gap-3 rounded-lg border border-line bg-white p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/15 text-signal">
                <Sparkles size={16} />
            </div>
            <div>
                <p className="text-sm font-medium text-ink">{index}. {title}</p>
                <p className="mt-1 text-sm text-ink/60">{description}</p>
            </div>
        </div>
    );
}