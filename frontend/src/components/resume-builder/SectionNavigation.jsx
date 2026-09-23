import { CheckCircle2, Circle } from "lucide-react";
import { useResumeBuilder } from "../../context/ResumeBuilderContext";

const SECTIONS = [
    { key: "personalInformation", label: "Personal Information" },
    { key: "summary", label: "Professional Summary" },
    { key: "education", label: "Education" },
    { key: "experience", label: "Experience" },
    { key: "projects", label: "Projects" },
    { key: "skills", label: "Skills" },
    { key: "certifications", label: "Certifications" },
    { key: "achievements", label: "Achievements" },
    { key: "additionalSections", label: "Additional Sections" },
];

export default function SectionNavigation({ activeSection, onSelect, orientation = "vertical" }) {
    const { sectionStatus } = useResumeBuilder();

    const isVertical = orientation === "vertical";

    return (
        <nav className={isVertical ? "flex flex-col gap-1" : "flex gap-2 overflow-x-auto pb-1"}>
            {SECTIONS.map(({ key, label }, i) => {
                const isActive = activeSection === key;
                const isComplete = sectionStatus[key];

                return (
                    <button
                        key={key}
                        onClick={() => onSelect(key)}
                        className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${isVertical ? "text-left" : "shrink-0"}
              ${isActive ? "bg-signal/15 text-signal" : "text-ink/70 hover:bg-ink/5 hover:text-ink"}`}
                    >
                        {isVertical && (
                            isComplete
                                ? <CheckCircle2 size={16} className="shrink-0 text-success" />
                                : <Circle size={16} className="shrink-0 text-ink/25" />
                        )}
                        {isVertical && <span className="text-ink/40 text-xs w-4 shrink-0">{i + 1}.</span>}
                        {label}
                    </button>
                );
            })}
        </nav>
    );
}