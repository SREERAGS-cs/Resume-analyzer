import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Briefcase,
    FileText,
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    TrendingDown,
    Wrench,
    Sparkles,
    PenLine,
    RotateCcw,
    ShieldCheck,
    ArrowRight,
    Download,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ResumeCanvas from "../components/resume/templates/ResumeCanvas";
import ResumeExportCanvas from "../components/resume-builder/ResumeExportCanvas";
import { exportNodeToPdf } from "../utils/exportResumePdf";
import { DEFAULT_TEMPLATE_ID } from "../config/resumeTemplates";
import { getParsedResume, getResumes } from "../services/resumeService";
import { analyzeJobMatching, getJobMatchingHistory } from "../services/jobMatchingService";

function toDisplayText(value) {
    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }
    return "";
}

function toStringList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((item) => toDisplayText(item).trim()).filter(Boolean);
}

function mapParsedResumeToTemplate(parsed, tailored) {
    return {
        personalInformation: {
            fullName: toDisplayText(tailored.personal_info?.full_name || tailored.personal_info?.fullName),
            email: toDisplayText(tailored.personal_info?.email),
            phone: toDisplayText(tailored.personal_info?.phone),
            location: toDisplayText(tailored.personal_info?.location),
            linkedin: toDisplayText(tailored.personal_info?.linkedin),
            github: toDisplayText(tailored.personal_info?.github),
            portfolio: toDisplayText(tailored.personal_info?.portfolio),
        },
        summary: tailored.summary,
        skills: tailored.skills,
        education: tailored.education.map((item, index) => ({
            id: item.id || `education-${index}`,
            degree: toDisplayText(item.degree),
            institution: toDisplayText(item.institution),
            fieldOfStudy: toDisplayText(item.field_of_study || item.fieldOfStudy),
            startDate: toDisplayText(item.start_date || item.startDate),
            endDate: toDisplayText(item.end_date || item.endDate),
            cgpa: toDisplayText(item.cgpa || item.score),
            percentage: toDisplayText(item.percentage),
        })),
        experience: tailored.experience.map((item, index) => ({
            id: item.id || `experience-${index}`,
            jobTitle: toDisplayText(item.job_title || item.jobTitle),
            company: toDisplayText(item.company),
            location: toDisplayText(item.location),
            startDate: toDisplayText(item.start_date || item.startDate),
            endDate: toDisplayText(item.end_date || item.endDate),
            description: toDisplayText(item.description),
            responsibilities: toStringList(item.responsibilities),
        })),
        projects: tailored.projects.map((item, index) => ({
            id: item.id || `project-${index}`,
            projectName: toDisplayText(item.name || item.projectName),
            description: toDisplayText(item.description),
            technologies: toStringList(item.technologies),
            projectLink: toDisplayText(item.link || item.projectLink),
        })),
        certifications: tailored.certifications.map((item, index) => ({
            id: item.id || `certification-${index}`,
            name: toDisplayText(item.name || item.title),
            issuingOrganization: toDisplayText(item.issuer || item.issuingOrganization),
            date: toDisplayText(item.date),
        })),
        achievements: tailored.achievements.map((item, index) => ({
            id: item.id || `achievement-${index}`,
            title: toDisplayText(item.title),
            description: toDisplayText(item.description),
            date: toDisplayText(item.date),
        })),
        additionalSections: Object.entries(parsed.other_sections || {}).map(([title, content], index) => ({
            id: `other-${index}`,
            title,
            content: toDisplayText(content),
        })),
    };
}

function Panel({ title, icon: Icon, children, emptyMessage }) {
    return (
        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                {Icon && <Icon size={18} className="text-signal" aria-hidden="true" />}
                <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            </div>
            {children || <p className="text-sm text-ink/50">{emptyMessage}</p>}
        </section>
    );
}

function ScoreBadge({ score }) {
    const level = score >= 75 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
    const styles = {
        HIGH: "bg-emerald-100 text-emerald-800",
        MEDIUM: "bg-amber-100 text-amber-800",
        LOW: "bg-rose-100 text-rose-800",
    };
    return (
        <div className="flex items-center gap-3">
            <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${styles[level]}`}>{level}</div>
            <div className="text-4xl font-bold text-ink">{score}</div>
        </div>
    );
}

const statusStyles = {
    green: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    yellow: "border-amber-200 bg-amber-50/80 text-amber-900",
    red: "border-rose-200 bg-rose-50/80 text-rose-900",
};

const statusLabels = {
    green: "Strong match",
    yellow: "Needs attention",
    red: "Priority focus",
};

function buildTailorSuggestions(parsedResume, result) {
    if (!parsedResume) {
        return [];
    }

    const missingRequirements = result?.missing_requirements || [];
    const matchedSkills = result?.matched_skills || [];
    const resumeSummary = parsedResume.summary?.trim();
    const skills = Array.isArray(parsedResume.skills) ? parsedResume.skills : [];
    const experience = Array.isArray(parsedResume.experience) ? parsedResume.experience : [];
    const projects = Array.isArray(parsedResume.projects) ? parsedResume.projects : [];

    const suggestions = [];

    if (resumeSummary) {
        suggestions.push({
            id: "summary",
            section: "summary",
            state: missingRequirements.length ? "yellow" : "green",
            title: "Professional summary",
            whatDetected: missingRequirements.length ? "The summary is not yet tailored to the target role." : "The summary already reflects relevant experience.",
            whyItMatters: "A tailored summary helps recruiters quickly see why you fit this role before they read the rest of the resume.",
            existingContent: resumeSummary,
            suggestedVersion: missingRequirements.length
                ? `${resumeSummary.trim()} ${missingRequirements.slice(0, 2).map((item) => item.toLowerCase()).join("; ")}.`
                : resumeSummary,
            evidence: missingRequirements.length ? `${missingRequirements.slice(0, 3).join(", ")}` : "Strong alignment with the target role.",
            safeToApply: true,
        });
    }

    if (skills.length) {
        suggestions.push({
            id: "skills",
            section: "skills",
            state: matchedSkills.length ? "green" : "yellow",
            title: "Core skills section",
            whatDetected: matchedSkills.length ? "The resume demonstrates several relevant technical skills." : "The skills section could better reflect the target role.",
            whyItMatters: "This section is often scanned first for ATS matching and role-fit signal.",
            existingContent: skills.join(", "),
            suggestedVersion: [...new Set([...skills, ...matchedSkills.slice(0, 4)])].join(", "),
            evidence: matchedSkills.length ? matchedSkills.slice(0, 3).join(", ") : "Add the most relevant keywords from the job description to strengthen alignment.",
            safeToApply: true,
        });
    }

    if (experience.length) {
        const firstRole = experience[0];
        const experienceText = [firstRole?.job_title, firstRole?.company, firstRole?.description, ...(firstRole?.responsibilities || [])].filter(Boolean).join(" ");
        suggestions.push({
            id: "experience",
            section: "experience",
            state: missingRequirements.length ? "red" : "green",
            title: "Experience impact",
            whatDetected: missingRequirements.length ? "Your strongest role could better mirror the key responsibilities in this job description." : "The experience section already supports the target role well.",
            whyItMatters: "Hiring managers and ATS systems prioritize clear proof of the responsibilities the job demands.",
            existingContent: experienceText || "No experience details are available for this resume.",
            suggestedVersion: missingRequirements.length
                ? `${firstRole?.job_title || "Role"}: Led work aligned to ${missingRequirements.slice(0, 2).join(" and ")}, delivering measurable business impact and collaborating across teams.`
                : experienceText,
            evidence: missingRequirements.length ? missingRequirements.slice(0, 2).join(" and ") : "The experience content already supports the target role.",
            safeToApply: true,
        });
    }

    if (projects.length) {
        suggestions.push({
            id: "projects",
            section: "projects",
            state: missingRequirements.length ? "yellow" : "green",
            title: "Project evidence",
            whatDetected: "Projects are often the clearest place to prove technical depth for role-specific work.",
            whyItMatters: "Projects let you surface relevant technologies and business outcomes that are harder to show in a generic resume summary.",
            existingContent: projects.map((project) => project?.name || project?.description || "Project").filter(Boolean).join(" • "),
            suggestedVersion: projects.length
                ? `${projects[0]?.name || "Project"}: Built and optimized solutions using ${matchedSkills.slice(0, 3).join(", ") || "core role technologies"} to improve performance, collaboration, and business value.`
                : "Add a role-relevant project that demonstrates your direct work with the target technologies.",
            evidence: matchedSkills.length ? matchedSkills.slice(0, 2).join(", ") : "Relevant project keywords are not yet visible in the current draft.",
            safeToApply: true,
        });
    }

    return suggestions.slice(0, 4);
}

export default function JobMatchingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const recommendationJob = location.state?.recommendationJob;
    const initialRecommendationDescription = recommendationJob ? [
        `Job title: ${recommendationJob.title}`,
        recommendationJob.company ? `Company: ${recommendationJob.company}` : "",
        recommendationJob.location ? `Location: ${recommendationJob.location}` : "",
        recommendationJob.employmentType ? `Employment type: ${recommendationJob.employmentType}` : "",
        recommendationJob.sourceUrl ? `Original listing: ${recommendationJob.sourceUrl}` : "",
        "Job description:",
        recommendationJob.description || "",
    ].filter(Boolean).join("\n") : "";
    const [resumes, setResumes] = useState([]);
    const [selectedId, setSelectedId] = useState(recommendationJob?.resumeId ? Number(recommendationJob.resumeId) : null);
    const [jobTitle, setJobTitle] = useState(recommendationJob ? (recommendationJob.company ? `${recommendationJob.title} at ${recommendationJob.company}` : recommendationJob.title || "") : "");
    const [jobDescription, setJobDescription] = useState(initialRecommendationDescription);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [notParsed, setNotParsed] = useState(false);
    const recommendationHandoffHandled = useRef(false);
    const [tailorOpen, setTailorOpen] = useState(false);
    const [tailorLoading, setTailorLoading] = useState(false);
    const [parsedResume, setParsedResume] = useState(null);
    const [tailoredResume, setTailoredResume] = useState(null);
    const [tailorSuggestions, setTailorSuggestions] = useState([]);
    const [selectedTailorSuggestion, setSelectedTailorSuggestion] = useState(null);
    const [tailorDraft, setTailorDraft] = useState("");
    const [appliedSuggestionIds, setAppliedSuggestionIds] = useState([]);
    const [downloadingTailoredResume, setDownloadingTailoredResume] = useState(false);
    const [tailorNotice, setTailorNotice] = useState("");
    const tailoredExportRef = useRef(null);
    const templateResumeData = useMemo(
        () => parsedResume && tailoredResume ? mapParsedResumeToTemplate(parsedResume, tailoredResume) : null,
        [parsedResume, tailoredResume],
    );

    useEffect(() => {
        (async () => {
            try {
                const data = await getResumes();
                setResumes(data || []);
            } catch {
                setErrorMessage("Failed to load your resumes.");
            } finally {
                setLoadingResumes(false);
            }
        })();
    }, []);

    const clearDisplayedResult = () => {
        setResult(null);
        setHistory([]);
        setErrorMessage("");
        setNotParsed(false);
    };

    const selectedResume = useMemo(
        () => resumes.find((resume) => Number(resume.id) === Number(selectedId)) || null,
        [resumes, selectedId],
    );

    const handleResumeSelect = (resumeId) => {
        setSelectedId(Number(resumeId));
        clearDisplayedResult();
    };

    const handleJobTitleChange = (value) => {
        setJobTitle(value);
        clearDisplayedResult();
    };

    const handleJobDescriptionChange = (value) => {
        setJobDescription(value);
        clearDisplayedResult();
    };

    const handleAnalyze = useCallback(async () => {
        if (!selectedId) {
            setErrorMessage("Please select a resume before running a job match.");
            return;
        }
        if (!jobDescription.trim()) {
            setErrorMessage("Please paste the job description to analyze.");
            return;
        }

        setLoadingAnalysis(true);
        setErrorMessage("");
        setNotParsed(false);
        setResult(null);
        setHistory([]);
        setTailorOpen(false);
        setSelectedTailorSuggestion(null);

        try {
            const report = await analyzeJobMatching(selectedId, jobTitle, jobDescription);
            setResult(report);
            const recent = await getJobMatchingHistory(selectedId);
            setHistory(recent || []);
        } catch (err) {
            const detail = typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Unable to analyze the job match right now.";
            setErrorMessage(detail);
            if (err.response?.status === 400) {
                setNotParsed(detail.includes("parsed resume") || detail.includes("review and confirm"));
            }
            setResult(null);
        } finally {
            setLoadingAnalysis(false);
        }
    }, [selectedId, jobDescription, jobTitle]);

    useEffect(() => {
        if (!recommendationJob || recommendationHandoffHandled.current || loadingResumes || !selectedId || !jobDescription.trim()) {
            return;
        }
        recommendationHandoffHandled.current = true;
        navigate(location.pathname, { replace: true, state: null });
        handleAnalyze();
    }, [handleAnalyze, jobDescription, loadingResumes, location.pathname, navigate, recommendationJob, selectedId]);

    const handleOpenTailor = async () => {
        if (!selectedId) {
            setErrorMessage("Please select a resume before tailoring it.");
            return;
        }

        setTailorOpen(true);
        setTailorLoading(true);
        setErrorMessage("");

        try {
            const parsed = await getParsedResume(selectedId);
            if (parsed?.status !== "verified") {
                setErrorMessage("Please review and confirm your parsed resume before using the AI Resume Tailor.");
                setTailorOpen(false);
                return;
            }

            setParsedResume(parsed);
            setTailoredResume({
                personal_info: parsed.personal_info || {},
                summary: parsed.summary || "",
                skills: Array.isArray(parsed.skills) ? [...parsed.skills] : [],
                education: Array.isArray(parsed.education) ? [...parsed.education] : [],
                experience: Array.isArray(parsed.experience) ? [...parsed.experience] : [],
                projects: Array.isArray(parsed.projects) ? [...parsed.projects] : [],
                certifications: Array.isArray(parsed.certifications) ? [...parsed.certifications] : [],
                achievements: Array.isArray(parsed.achievements) ? [...parsed.achievements] : [],
                other_sections: parsed.other_sections || {},
            });

            const suggestions = buildTailorSuggestions(parsed, result);
            setTailorSuggestions(suggestions);
            setSelectedTailorSuggestion(suggestions[0] || null);
            setTailorDraft(suggestions[0]?.suggestedVersion || "");
            setAppliedSuggestionIds([]);
            setTailorNotice("");
        } catch (err) {
            const detail = typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Unable to load the verified resume for tailoring.";
            setErrorMessage(detail);
            setTailorOpen(false);
        } finally {
            setTailorLoading(false);
        }
    };

    const applySuggestionToTailoredResume = (suggestion, editedText) => {
        if (!tailoredResume) {
            return;
        }

        const nextResume = structuredClone(tailoredResume);
        const finalText = (editedText || suggestion.suggestedVersion || "").trim();

        if (suggestion.section === "summary") {
            nextResume.summary = finalText;
        }

        if (suggestion.section === "skills") {
            const uniqueSkills = Array.from(new Set((finalText || "").split(",").map((entry) => entry.trim()).filter(Boolean)));
            nextResume.skills = uniqueSkills;
        }

        if (suggestion.section === "experience") {
            if (nextResume.experience?.length) {
                nextResume.experience[0].description = finalText;
                nextResume.experience[0].responsibilities = [];
            }
        }

        if (suggestion.section === "projects") {
            if (nextResume.projects?.length) {
                nextResume.projects[0].description = finalText;
            }
        }

        setTailoredResume(nextResume);
        setAppliedSuggestionIds((current) => current.includes(suggestion.id) ? current : [...current, suggestion.id]);
        setTailorNotice(`${suggestion.title} applied to your working resume. Your original verified resume is unchanged.`);
    };

    const handleApplySuggestion = () => {
        if (!selectedTailorSuggestion || !tailoredResume) {
            return;
        }
        applySuggestionToTailoredResume(selectedTailorSuggestion, tailorDraft);
    };

    const handleKeepOriginal = () => {
        if (!selectedTailorSuggestion) {
            return;
        }
        setTailorDraft(selectedTailorSuggestion.existingContent || "");
        setTailorNotice(`Kept the original ${selectedTailorSuggestion.title.toLowerCase()} in your working resume.`);
    };

    const handleDownloadTailoredResume = async () => {
        if (!tailoredExportRef.current) {
            setErrorMessage("The tailored resume preview is not ready to download yet.");
            return;
        }
        setDownloadingTailoredResume(true);
        setErrorMessage("");
        try {
            const baseName = (selectedResume?.display_name || selectedResume?.original_filename || "resume")
                .replace(/\.[^.]+$/, "")
                .replace(/[^a-zA-Z0-9_-]+/g, "-")
                .replace(/^-|-$/g, "") || "resume";
            await exportNodeToPdf(tailoredExportRef.current, `${baseName}-${(result?.job_title || "tailored").replace(/[^a-zA-Z0-9_-]+/g, "-")}.pdf`);
        } catch (error) {
            console.error("Tailored resume PDF export failed:", error);
            setErrorMessage("Unable to download the tailored resume. Please try again.");
        } finally {
            setDownloadingTailoredResume(false);
        }
    };

    const handleResetTailoredResume = () => {
        if (!parsedResume) {
            return;
        }

        setTailoredResume({
            personal_info: parsedResume.personal_info || {},
            summary: parsedResume.summary || "",
            skills: Array.isArray(parsedResume.skills) ? [...parsedResume.skills] : [],
            education: Array.isArray(parsedResume.education) ? [...parsedResume.education] : [],
            experience: Array.isArray(parsedResume.experience) ? [...parsedResume.experience] : [],
            projects: Array.isArray(parsedResume.projects) ? [...parsedResume.projects] : [],
            certifications: Array.isArray(parsedResume.certifications) ? [...parsedResume.certifications] : [],
            achievements: Array.isArray(parsedResume.achievements) ? [...parsedResume.achievements] : [],
            other_sections: parsedResume.other_sections || {},
        });
        setSelectedTailorSuggestion(tailorSuggestions[0] || null);
        setTailorDraft(tailorSuggestions[0]?.suggestedVersion || "");
        setAppliedSuggestionIds([]);
        setTailorNotice("Working resume reset to your original verified content.");
    };

    return (
        <DashboardLayout title="Job Matching">
            <div className="mb-6 flex flex-col gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                    <Briefcase className="text-signal" size={24} />
                    Job Matching
                </h1>
                <p className="text-sm text-ink/60">Compare your resume against an actual job description and identify the strongest gaps to close.</p>
                {selectedResume && (
                    <p className="mt-2 text-sm font-medium text-ink">
                        Resume: <span className="font-normal text-ink/70">{selectedResume.display_name || selectedResume.original_filename}</span>
                    </p>
                )}
            </div>

            {!loadingResumes && resumes.length > 0 && (
                <div className="mb-6 rounded-xl border border-line bg-white p-4 shadow-sm">
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
                            <label className="block text-sm font-medium text-ink">
                                Resume
                                <select value={selectedId ?? ""} onChange={(e) => handleResumeSelect(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-signal">
                                    <option value="">Select a resume</option>
                                    {resumes.map((resume) => (
                                        <option key={resume.id} value={resume.id}>{resume.display_name || resume.original_filename}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block text-sm font-medium text-ink">
                                Job Title
                                <input value={jobTitle} onChange={(e) => handleJobTitleChange(e.target.value)} placeholder="e.g. Backend Engineer" className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-signal" />
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-ink">
                            Job Description
                            <textarea
                                value={jobDescription}
                                onChange={(e) => handleJobDescriptionChange(e.target.value)}
                                placeholder="Paste the complete job description here..."
                                rows={12}
                                className="mt-1 min-h-[220px] w-full resize-y rounded-md border border-line bg-paper px-3 py-3 text-sm text-ink outline-none transition focus:border-signal"
                            />
                        </label>

                        <div className="flex justify-end">
                            <button onClick={handleAnalyze} disabled={loadingAnalysis} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60">
                                {loadingAnalysis ? "Analyzing..." : "Analyze Job Match"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="mb-5 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <AlertCircle size={16} /> {errorMessage}
                </div>
            )}

            {notParsed && selectedId && (
                <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
                    <p className="text-sm font-medium text-ink">This resume hasn't been verified yet.</p>
                    <p className="mt-1 text-sm text-ink/60">Review and confirm the parsed content before running job matching.</p>
                </div>
            )}

            {!loadingResumes && resumes.length === 0 && (
                <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
                    <p className="text-sm font-medium text-ink">No resumes found.</p>
                    <p className="mt-1 text-sm text-ink/60">Upload or create a resume before matching against a job description.</p>
                </div>
            )}

            {loadingAnalysis && (
                <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center text-sm text-ink/60">
                    Running job match analysis...
                </div>
            )}

            {!loadingAnalysis && result && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Overall Job Match</p>
                                <h2 className="mt-2 text-xl font-semibold text-ink">{result.job_title || "Target role"}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <ScoreBadge score={result.overall_score} />
                                <button
                                    type="button"
                                    onClick={handleOpenTailor}
                                    disabled={tailorLoading}
                                    className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-signal/10 px-3.5 py-2 text-sm font-medium text-ink hover:bg-signal/15 disabled:opacity-60"
                                >
                                    <Sparkles size={16} />
                                    {tailorLoading ? "Preparing Tailor..." : "Tailor My Resume"}
                                </button>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-ink/70">{result.overall_assessment}</p>
                    </div>

                    {tailorOpen && (
                        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Sparkles size={18} className="text-signal" />
                                <h2 className="font-display text-xl font-semibold text-ink">AI Resume Tailor</h2>
                            </div>
                            <p className="mb-5 text-sm text-ink/60">Tailor your resume for this specific job while keeping your experience truthful.</p>

                            <div className="mb-5 grid gap-4 lg:grid-cols-3">
                                <div className="rounded-lg border border-line bg-paper p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">Target Job</p>
                                    <p className="mt-2 text-sm font-medium text-ink">{result.job_title || "Target role"}</p>
                                </div>
                                <div className="rounded-lg border border-line bg-paper p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">Job Match Score</p>
                                    <p className="mt-2 text-sm font-medium text-ink">{result.overall_score}/100</p>
                                </div>
                                <div className="rounded-lg border border-line bg-paper p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">Working Copy</p>
                                    <p className="mt-2 text-sm font-medium text-ink">Original stays unchanged</p>
                                </div>
                            </div>

                            {tailorNotice && (
                                <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                    {tailorNotice}
                                </div>
                            )}

                            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                                <div className="grid items-start gap-5 2xl:grid-cols-[minmax(210px,0.7fr)_minmax(0,1fr)]">
                                <div className="rounded-xl border border-line bg-paper p-4">
                                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink/55">AI Suggestions</h3>
                                    <div className="space-y-3">
                                        {tailorSuggestions.length ? tailorSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTailorSuggestion(suggestion);
                                                    setTailorDraft(suggestion.suggestedVersion || "");
                                                    setTailorNotice("");
                                                }}
                                                className={`w-full rounded-lg border p-3 text-left transition ${selectedTailorSuggestion?.id === suggestion.id ? "border-signal bg-signal/5" : "border-line bg-white hover:bg-paper"}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium text-ink">{suggestion.title}</span>
                                                    {appliedSuggestionIds.includes(suggestion.id) ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                                                            <CheckCircle2 size={12} /> Applied
                                                        </span>
                                                    ) : (
                                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[suggestion.state]}`}>
                                                            {statusLabels[suggestion.state]}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-xs text-ink/60">{suggestion.whatDetected}</p>
                                            </button>
                                        )) : <p className="text-sm text-ink/60">No tailoring suggestions available yet.</p>}
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-xl border border-line bg-paper p-4">
                                    {selectedTailorSuggestion ? (
                                        <>
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-base font-semibold text-ink">{selectedTailorSuggestion.title}</h3>
                                                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyles[selectedTailorSuggestion.state]}`}>
                                                    {statusLabels[selectedTailorSuggestion.state]}
                                                </span>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-2">
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">What was detected</p>
                                                    <p className="mt-2 text-sm text-ink/70">{selectedTailorSuggestion.whatDetected}</p>
                                                </div>
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Why it matters for this job</p>
                                                    <p className="mt-2 text-sm text-ink/70">{selectedTailorSuggestion.whyItMatters}</p>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-2">
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Existing resume content</p>
                                                    <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{selectedTailorSuggestion.existingContent}</p>
                                                </div>
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Suggested improved version</p>
                                                    <textarea
                                                        value={tailorDraft}
                                                        onChange={(event) => setTailorDraft(event.target.value)}
                                                        rows={7}
                                                        className="mt-2 min-h-[180px] w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-signal"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-2">
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Evidence/reasoning</p>
                                                    <p className="mt-2 text-sm text-ink/70">{selectedTailorSuggestion.evidence}</p>
                                                </div>
                                                <div className="rounded-lg border border-line bg-white p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Whether the suggestion is safe to apply</p>
                                                    <div className="mt-2 flex items-center gap-2 text-sm text-ink/75">
                                                        <ShieldCheck size={16} className={selectedTailorSuggestion.safeToApply ? "text-emerald-600" : "text-amber-600"} />
                                                        {selectedTailorSuggestion.safeToApply ? "Safe to apply" : "Review before applying"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button type="button" onClick={handleApplySuggestion} className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90">
                                                    {appliedSuggestionIds.includes(selectedTailorSuggestion.id) ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                                                    {appliedSuggestionIds.includes(selectedTailorSuggestion.id) ? "Apply Change Again" : "Apply Change"}
                                                </button>
                                                <button type="button" onClick={() => setTailorDraft(selectedTailorSuggestion.suggestedVersion || "")} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper">
                                                    <PenLine size={16} /> Edit
                                                </button>
                                                <button type="button" onClick={handleKeepOriginal} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper">
                                                    <RotateCcw size={16} /> Keep Original
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-ink/60">Select a suggestion to review the tailoring details.</p>
                                    )}
                                </div>
                                </div>
                                <aside className="space-y-3 xl:sticky xl:top-6">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-semibold text-ink">Tailored resume</h3>
                                            <p className="text-xs text-ink/55">Live preview of your working copy</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleResetTailoredResume}
                                            className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                                            title="Discard tailoring changes and restore the verified original"
                                        >
                                            <RotateCcw size={13} /> Reset
                                        </button>
                                    </div>
                                    {templateResumeData && (
                                        <ResumeCanvas
                                            templateId={DEFAULT_TEMPLATE_ID}
                                            resumeData={templateResumeData}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleDownloadTailoredResume}
                                        disabled={downloadingTailoredResume || !templateResumeData}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3.5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Download size={16} />
                                        {downloadingTailoredResume ? "Preparing PDF..." : "Download tailored resume"}
                                    </button>
                                    <p className="text-xs leading-5 text-ink/55">
                                        Changes are only made to this working copy. Your verified original remains untouched.
                                    </p>
                                </aside>
                            </div>
                            {templateResumeData && (
                                <ResumeExportCanvas
                                    ref={tailoredExportRef}
                                    templateId={DEFAULT_TEMPLATE_ID}
                                    resumeData={templateResumeData}
                                />
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="Partial Matches" icon={FileText} emptyMessage="No partial matches found.">
                            {result.matched_skills?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.matched_skills.map((skill) => <li key={skill}>• {skill}</li>)}
                                </ul>
                            ) : <p className="text-sm text-ink/60">No partial alignment detected.</p>}
                        </Panel>
                        <Panel title="Missing Requirements" icon={TrendingDown} emptyMessage="No obvious missing requirements.">
                            {result.missing_requirements?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.missing_requirements.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            ) : <p className="text-sm text-ink/60">No major gaps identified.</p>}
                        </Panel>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="What’s Good" icon={CheckCircle2} emptyMessage="No positive signals yet.">
                            {result.strengths?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.strengths.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            ) : null}
                        </Panel>
                        <Panel title="What Needs Improvement" icon={Wrench} emptyMessage="No immediate gaps identified.">
                            {result.improvements?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.improvements.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            ) : null}
                        </Panel>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="What Could Be De-emphasized" icon={Lightbulb} emptyMessage="Nothing specific to de-emphasize.">
                            {result.deemphasize?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.deemphasize.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            ) : null}
                        </Panel>
                        <Panel title="Priority Action Plan" icon={TrendingDown} emptyMessage="No priority actions required.">
                            {result.priority_actions?.length ? (
                                <ul className="space-y-2 text-sm text-ink/75">
                                    {result.priority_actions.map((item) => <li key={item}>• {item}</li>)}
                                </ul>
                            ) : null}
                        </Panel>
                    </div>

                    <Panel title="Responsibility Match" icon={FileText} emptyMessage="No responsibility overlap detected.">
                        {result.responsibility_match?.length ? (
                            <ul className="space-y-2 text-sm text-ink/75">
                                {result.responsibility_match.map((item) => <li key={item}>• {item}</li>)}
                            </ul>
                        ) : <p className="text-sm text-ink/60">No explicit responsibility alignment found in the resume.</p>}
                    </Panel>
                </div>
            )}

            {history.length > 0 && !result && (
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                    <h2 className="font-display text-lg font-semibold text-ink mb-3">Recent Job Match Runs</h2>
                    <div className="space-y-3">
                        {history.map((entry) => (
                            <button key={entry.id} type="button" onClick={() => setResult(entry)} className="flex w-full items-center justify-between rounded-lg border border-line bg-paper p-3 text-left hover:bg-paper/80">
                                <div>
                                    <div className="text-sm font-medium text-ink">{entry.job_title || "Target role"}</div>
                                    <div className="text-xs text-ink/55">{new Date(entry.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-sm font-semibold text-ink">{entry.overall_score}/100</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
