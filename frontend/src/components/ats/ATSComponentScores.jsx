import { Target, Briefcase, Key, CheckCircle2, FileText, Cpu } from "lucide-react";

export default function ATSComponentScores({
    roleSkillsScore,
    projectExperienceScore,
    qualificationsKeywordsScore,
    contentQualityScore,
    formattingScore,
    atsParsingScore,
    keywordScore,
    sectionScore,
    contentScore,
}) {
    const roleSkills = roleSkillsScore ?? sectionScore ?? 0;
    const projectExp = projectExperienceScore ?? sectionScore ?? 0;
    const qualKw = qualificationsKeywordsScore ?? keywordScore ?? 0;
    const content = contentQualityScore ?? contentScore ?? 0;
    const format = formattingScore ?? 0;
    const parsing = atsParsingScore ?? formattingScore ?? 0;

    const scores = [
        {
            label: "Role Skills & Relevance",
            score: roleSkills,
            weight: "30% weight",
            icon: Target,
            description: "Target-role skills, frameworks & tech stack",
        },
        {
            label: "Projects & Experience",
            score: projectExp,
            weight: "25% weight",
            icon: Briefcase,
            description: "Domain-specific project execution & depth",
        },
        {
            label: "Qualifications & Tools",
            score: qualKw,
            weight: "15% weight",
            icon: Key,
            description: "Role tools, databases & concepts coverage",
        },
        {
            label: "Content Quality",
            score: content,
            weight: "10% weight",
            icon: CheckCircle2,
            description: "Action verbs & measurable outcomes",
        },
        {
            label: "Formatting & Alignment",
            score: format,
            weight: "15% weight",
            icon: FileText,
            description: "Typography hierarchy, margins & alignment",
        },
        {
            label: "Machine Readability",
            score: parsing,
            weight: "5% weight",
            icon: Cpu,
            description: "OCR, unicode integrity & reading order",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map(({ label, score, weight, icon: Icon, description }) => {
                let badgeStyle = "text-emerald-700 bg-emerald-50 border-emerald-200";
                if (score < 60) badgeStyle = "text-rose-700 bg-rose-50 border-rose-200";
                else if (score < 75) badgeStyle = "text-amber-700 bg-amber-50 border-amber-200";

                return (
                    <div key={label} className="flex flex-col justify-between rounded-xl border border-line bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="rounded-lg bg-paper p-2 text-ink/70">
                                    <Icon size={18} />
                                </div>
                                <span className="font-display text-sm font-semibold text-ink">{label}</span>
                            </div>
                            <span className="text-[10px] font-medium text-ink/50 uppercase tracking-wider">{weight}</span>
                        </div>

                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-display text-2xl font-bold text-ink">{score}</span>
                            <span className="text-xs text-ink/50">/ 100</span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                            <span className="text-ink/60 truncate pr-2">{description}</span>
                            <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${badgeStyle}`}>
                                {score >= 75 ? "Good" : score >= 60 ? "Average" : "Low"}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
