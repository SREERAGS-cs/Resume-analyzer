import { hasItems, buildSections, SectionList, EducationEntries, SkillsList } from "./sharedSections";

export default function ModernTemplate({ resumeData }) {
    const { personalInformation: p, skills, education } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    }, ["summary", "experience", "projects", "achievements"]);

    return (
        <div className="flex h-full w-full bg-white font-body text-[13px] leading-relaxed text-ink">
            <div className="flex w-[34%] flex-col gap-5 bg-ink px-6 py-8 text-paper">
                <h1 className="font-display text-xl font-semibold">{p.fullName || "Your Name"}</h1>
                <div className="flex flex-col gap-1 text-[12px] text-paper/60">
                    <span>{p.email || "your.email@example.com"}</span>
                    <span>{p.phone || "Phone"}</span>
                    <span>{p.location || "Location"}</span>
                    {p.linkedin && <span>{p.linkedin}</span>}
                    {p.github && <span>{p.github}</span>}
                    {p.portfolio && <span>{p.portfolio}</span>}
                </div>
                {hasItems(skills) && (
                    <div>
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-signal">Skills</h2>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map((s, i) => <span key={i} className="rounded-full bg-paper/10 px-2 py-0.5 text-[11px]">{s}</span>)}
                        </div>
                    </div>
                )}
                {hasItems(education) && (
                    <div>
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-signal">Education</h2>
                        <EducationEntries education={education} itemClassName="text-[12px] font-medium" subClassName="text-[11px] text-paper/60" />
                    </div>
                )}
            </div>
            <div className="flex-1 px-7 py-8">
                <SectionList sections={sections} headingClassName="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50" />
            </div>
        </div>
    );
}