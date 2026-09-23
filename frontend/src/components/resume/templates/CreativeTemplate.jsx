import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function CreativeTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    });
    const headingClass = "mb-1.5 border-l-2 border-signal pl-2 text-xs font-bold uppercase tracking-wide text-ink";

    return (
        <div className="h-full w-full overflow-hidden bg-white font-body text-[13px] leading-relaxed text-ink">
            <div className="flex items-center gap-4 bg-signal/15 px-8 py-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-signal font-display text-lg font-semibold text-ink">
                    {(p.fullName || "Y N").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                    <h1 className="font-display text-xl font-semibold">{p.fullName || "Your Name"}</h1>
                    <p className="mt-1 text-[12px]">{buildContactLine(p) || "your.email@example.com | Phone | Location"}</p>
                </div>
            </div>
            <div className="px-8 py-6">
                <SectionList sections={sections} headingClassName={headingClass} />
                {skills?.length > 0 && (
                    <section>
                        <h2 className={headingClass}>Skills</h2>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map((s, i) => <span key={i} className="rounded-full bg-signal/15 px-2 py-0.5 text-[11px] text-ink">{s}</span>)}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}