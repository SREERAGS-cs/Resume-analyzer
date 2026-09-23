import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function AtsClassicTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-bold", itemSub: "text-ink text-[12px]", itemDesc: "mt-1 text-ink text-[12px]",
    });

    return (
        <div className="h-full w-full bg-white px-10 py-9 font-body text-[13px] leading-relaxed text-black">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">{p.fullName || "YOUR NAME"}</h1>
                <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p></div>
            <SectionList sections={sections} headingClassName="mb-1.5 border-b border-black pb-0.5 text-sm font-bold uppercase" />
            {skills?.length > 0 && (
                <section>
                    <h2 className="mb-1.5 border-b border-black pb-0.5 text-sm font-bold uppercase">Skills</h2>
                    <SkillsList skills={skills} className="text-[12px] text-ink" />
                </section>
            )}
        </div>
    );
}