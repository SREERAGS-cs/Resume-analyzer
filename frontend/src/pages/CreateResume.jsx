import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import ResumeBuilderLayout from "../components/resume-builder/ResumeBuilderLayout";
import { useResumeBuilder } from "../context/ResumeBuilderContext";
import { getDraft } from "../services/resumeDraftService";

export default function CreateResume() {
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get("draftId");
    const { selectedTemplate, personalInformation, summary, education, loadFromDraft } = useResumeBuilder();
    const [loadingDraft, setLoadingDraft] = useState(!!draftId);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        if (!draftId) return;
        (async () => {
            try {
                const draft = await getDraft(draftId);
                loadFromDraft(draft);
            } catch {
                setLoadError("Unable to load that draft.");
            } finally {
                setLoadingDraft(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftId]);

    const hasExistingData = !!(personalInformation.fullName || personalInformation.email || summary || education.length > 0);

    if (loadingDraft) {
        return <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">Loading draft…</div>;
    }

    if (loadError) {
        return <div className="flex min-h-screen items-center justify-center text-sm text-danger">{loadError}</div>;
    }

    if (!draftId && !selectedTemplate && !hasExistingData) {
        return <Navigate to="/choose-template" replace />;
    }

    return <ResumeBuilderLayout />;
}