export function hasItems(arr) {
    return Array.isArray(arr) && arr.length > 0;
}
export function buildContactLine(p) {
    return [p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio]
        .filter(Boolean)
        .join(" · ");
}
export function EducationEntries({ education, itemClassName, subClassName }) {
    if (!hasItems(education)) return null;
    return (
        <div className="flex flex-col gap-2">
            {education.map((e) => (
                <div key={e.id}>
                    <p className={itemClassName}>{e.degree || "Degree"}{e.fieldOfStudy ? ` — ${e.fieldOfStudy}` : ""}</p>
                    <p className={subClassName}>
                        {e.institution}
                        {(e.startDate || e.endDate) && ` · ${[e.startDate, e.endDate].filter(Boolean).join(" – ")}`}
                        {(e.cgpa || e.percentage) && ` · ${e.cgpa ? `CGPA ${e.cgpa}` : e.percentage}`}
                    </p>
                </div>
            ))}
        </div>
    );
}

export function ExperienceEntries({ experience, itemClassName, subClassName, descClassName }) {
    if (!hasItems(experience)) return null;
    return (
        <div className="flex flex-col gap-3">
            {experience.map((e) => (
                <div key={e.id}>
                    <p className={itemClassName}>{e.jobTitle || "Job Title"}{e.company && ` — ${e.company}`}</p>
                    <p className={subClassName}>{[e.startDate, e.endDate].filter(Boolean).join(" – ")}{e.location && ` · ${e.location}`}</p>
                    {e.description && <p className={descClassName}>{e.description}</p>}
                    {hasItems(e.responsibilities) && (
                        <ul className={`${descClassName} list-disc pl-4`}>
                            {e.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}

export function ProjectEntries({ projects, itemClassName, subClassName }) {
    if (!hasItems(projects)) return null;
    return (
        <div className="flex flex-col gap-2">
            {projects.map((p) => (
                <div key={p.id}>
                    <p className={itemClassName}>{p.projectName || "Project Name"}</p>
                    {p.description && <p className={subClassName}>{p.description}</p>}
                    {hasItems(p.technologies) && <p className={subClassName}>{p.technologies.join(", ")}</p>}
                </div>
            ))}
        </div>
    );
}

export function CertificationEntries({ certifications, itemClassName }) {
    if (!hasItems(certifications)) return null;
    return (
        <div className="flex flex-col gap-1">
            {certifications.map((c) => (
                <p key={c.id} className={itemClassName}>
                    {c.name}{c.issuingOrganization && ` — ${c.issuingOrganization}`}{c.date && ` (${c.date})`}
                </p>
            ))}
        </div>
    );
}

export function AchievementEntries({ achievements, itemClassName }) {
    if (!hasItems(achievements)) return null;
    return (
        <div className="flex flex-col gap-1">
            {achievements.map((a) => <p key={a.id} className={itemClassName}>{a.title}{a.date && ` (${a.date})`}</p>)}
        </div>
    );
}

const DEFAULT_ORDER = ["summary", "experience", "education", "projects", "certifications", "achievements"];

/**
 * Builds an ordered list of section objects, skipping any section with no
 * content — this is the single place that decides "don't show an empty
 * heading," so every template gets that behavior for free.
 */
export function buildSections(resumeData, style, order = DEFAULT_ORDER) {
    const { summary, education, experience, projects, certifications, achievements } = resumeData;

    const map = {
        summary: summary
            ? { key: "summary", title: "Summary", content: <p className={style.text}>{summary}</p> }
            : null,
        experience: hasItems(experience)
            ? { key: "experience", title: "Experience", content: <ExperienceEntries experience={experience} itemClassName={style.itemTitle} subClassName={style.itemSub} descClassName={style.itemDesc} /> }
            : null,
        education: hasItems(education)
            ? { key: "education", title: "Education", content: <EducationEntries education={education} itemClassName={style.itemTitle} subClassName={style.itemSub} /> }
            : null,
        projects: hasItems(projects)
            ? { key: "projects", title: "Projects", content: <ProjectEntries projects={projects} itemClassName={style.itemTitle} subClassName={style.itemSub} /> }
            : null,
        certifications: hasItems(certifications)
            ? { key: "certifications", title: "Certifications", content: <CertificationEntries certifications={certifications} itemClassName={style.itemSub} /> }
            : null,
        achievements: hasItems(achievements)
            ? { key: "achievements", title: "Achievements", content: <AchievementEntries achievements={achievements} itemClassName={style.itemSub} /> }
            : null,
    };

    return order.map((k) => map[k]).filter(Boolean);
}

export function SectionList({ sections, headingClassName, gapClassName = "mb-4" }) {
    return sections.map(({ key, title, content }, index) => (
        <section
            key={key}
            className={`${gapClassName} ${index < sections.length - 1 ? "border-b-2 border-ink pb-4" : ""
                }`}
        >
            <h2 className={headingClassName}>{title}</h2>
            {content}
        </section>
    ));
}
export function SkillsList({ skills, className }) {
    if (!hasItems(skills)) return null;
    return (
        <div className="flex flex-col gap-1">
            {skills.map((skill, i) => (
                <p key={i} className={className}>{skill}</p>
            ))}
        </div>
    );
}