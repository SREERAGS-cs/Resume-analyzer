import { X } from "lucide-react";
import ResumeCanvas from "../../resume/templates/ResumeCanvas";
import { sampleResumeData } from "../../resume/templates/sampleResumeData";

export default function TemplatePreviewModal({ template, onClose, onUseTemplate }) {
    return (
        <div
            role="dialog" aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
            onClick={onClose}
        >
            <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-ink">{template.name}</h3>
                        <p className="text-sm text-ink/60">{template.description}</p>
                    </div>
                    <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close preview">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-paper px-6 py-6">
                    <div className="mx-auto max-w-[520px]">
                        <ResumeCanvas templateId={template.id} resumeData={sampleResumeData} />
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-line px-5 py-4">
                    <span className="text-xs text-ink/50">
                        ATS Compatibility: <span className="font-medium text-ink">{template.atsRating}</span>
                    </span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                            Close
                        </button>
                        <button onClick={() => onUseTemplate(template)} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90">
                            Use this template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}