import { CheckCircle2, Clock } from "lucide-react";

function timeAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function RecentActivity({ activity }) {
    const hasActivity = activity && activity.length > 0;

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            <h3 className="mb-4 font-display text-base font-semibold text-ink">Recent Activity</h3>

            {hasActivity ? (
                <ul className="flex flex-col gap-4">
                    {activity.map((item) => (
                        <li key={item.id} className="flex items-start gap-3">
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                            <div>
                                <p className="text-sm text-ink">
                                    {item.label}{item.detail ? ` — ${item.detail}` : ""}
                                </p>
                                <p className="text-xs text-ink/50">{timeAgo(item.created_at)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Clock size={26} className="mb-2 text-ink/25" />
                    <p className="text-sm text-ink/50">No recent activity.</p>
                </div>
            )}
        </div>
    );
}