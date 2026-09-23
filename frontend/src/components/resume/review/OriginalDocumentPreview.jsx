import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { getResumePreviewBlobUrl, downloadResume } from "../../../services/resumeService";

export default function OriginalDocumentPreview({ resume }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl;
        if (resume.file_type === "pdf") {
            getResumePreviewBlobUrl(resume.id)
                .then((url) => { objectUrl = url; setPreviewUrl(url); })
                .catch(() => setError(true));
        }
        return () => { if (objectUrl) window.URL.revokeObjectURL(objectUrl); };
    }, [resume.id, resume.file_type]);

    if (resume.file_type !== "pdf") {
        return (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-line bg-white p-8 text-center">
                <FileText size={32} className="mb-3 text-ink/30" />
                <p className="text-sm font-medium text-ink">Preview isn't available for DOCX files</p>
                <p className="mt-1 text-sm text-ink/50">Download the file to view the original document.</p>
                <button
                    onClick={() => downloadResume(resume.id, `${resume.display_name}.${resume.file_type}`)}
                    className="mt-4 flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                >
                    <Download size={15} /> Download
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center rounded-lg border border-line bg-white p-8 text-center text-sm text-danger">
                Unable to load the document preview.
            </div>
        );
    }

    if (!previewUrl) {
        return (
            <div className="flex h-full items-center justify-center rounded-lg border border-line bg-white p-8 text-sm text-ink/50">
                Loading preview…
            </div>
        );
    }

    return (
        <iframe
            src={previewUrl}
            title="Original resume preview"
            className="h-full w-full rounded-lg border border-line bg-white"
        />
    );
}