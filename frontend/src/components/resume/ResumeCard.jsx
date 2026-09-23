import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Download, Pencil, Trash2, ScanSearch, MoreVertical, Loader2 } from "lucide-react";
import { formatFileSize } from "../../utils/fileValidation";
import ParsingStatusBadge from "./ParsingStatusBadge";
import { parseResume } from "../../services/resumeService";

export default function ResumeCard({ resume, onDownload, onRename, onDelete }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const updatedLabel = new Date(resume.updated_at).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
    });

    const handleAnalyze = async () => {
        // Already parsed (or in progress) — just go to the review page, don't re-trigger
        if (resume.parsing_status === "needs_review" || resume.parsing_status === "verified") {
            navigate(`/resumes/${resume.id}/review`);
            return;
        }
        if (resume.parsing_status === "processing") {
            navigate(`/resumes/${resume.id}/review`);
            return;
        }

        setAnalyzing(true);
        try {
            await parseResume(resume.id);
            navigate(`/resumes/${resume.id}/review`);
        } catch {
            navigate(`/resumes/${resume.id}/review`); // review page will surface the failure state
        } finally {
            setAnalyzing(false);
        }
    };

    const analyzeLabel =
        resume.parsing_status === "verified" ? "View Analysis" :
            resume.parsing_status === "needs_review" ? "Review" :
                resume.parsing_status === "failed" ? "Retry Analysis" :
                    "Analyze";

    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink">
                        <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{resume.display_name}</p>
                        <p className="mt-0.5 text-xs text-ink/50">
                            {resume.file_type.toUpperCase()} · {formatFileSize(resume.file_size)} · Updated {updatedLabel}
                        </p>
                        <div className="mt-2">
                            <ParsingStatusBadge status={resume.parsing_status} />
                        </div>
                    </div>
                </div>

                <div className="relative shrink-0">
                    <button onClick={() => setMenuOpen((o) => !o)} className="text-ink/40 hover:text-ink" aria-label="Resume actions">
                        <MoreVertical size={18} />
                    </button>
                    {menuOpen && (
                        <div onMouseLeave={() => setMenuOpen(false)} className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-line bg-white py-1 shadow-lg">
                            <button onClick={() => { setMenuOpen(false); onRename(resume); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-ink/80 hover:bg-ink/5">
                                <Pencil size={14} /> Rename
                            </button>
                            <button onClick={() => { setMenuOpen(false); onDelete(resume); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-danger/5">
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onDownload(resume)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors"
                >
                    <Download size={15} /> Download
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-60"
                >
                    {analyzing ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
                    {analyzing ? "Starting…" : analyzeLabel}
                </button>
            </div>
        </div>
    );
}