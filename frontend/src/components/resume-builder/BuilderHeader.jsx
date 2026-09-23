import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Download, Loader2, FolderOpen } from "lucide-react";
import { useResumeBuilder } from "../../context/ResumeBuilderContext";
import { getTemplateById } from "../../config/resumeTemplates";
import { createDraft, updateDraft } from "../../services/resumeDraftService";

export default function BuilderHeader({ onTogglePreview, showPreviewToggle, onDownloadPdf, downloading }) {
    const navigate = useNavigate();
    const builderState = useResumeBuilder();
    const { resumeTitle, setResumeTitle, effectiveTemplate, draftId, setDraftId } = builderState;
    const [saveMessage, setSaveMessage] = useState("");
    const [saving, setSaving] = useState(false);

    const currentTemplate = getTemplateById(effectiveTemplate);

    const handleSaveDraft = async () => {
        setSaving(true);
        setSaveMessage("");
        try {
            if (draftId) {
                await updateDraft(draftId, builderState);
                setSaveMessage("Draft saved.");
            } else {
                const created = await createDraft(builderState);
                setDraftId(created.id);
                setSaveMessage("Draft saved.");
            }
        } catch {
            setSaveMessage("Unable to save draft. Please try again.");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMessage(""), 3000);
        }
    };

    return (
        <div className="border-b border-line bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
                        <ArrowLeft size={15} /> Back to Dashboard
                    </button>
                    <button onClick={() => navigate("/my-drafts")} className="flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
                        <FolderOpen size={15} /> My Drafts
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {saveMessage && <span className="text-xs text-ink/50">{saveMessage}</span>}
                    {showPreviewToggle && (
                        <button onClick={onTogglePreview} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5 lg:hidden">
                            <Eye size={15} /> Preview
                        </button>
                    )}
                    <button
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? "Saving…" : "Save Draft"}
                    </button>
                    <button
                        onClick={onDownloadPdf}
                        disabled={downloading}
                        className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60"
                    >
                        {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {downloading ? "Preparing…" : "Download PDF"}
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <input
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    className="w-full max-w-sm border-none bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-ink/30"
                    placeholder="Untitled Resume"
                />
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink/50">Template</span>
                    <span className="rounded-full bg-ink/5 px-2.5 py-1 font-medium text-ink">{currentTemplate.name}</span>
                    <button onClick={() => navigate("/choose-template")} className="text-ink/60 underline decoration-dotted hover:text-signal">
                        Change Template
                    </button>
                </div>
            </div>
        </div>
    );
}