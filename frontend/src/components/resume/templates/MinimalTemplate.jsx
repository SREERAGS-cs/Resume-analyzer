import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function MinimalTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    });

    return (
        <div className="h-full w-full bg-white px-10 py-10 font-body text-[13px] leading-loose text-ink">
            <h1 className="font-display text-lg font-medium">{p.fullName || "Your Name"}</h1>
            <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
            <div className="mt-6">
                <SectionList sections={sections} headingClassName="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink" />
                {skills?.length > 0 && (
                    <section>
                        <h2 className="mb-1.5 text-[11px] font-normal uppercase tracking-widest text-ink/40">Skills</h2>
                        <SkillsList skills={skills} className="text-[12px] text-ink" />
                    </section>
                )}
            </div>
        </div>
    );
}