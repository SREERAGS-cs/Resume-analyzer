import { buildSections, SectionList, SkillsList } from "./sharedSections";
import { buildContactLine } from "./sharedSections";
export default function DeveloperTemplate({ resumeData }) {
    const { personalInformation: p, skills } = resumeData;
    const sections = buildSections(resumeData, {
        text: "", itemTitle: "font-medium", itemSub: "text-ink/50 text-[12px]", itemDesc: "mt-1 text-ink/70 text-[12px]",
    });

    return (
        <div className="h-full w-full bg-white px-9 py-9 font-body text-[13px] leading-relaxed text-ink">
            <h1 className="font-mono text-xl font-semibold">{p.fullName || "your_name"}</h1>
            <p className="mt-1 font-mono text-xs text-ink/50">{buildContactLine(p) || "email · phone · linkedin · github · portfolio"}</p>
            <div className="mt-5">
                <SectionList sections={sections} headingClassName="mb-1.5 font-mono text-xs font-semibold text-signal before:content-['//_']" />
                {skills?.length > 0 && (
                    <section>
                        <h2 className="mb-1.5 font-mono text-xs font-semibold text-signal before:content-['//_']">Skills</h2>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map((s, i) => (
                                <span key={i} className="rounded border border-signal/40 px-1.5 py-0.5 font-mono text-[11px] text-ink">{s}</span>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}