import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function ATSIssuesCard({ issues = [] }) {
    const getSeverityIcon = (severity) => {
        switch (severity?.toLowerCase()) {
            case "high":
                return <AlertCircle size={16} className="text-rose-600 shrink-0" />;
            case "medium":
                return <AlertTriangle size={16} className="text-amber-600 shrink-0" />;
            default:
                return <Info size={16} className="text-blue-600 shrink-0" />;
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity?.toLowerCase()) {
            case "high":
                return "bg-rose-100 text-rose-800 border-rose-200";
            case "medium":
                return "bg-amber-100 text-amber-800 border-amber-200";
            default:
                return "bg-blue-100 text-blue-800 border-blue-200";
        }
    };

    return (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                <h3 className="font-display text-base font-semibold text-ink">ATS Diagnostic Issues</h3>
            </div>

            {issues.length === 0 ? (
                <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-center text-sm font-medium text-emerald-800">
                    🎉 Excellent! No ATS issues or formatting risks detected.
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {issues.map((issue, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 rounded-lg border border-line/80 bg-paper/30 p-3 text-xs"
                        >
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold border uppercase tracking-wider ${getSeverityBadge(issue.severity)}`}>
                                        {issue.severity || "info"}
                                    </span>
                                    <span className="font-medium text-ink/60 uppercase text-[10px] tracking-wider">
                                        {issue.type}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-ink">{issue.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
