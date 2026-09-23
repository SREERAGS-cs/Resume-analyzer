import { Check } from "lucide-react";
import ResumeCanvas from "../../resume/templates/ResumeCanvas";
import { sampleResumeData } from "../../resume/templates/sampleResumeData";

export default function TemplateCard({ template, isSelected, onPreview, onChoose }) {
    return (
        <div className={`flex flex-col rounded-lg border bg-white p-4 transition-all hover:shadow-md
      ${isSelected ? "border-signal ring-2 ring-signal/30" : "border-line hover:border-ink/25"}`}>
            <div className="relative mb-4">
                <ResumeCanvas templateId={template.id} resumeData={sampleResumeData} />
                {isSelected && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-signal text-ink">
                        <Check size={13} />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ink">{template.name}</h3>
                <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-ink/60">{template.category}</span>
            </div>
            <p className="mt-1.5 text-sm text-ink/60">{template.description}</p>
            <p className="mt-2 text-[11px] text-ink/40">
                ATS Compatibility: <span className="font-medium text-ink/70">{template.atsRating}</span>
            </p>

            <div className="mt-4 flex gap-2">
                <button onClick={() => onPreview(template)} className="flex-1 rounded-md border border-line py-2 text-sm font-medium text-ink hover:bg-ink/5">
                    Preview
                </button>
                <button onClick={() => onChoose(template)} className="flex-1 rounded-md bg-ink py-2 text-sm font-medium text-paper hover:bg-ink/90">
                    Use Template
                </button>
            </div>
        </div>
    );
}