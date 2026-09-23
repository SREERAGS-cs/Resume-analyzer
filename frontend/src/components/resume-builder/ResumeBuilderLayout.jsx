import { useState, useRef } from "react";
import { X } from "lucide-react";
import BuilderHeader from "./BuilderHeader";
import ProgressIndicator from "./ProgressIndicator";
import FormattingControls from "./FormattingControl";
import SectionNavigation from "./SectionNavigation";
import ResumeEditor from "./ResumeEditor";
import ResumePreview from "./ResumePreview";
import ResumeExportCanvas from "./ResumeExportCanvas";
import { useResumeBuilder } from "../../context/ResumeBuilderContext";
import { exportNodeToPdf } from "../../utils/exportResumePdf";

export default function ResumeBuilderLayout() {
    const [activeSection, setActiveSection] = useState("personalInformation");
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const exportRef = useRef(null);

    const {
        effectiveTemplate,
        resumeTitle,
        personalInformation,
        summary,
        skills,
        education,
        experience,
        projects,
        certifications,
        achievements,
        additionalSections,
        fontFamilyValue,
        fontSizeScale,
    } = useResumeBuilder();

    const resumeData = {
        personalInformation,
        summary,
        skills,
        education,
        experience,
        projects,
        certifications,
        achievements,
        additionalSections,
    };

    const handleDownloadPdf = async () => {
        if (!exportRef.current) return;
        try {
            setDownloading(true);
            const safeTitle = (resumeTitle?.trim() || "resume").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "resume";
            await exportNodeToPdf(exportRef.current, `${safeTitle}.pdf`);
        } catch (err) {
            console.error("PDF export failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper text-ink">
            <BuilderHeader
                onTogglePreview={() => setShowMobilePreview((prev) => !prev)}
                showPreviewToggle={true}
                onDownloadPdf={handleDownloadPdf}
                downloading={downloading}
            />

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Mobile Section Navigation */}
                <div className="mb-4 lg:hidden">
                    <div className="rounded-lg border border-line bg-white p-3">
                        <SectionNavigation
                            activeSection={activeSection}
                            onSelect={setActiveSection}
                            orientation="horizontal"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Left Sidebar (Desktop) */}
                    <aside className="hidden w-64 shrink-0 flex-col gap-6 lg:flex">
                        <div className="rounded-lg border border-line bg-white p-4">
                            <ProgressIndicator />
                        </div>
                        <FormattingControls />
                        <div className="rounded-lg border border-line bg-white p-3">
                            <SectionNavigation
                                activeSection={activeSection}
                                onSelect={setActiveSection}
                                orientation="vertical"
                            />
                        </div>
                    </aside>

                    {/* Middle: Editor Form */}
                    <div className="min-w-0 flex-1">
                        <ResumeEditor activeSection={activeSection} />
                    </div>

                    {/* Right: Live Preview (Desktop) */}
                    <div className="hidden w-[420px] shrink-0 xl:w-[480px] lg:block">
                        <div className="sticky top-6">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
                                Live Preview
                            </div>
                            <ResumePreview />
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Preview Modal */}
            {showMobilePreview && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 lg:hidden"
                    onClick={() => setShowMobilePreview(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-line px-5 py-4">
                            <h3 className="font-display text-base font-semibold text-ink">Resume Preview</h3>
                            <button
                                onClick={() => setShowMobilePreview(false)}
                                className="rounded-md p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
                                aria-label="Close preview"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-paper p-4">
                            <ResumePreview />
                        </div>
                        <div className="border-t border-line p-4">
                            <FormattingControls />
                        </div>
                    </div>
                </div>
            )}

            {/* Offscreen element for PDF capture */}
            <ResumeExportCanvas
                ref={exportRef}
                templateId={effectiveTemplate}
                resumeData={resumeData}
                fontFamily={fontFamilyValue}
                fontSizeScale={fontSizeScale}
            />
        </div>
    );
}