import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, Plus } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { listDrafts, deleteDraft } from "../services/resumeDraftService";
import { getTemplateById } from "../config/resumeTemplates";

export default function MyDrafts() {
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDrafts = async () => {
        setLoading(true);
        try {
            const data = await listDrafts();
            setDrafts(data);
        } catch {
            setError("Unable to load your drafts. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDrafts(); }, []);

    const handleDelete = async (id) => {
        try {
            await deleteDraft(id);
            setDrafts((prev) => prev.filter((d) => d.id !== id));
        } catch {
            setError("Unable to delete this draft. Please try again.");
        }
    };

    return (
        <DashboardLayout title="My Drafts">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-ink/60">Continue working on a saved resume draft.</p>
                <button
                    onClick={() => navigate("/choose-template")}
                    className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                >
                    <Plus size={16} /> New Resume
                </button>
            </div>

            {loading && <p className="text-sm text-ink/50">Loading…</p>}

            {error && (
                <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {!loading && !error && drafts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white py-16 text-center">
                    <FileText size={32} className="mb-3 text-ink/30" />
                    <h3 className="font-display text-base font-semibold text-ink">No saved drafts yet</h3>
                    <p className="mt-1.5 text-sm text-ink/60">Start building a resume and save your progress here.</p>
                </div>
            )}

            {!loading && drafts.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {drafts.map((draft) => (
                        <div key={draft.id} className="rounded-lg border border-line bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-ink">{draft.title}</p>
                                    <p className="mt-0.5 text-xs text-ink/50">
                                        {getTemplateById(draft.template_id).name} · Updated {new Date(draft.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button onClick={() => handleDelete(draft.id)} className="text-ink/40 hover:text-danger" aria-label="Delete draft">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                            <button
                                onClick={() => navigate(`/create-resume?draftId=${draft.id}`)}
                                className="mt-4 w-full rounded-md border border-line py-2 text-sm font-medium text-ink hover:bg-ink/5"
                            >
                                Continue Editing
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}