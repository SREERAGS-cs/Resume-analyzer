import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import TemplateCard from "../components/resume-builder/templates/TemplateCard";
import TemplateConfirmDialog from "../components/resume-builder/templates/TemplateConfirmDialog";
import TemplatePreviewModal from "../components/resume-builder/templates/TemplatePreviewModal";
import { resumeTemplates, templateCategories } from "../config/resumeTemplates";
import { useResumeBuilder } from "../context/ResumeBuilderContext";

export default function ChooseTemplate() {
    const navigate = useNavigate();
    const { selectedTemplate, setSelectedTemplate } = useResumeBuilder();
    const [activeCategory, setActiveCategory] = useState("All");
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [pendingTemplate, setPendingTemplate] = useState(null);

    const filteredTemplates = useMemo(() => {
        if (activeCategory === "All") return resumeTemplates;
        if (activeCategory === "ATS Friendly") return resumeTemplates.filter((t) => t.atsRating === "Excellent");
        return resumeTemplates.filter((t) => t.category === activeCategory);
    }, [activeCategory]);

    const handleChoose = (template) => {
        setPreviewTemplate(null);
        setPendingTemplate(template);
    };

    const handleConfirm = () => {
        setSelectedTemplate(pendingTemplate.id);
        navigate("/create-resume");
    };

    return (
        <DashboardLayout title="Choose a Resume Template">
            <button onClick={() => navigate("/dashboard")} className="mb-4 flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
                <ArrowLeft size={15} /> Back to Dashboard
            </button>

            <div className="mb-5">
                <h1 className="font-display text-xl font-semibold text-ink">Choose a Resume Template</h1>
                <p className="mt-1.5 text-sm text-ink/60">
                    Start with a professionally designed template. You can customize your content after selecting one.
                </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {templateCategories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
              ${activeCategory === cat ? "bg-ink text-paper" : "border border-line text-ink/70 hover:bg-ink/5"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate === template.id}
                        onPreview={setPreviewTemplate}
                        onChoose={handleChoose}
                    />
                ))}
            </div>

            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onUseTemplate={handleChoose}
                />
            )}

            {pendingTemplate && (
                <TemplateConfirmDialog
                    template={pendingTemplate}
                    onCancel={() => setPendingTemplate(null)}
                    onConfirm={handleConfirm}
                />
            )}
        </DashboardLayout>
    );
}