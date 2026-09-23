import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function CompactTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium text-[12px]", itemSub: "text-ink/50 text-[11px]", itemDesc: "mt-0.5 text-ink/70 text-[11px]",
    });

    return (
        <div className="h-full w-full bg-white px-7 py-6 font-body text-[11.5px] leading-snug text-ink">
            <div className="mb-2 flex items-baseline justify-between">
                <h1 className="font-display text-base font-semibold">{p.fullName || "Your Name"}</h1>
                <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
            </div>
            <SectionList sections={sections} headingClassName="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink" gapClassName="mb-2.5" />
            {skills?.length > 0 && (
                <section>
                    <h2 className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink/60">Skills</h2>
                    <SkillsList skills={skills} className="text-[12px] text-ink" />
                </section>
            )}
        </div>
    );
}