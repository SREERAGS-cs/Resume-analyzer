import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function ExecutiveTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    });
    const headingClass = "mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink after:h-px after:flex-1 after:bg-ink/25";

    return (
        <div className="h-full w-full overflow-hidden bg-white font-body text-[13px] leading-relaxed text-ink">
            <div className="bg-ink px-9 py-7 text-paper">
                <h1 className="font-display text-2xl font-bold">{p.fullName || "Your Name"}</h1>
                <div className="mt-2 h-0.5 w-10 bg-signal" />
                <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
            </div>
            <div className="px-9 py-7">
                <SectionList sections={sections} headingClassName={headingClass} />
                {skills?.length > 0 && (
                    <section>
                        <h2 className={headingClass}>Skills</h2>
                        <SkillsList skills={skills} className="text-[12px] text-ink" />
                    </section>
                )}
            </div>
        </div>
    );
}