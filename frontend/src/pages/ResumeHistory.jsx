import { useEffect, useState } from "react";
import { FileText, History } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getResumes } from "../services/resumeService";

export default function ResumeHistory() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getResumes();
                setResumes(data);
            } catch {
                setError("Unable to load resume history.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <DashboardLayout title="Resume History">
            <p className="mb-6 text-sm text-ink/60">
                A timeline of your resumes, most recently updated first.
            </p>

            {loading && <p className="text-sm text-ink/50">Loading…</p>}

            {error && (
                <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {!loading && !error && resumes.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white py-16 text-center">
                    <History size={32} className="mb-3 text-ink/30" />
                    <h3 className="font-display text-base font-semibold text-ink">No history yet</h3>
                    <p className="mt-1.5 text-sm text-ink/60">
                        Your resume activity will appear here once you upload a resume.
                    </p>
                </div>
            )}

            {!loading && resumes.length > 0 && (
                <div className="rounded-lg border border-line bg-white">
                    {resumes.map((resume, i) => (
                        <div
                            key={resume.id}
                            className={`flex items-center gap-4 px-5 py-4 ${i !== resumes.length - 1 ? "border-b border-line" : ""}`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink">
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink">{resume.display_name}</p>
                                <p className="text-xs text-ink/50">
                                    v{resume.version} · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                                    {resume.updated_at !== resume.created_at &&
                                        ` · Updated ${new Date(resume.updated_at).toLocaleDateString()}`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}