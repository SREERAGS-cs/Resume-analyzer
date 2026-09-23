import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function ProfessionalTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    });

    return (
        <div className="h-full w-full bg-white px-9 py-9 font-body text-[13px] leading-relaxed text-ink">
            <div className="mb-5 border-b border-line pb-4 text-center">
                <h1 className="font-display text-2xl font-semibold">{p.fullName || "Your Name"}</h1>
                <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
            </div>
            <SectionList sections={sections} headingClassName="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink" />
            {skills?.length > 0 && (
                <section>
                    <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">Skills</h2>
                    <SkillsList skills={skills} className="text-[12px] text-ink" />
                </section>
            )}
        </div>
    );
}