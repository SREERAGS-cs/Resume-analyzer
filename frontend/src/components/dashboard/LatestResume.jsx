import { useNavigate } from "react-router-dom";
import { FileText, Upload, PenLine } from "lucide-react";

export default function LatestResume({ resume }) {
    const navigate = useNavigate();

    if (!resume) {
        return (
            <div className="rounded-lg border border-line bg-white p-6">
                <h3 className="mb-4 font-display text-base font-semibold text-ink">Latest Resume</h3>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText size={28} className="mb-2 text-ink/25" />
                    <p className="mb-4 text-sm text-ink/50">No resumes uploaded yet.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate("/upload-resume")}
                            className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                        >
                            <Upload size={15} /> Upload Resume
                        </button>
                        <button
                            onClick={() => navigate("/create-resume")}
                            className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                        >
                            <PenLine size={15} /> Create Resume
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const updatedLabel = new Date(resume.updated_at).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
    });

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            <h3 className="mb-4 font-display text-base font-semibold text-ink">Latest Resume</h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-ink">{resume.display_name}</p>
                        <p className="mt-0.5 text-xs text-ink/50">
                            {resume.file_type.toUpperCase()} · Updated {updatedLabel}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate("/resumes")}
                        className="flex-1 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors sm:flex-none"
                    >
                        View Resume
                    </button>
                    <button
                        onClick={() => navigate("/analysis")}
                        className="flex-1 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors sm:flex-none"
                    >
                        Analyze
                    </button>
                </div>
            </div>
        </div>
    );
}