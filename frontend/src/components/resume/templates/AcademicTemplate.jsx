import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function AcademicTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    // Education leads, per academic CV convention
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-semibold", itemSub: "text-ink/60 text-[12px] italic", itemDesc: "mt-1 text-ink/70 text-[12px]",
    }, ["education", "summary", "experience", "projects", "certifications", "achievements"]);

    return (
        <div className="h-full w-full bg-white px-10 py-9 font-body text-[13px] leading-relaxed text-ink">
            <div className="mb-5 text-center">
                <h1 className="font-display text-xl font-semibold tracking-wide">{p.fullName || "Your Name"}</h1>
                <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
            </div>
            <SectionList sections={sections} headingClassName="mb-1.5 border-b border-ink/20 pb-1 text-[13px] font-bold uppercase tracking-widest text-ink" />
            {skills?.length > 0 && (
                <section>
                    <h2 className="mb-1.5 border-b border-ink/20 pb-1 text-[13px] font-semibold uppercase tracking-widest">Skills</h2>
                    <SkillsList skills={skills} className="text-[12px] text-ink" />
                </section>
            )}
        </div>
    );
}