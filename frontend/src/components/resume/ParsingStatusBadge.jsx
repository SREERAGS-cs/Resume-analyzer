import { Clock, Loader2, AlertTriangle, CheckCircle2, Search } from "lucide-react";

const STATUS_CONFIG = {
    not_started: { label: "Not Analyzed", icon: Clock, className: "bg-ink/5 text-ink/50" },
    processing: { label: "Analyzing…", icon: Loader2, className: "bg-signal/15 text-signal", spin: true },
    needs_review: { label: "Review Required", icon: Search, className: "bg-signal/15 text-signal" },
    verified: { label: "Verified", icon: CheckCircle2, className: "bg-success/15 text-success" },
    failed: { label: "Analysis Failed", icon: AlertTriangle, className: "bg-danger/15 text-danger" },
};

export default function ParsingStatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
            <Icon size={12} className={config.spin ? "animate-spin" : ""} />
            {config.label}
        </span>
    );
}