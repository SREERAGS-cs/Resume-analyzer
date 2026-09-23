import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ArrowLeft, Pencil, Save, X } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ParsingStatusBadge from "../components/resume/ParsingStatusBadge";
import OriginalDocumentPreview from "../components/resume/review/OriginalDocumentPreview";
import EditableField from "../components/resume/review/EditableField";
import SkillsEditor from "../components/resume/review/SkillsEditor";
import ListSectionEditor from "../components/resume/review/ListSectionEditor";
import { getResume, getParsedResume, parseResume, updateParsedResume, verifyParsedResume } from "../services/resumeService";

const PERSONAL_INFO_FIELDS = ["full_name", "email", "phone", "location", "linkedin", "github", "portfolio"];

const EDUCATION_FIELDS = [
    { key: "degree", label: "Degree", type: "text" },
    { key: "institution", label: "Institution", type: "text" },
    { key: "field_of_study", label: "Field of Study", type: "text" },
    { key: "start_date", label: "Start Date", type: "text" },
    { key: "end_date", label: "End Date", type: "text" },
    { key: "score", label: "Score / CGPA", type: "text" },
];

const EXPERIENCE_FIELDS = [
    { key: "job_title", label: "Job Title", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "start_date", label: "Start Date", type: "text" },
    { key: "end_date", label: "End Date", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "responsibilities", label: "Responsibilities", type: "list" },
];

const PROJECT_FIELDS = [
    { key: "name", label: "Project Name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "technologies", label: "Technologies", type: "list" },
    { key: "role", label: "Role", type: "text" },
    { key: "link", label: "Link", type: "text" },
];

const CERTIFICATION_FIELDS = [
    { key: "name", label: "Certification Name", type: "text" },
    { key: "issuer", label: "Issuer", type: "text" },
    { key: "date", label: "Date", type: "text" },
    { key: "credential_link", label: "Credential Link", type: "text" },
];

const ACHIEVEMENT_FIELDS = [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "date", label: "Date", type: "text" },
];

function Section({ title, children }) {
    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink">{title}</h3>
            {children}
        </div>
    );
}

export default function ResumeReview() {
    const { resumeId } = useParams();
    const navigate = useNavigate();

    const [resume, setResume] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [draft, setDraft] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const resumeData = await getResume(resumeId);
            setResume(resumeData);

            let parsedData;
            try {
                parsedData = await getParsedResume(resumeId);
            } catch (err) {
                if (err.response?.status === 404) {
                    parsedData = await parseResume(resumeId);
                } else {
                    throw err;
                }
            }

            setParsed(parsedData);
            setDraft(parsedData);

            if (parsedData.status === "processing") {
                setTimeout(load, 1500);
            }
        } catch (err) {
            if (err.response?.status === 409) {
                setTimeout(load, 1500);
            } else {
                setError("Unable to load this resume's analysis.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeId]);

    const updateDraft = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const payload = {
                personal_info: draft.personal_info,
                summary: draft.summary,
                skills: draft.skills,
                education: draft.education,
                experience: draft.experience,
                projects: draft.projects,
                certifications: draft.certifications,
                achievements: draft.achievements,
            };
            const updated = await updateParsedResume(resumeId, payload);
            setParsed(updated);
            setDraft(updated);
            setEditing(false);
        } catch {
            setError("Unable to save your changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setDraft(parsed);
        setEditing(false);
    };

    const handleVerify = async () => {
        setVerifying(true);
        setError("");
        try {
            const updated = await verifyParsedResume(resumeId);
            setParsed(updated);
            setDraft(updated);
        } catch {
            setError("Unable to verify this resume right now.");
        } finally {
            setVerifying(false);
        }
    };

    if (loading || !draft) {
        return (
            <DashboardLayout title="Resume Review">
                <p className="text-sm text-ink/50">Analyzing your resume…</p>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Resume Review">
            <div className="mb-4 flex items-center justify-between">
                <button onClick={() => navigate("/resumes")} className="flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
                    <ArrowLeft size={15} /> Back to My Resumes
                </button>
                {parsed && parsed.status !== "failed" && (
                    <div className="flex items-center gap-2">
                        <ParsingStatusBadge status={parsed.status} />
                        {!editing ? (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                                <Pencil size={14} /> Edit
                            </button>
                        ) : (
                            <>
                                <button onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50">
                                    <X size={14} /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60">
                                    <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                                </button>
                            </>
                        )}
                        {!editing && parsed.status === "needs_review" && (
                            <button onClick={handleVerify} disabled={verifying} className="flex items-center gap-1.5 rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60">
                                <CheckCircle2 size={15} /> {verifying ? "Confirming…" : "Confirm & Continue"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {parsed?.status === "failed" ? (
                <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <AlertTriangle size={16} /> {parsed.parse_error || "Analysis failed for this resume."}
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* LEFT: original document */}
                    <div className="h-[80vh] lg:sticky lg:top-20">
                        {resume && <OriginalDocumentPreview resume={resume} />}
                    </div>

                    {/* RIGHT: structured data */}
                    <div className="flex flex-col gap-5">
                        <Section title="Personal Information">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {PERSONAL_INFO_FIELDS.map((key) => (
                                    <EditableField
                                        key={key}
                                        label={key.replace("_", " ")}
                                        value={draft.personal_info?.[key]}
                                        editing={editing}
                                        onChange={(value) => updateDraft("personal_info", { ...draft.personal_info, [key]: value })}
                                    />
                                ))}
                            </div>
                        </Section>

                        <Section title="Professional Summary">
                            <EditableField label="Summary" value={draft.summary} editing={editing} multiline onChange={(value) => updateDraft("summary", value)} />
                        </Section>

                        <Section title="Skills">
                            <SkillsEditor skills={draft.skills || []} editing={editing} onChange={(value) => updateDraft("skills", value)} />
                        </Section>

                        <Section title="Education">
                            <ListSectionEditor
                                items={draft.education || []}
                                fields={EDUCATION_FIELDS}
                                editing={editing}
                                emptyLabel="No education entries detected."
                                blankEntry={{ degree: "", institution: "", field_of_study: "", start_date: "", end_date: "", score: "" }}
                                onChange={(value) => updateDraft("education", value)}
                            />
                        </Section>

                        <Section title="Experience">
                            <ListSectionEditor
                                items={draft.experience || []}
                                fields={EXPERIENCE_FIELDS}
                                editing={editing}
                                emptyLabel="No experience entries detected."
                                blankEntry={{ job_title: "", company: "", location: "", start_date: "", end_date: "", description: "", responsibilities: [] }}
                                onChange={(value) => updateDraft("experience", value)}
                            />
                        </Section>

                        <Section title="Projects">
                            <ListSectionEditor
                                items={draft.projects || []}
                                fields={PROJECT_FIELDS}
                                editing={editing}
                                emptyLabel="No project entries detected."
                                blankEntry={{ name: "", description: "", technologies: [], role: "", link: "" }}
                                onChange={(value) => updateDraft("projects", value)}
                            />
                        </Section>

                        <Section title="Certifications">
                            <ListSectionEditor
                                items={draft.certifications || []}
                                fields={CERTIFICATION_FIELDS}
                                editing={editing}
                                emptyLabel="No certifications detected."
                                blankEntry={{ name: "", issuer: "", date: "", credential_link: "" }}
                                onChange={(value) => updateDraft("certifications", value)}
                            />
                        </Section>

                        <Section title="Achievements">
                            <ListSectionEditor
                                items={draft.achievements || []}
                                fields={ACHIEVEMENT_FIELDS}
                                editing={editing}
                                emptyLabel="No achievements detected."
                                blankEntry={{ title: "", description: "", date: "" }}
                                onChange={(value) => updateDraft("achievements", value)}
                            />
                        </Section>
                        {Object.entries(draft.other_sections || {}).map(([key, value]) => (
                            <Section key={key} title={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
                                <p className="whitespace-pre-line text-sm text-ink/80">{value}</p>
                            </Section>
                        ))}

                        {Object.entries(draft.unrecognized_sections || {}).map(([key, value]) => (
                            <Section key={key} title={key}>
                                <p className="whitespace-pre-line text-sm text-ink/80">{value}</p>
                            </Section>
                        ))}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}