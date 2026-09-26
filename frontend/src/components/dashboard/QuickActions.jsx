import { useNavigate } from "react-router-dom";
import { Upload, PenLine, ScanSearch, Target, Briefcase } from "lucide-react";

const actions = [
    { label: "Upload Resume", icon: Upload, to: "/upload-resume" },
    { label: "Create Resume", icon: PenLine, to: "/choose-template" },
    { label: "Analyze Resume", icon: ScanSearch, to: "/resume-analysis" },
    { label: "Check ATS Score", icon: Target, to: "/ats-score" },
    { label: "Match Job", icon: Briefcase, to: "/job-matching" },
];

export default function QuickActions() {
    const navigate = useNavigate();

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            <h3 className="mb-4 font-display text-base font-semibold text-ink">Quick Actions</h3>
            <div className="flex flex-wrap gap-2.5">
                {actions.map(({ label, icon: Icon, to }) => (
                    <button
                        key={label}
                        onClick={() => navigate(to)}
                        className="flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink
              hover:border-signal/50 hover:text-signal transition-colors"
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}