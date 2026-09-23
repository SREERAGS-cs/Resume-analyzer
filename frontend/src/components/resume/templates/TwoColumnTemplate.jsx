import { hasItems, buildSections, SectionList, EducationEntries, CertificationEntries, SkillsList } from "./sharedSections";

export default function TwoColumnTemplate({ resumeData }) {
    const { personalInformation: p, skills, education, certifications } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    }, ["summary", "experience", "projects", "achievements"]);

    return (
        <div className="flex h-full w-full bg-white font-body text-[13px] leading-relaxed text-ink">
            <div className="flex-1 px-7 py-8">
                <h1 className="font-display text-xl font-semibold">{p.fullName || "Your Name"}</h1>
                <p className="mt-1 text-xs text-ink/50">{p.email || "your.email@example.com"}</p>
                <div className="mt-5">
                    <SectionList sections={sections} headingClassName="mb-1.5 border-l-2 border-signal pl-2 text-xs font-semibold uppercase tracking-wide text-ink/60" />
                </div>
            </div>
            <div className="w-[32%] bg-ink/[0.03] px-5 py-8">
                <div className="mb-5 text-[12px] text-ink/60">
                    <p>{p.phone || "Phone"}</p>
                    <p>{p.location || "Location"}</p>
                    {p.linkedin && <p>{p.linkedin}</p>}
                    {p.github && <p>{p.github}</p>}
                    {p.portfolio && <p>{p.portfolio}</p>}
                </div>
                {hasItems(skills) && (
                    <div className="mb-5">
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Skills</h2>
                        <SkillsList skills={skills} className="text-[12px] text-ink" />
                    </div>
                )}
                {hasItems(education) && (
                    <div className="mb-5">
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Education</h2>
                        <EducationEntries education={education} itemClassName="text-[12px] font-medium" subClassName="text-[11px] text-ink/50" />
                    </div>
                )}
                {hasItems(certifications) && (
                    <div>
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Certifications</h2>
                        <CertificationEntries certifications={certifications} itemClassName="text-[12px] text-ink/70" />
                    </div>
                )}
            </div>
        </div>
    );
}