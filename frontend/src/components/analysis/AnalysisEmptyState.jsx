import { useNavigate } from "react-router-dom";
import { FileSearch } from "lucide-react";

export default function AnalysisEmptyState() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 py-16 text-center">
            <FileSearch size={32} className="mb-3 text-ink/30" />
            <h3 className="font-display text-lg font-semibold text-ink">No resume available for analysis</h3>
            <p className="mt-1.5 max-w-sm text-sm text-ink/60">
                Create or upload a resume to receive detailed analysis, ATS insights, and personalized recommendations.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate("/choose-template")} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90">
                    Create Resume
                </button>
                <button onClick={() => navigate("/upload-resume")} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5">
                    Upload Resume
                </button>
            </div>
        </div>
    );
}