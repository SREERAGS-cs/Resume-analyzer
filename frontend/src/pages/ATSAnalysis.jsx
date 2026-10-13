import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Target, RefreshCw, FileText, Upload, Plus, AlertCircle, CheckCircle2, Lightbulb, TrendingDown, Wrench } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ATSOverallScore from "../components/ats/ATSOverallScore";
import ATSComponentScores from "../components/ats/ATSComponentScores";
import ATSKeywordsCard from "../components/ats/ATSKeywordsCard";
import ATSIssuesCard from "../components/ats/ATSIssuesCard";
import ATSRecommendationsCard from "../components/ats/ATSRecommendationsCard";
import ATSHistoryCard from "../components/ats/ATSHistoryCard";
import { CUSTOM_ROLE_OPTION, ROLE_PROFILES } from "../data/roleProfiles";

import { getResumes } from "../services/resumeService";
import {
    analyzeResumeIntelligence,
    getATSHistory,
    getATSAnalysisById,
} from "../services/atsService";

const PRIORITIES = ["high", "medium", "low"];

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

function Finding({ title, children, detail, tone = "default" }) {
    const border = tone === "warning" ? "border-l-amber-400" : "border-l-signal";
    return (
        <article className={`border-l-2 ${border} py-1 pl-4`}>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {children && <p className="mt-1 text-sm leading-6 text-ink/70">{children}</p>}
            {detail && <p className="mt-2 text-xs leading-5 text-ink/55">{detail}</p>}
        </article>
    );
}

function PriorityBadge({ priority }) {
    const styles = {
        high: "bg-danger/10 text-danger",
        medium: "bg-amber-100 text-amber-800",
        low: "bg-ink/5 text-ink/60",
    };
    return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${styles[priority] || styles.low}`}>{priority || "low"}</span>;
}

export default function ATSAnalysisPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedTargetRole = location.state?.targetRole;

    const [resumes, setResumes] = useState([]);
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedRoleId, setSelectedRoleId] = useState(selectedTargetRole?.id || "");
    const [customRoleName, setCustomRoleName] = useState(selectedTargetRole?.name || "");

    const [atsAnalysis, setAtsAnalysis] = useState(null);
    const [atsHistory, setAtsHistory] = useState([]);
    const [hasAnalysis, setHasAnalysis] = useState(null); // null = loading, false = none, true = exists
    const [notParsed, setNotParsed] = useState(false);

    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const effectiveRoleName = useMemo(() => {
        if (!selectedRoleId) return "";
        if (selectedRoleId === CUSTOM_ROLE_OPTION.id) return customRoleName.trim();
        const profile = ROLE_PROFILES.find((item) => item.id === selectedRoleId);
        return profile ? profile.name : "";
    }, [customRoleName, selectedRoleId]);

    // Load user resumes on mount without selecting a previous result.
    useEffect(() => {
        (async () => {
            try {
                const data = await getResumes();
                setResumes(data || []);
            } catch (err) {
                setErrorMessage("Failed to load your resumes. Please refresh.");
            } finally {
                setLoadingResumes(false);
            }
        })();
    }, []);

    const clearDisplayedAnalysis = () => {
        setAtsAnalysis(null);
        setAtsHistory([]);
        setHasAnalysis(null);
        setNotParsed(false);
        setErrorMessage(null);
    };

    const handleResumeSelect = (resumeId) => {
        setSelectedId(Number(resumeId));
        clearDisplayedAnalysis();
    };

    const handleRoleSelect = (roleId) => {
        setSelectedRoleId(roleId);
        clearDisplayedAnalysis();
    };

    const handleAnalyze = async () => {
        if (!selectedId) {
            setErrorMessage("Please select a resume before running ATS analysis.");
            return;
        }
        if (!effectiveRoleName) {
            setErrorMessage("Please select a target role before running ATS analysis.");
            return;
        }

        setAnalyzing(true);
        setErrorMessage(null);
        setNotParsed(false);
        setAtsAnalysis(null);
        setAtsHistory([]);
        setHasAnalysis(null);

        try {
            const report = await analyzeResumeIntelligence(selectedId, effectiveRoleName);
            setAtsAnalysis(report);
            setHasAnalysis(true);
            setErrorMessage(null);

            const history = await getATSHistory(selectedId, effectiveRoleName);
            setAtsHistory(history || []);
        } catch (err) {
            const detail = typeof err.response?.data?.detail === "string" ? err.response?.data?.detail : "Unable to run ATS analysis right now. Please try again.";
            if (err.response?.status === 400) {
                setNotParsed(detail.includes("parsed resume") || detail.includes("review and confirm"));
                setErrorMessage(detail);
            } else {
                setErrorMessage(detail);
            }
            setAtsAnalysis(null);
            setHasAnalysis(null);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSelectHistoricalRun = async (analysisId) => {
        try {
            setLoadingAnalysis(true);
            const specificResult = await getATSAnalysisById(analysisId);
            setAtsAnalysis(specificResult);
        } catch {
            setErrorMessage("Unable to load specific historical ATS run.");
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const intelligence = atsAnalysis?.intelligence_report || atsAnalysis || null;
    const ai = intelligence?.ai_analysis || {};
    const actions = ai?.priority_actions || [];
    const overallAssessment = intelligence?.overall_assessment || "";
    const selectedResume = resumes.find((resume) => Number(resume.id) === Number(selectedId)) || null;

    return (
        <DashboardLayout title="ATS Analysis">
            {/* Header / Intro */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                        <Target className="text-signal" size={24} />
                        ATS Score
                    </h1>
                    <p className="text-sm text-ink/60 mt-1">
                        Evaluate how well your resume matches a specific target role.
                    </p>
                    {selectedResume && (
                        <p className="mt-2 text-sm font-medium text-ink">
                            Resume: <span className="font-normal text-ink/70">{selectedResume.display_name || selectedResume.original_filename || "Selected resume"}</span>
                        </p>
                    )}
                    {(atsAnalysis?.target_role || effectiveRoleName) && (
                        <p className="mt-1 text-sm font-medium text-ink">
                            Target Role: <span className="font-normal text-ink/70">{atsAnalysis?.target_role || effectiveRoleName}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Resume Selector Bar */}
            {!loadingResumes && resumes.length > 0 && (
                <div className="mb-6 space-y-4 rounded-xl border border-line bg-white p-4 shadow-xs">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-center gap-3 flex-1">
                            <FileText size={20} className="text-ink/60 shrink-0" />
                            <div className="flex-1 max-w-md">
                                <label htmlFor="resume-select" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/60">Select Resume</label>
                                <select
                                    id="resume-select"
                                    value={selectedId ?? ""}
                                    onChange={(e) => handleResumeSelect(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full rounded-lg border border-line bg-paper/30 px-3 py-2 text-sm font-medium text-ink focus:border-signal focus:outline-none"
                                >
                                    <option value="">Select a resume...</option>
                                    {resumes.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.display_name} ({r.original_filename})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 max-w-md">
                            <label htmlFor="target-role" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/60">Select Target Role</label>
                            <select
                                id="target-role"
                                value={selectedRoleId || ""}
                                onChange={(event) => {
                                    handleRoleSelect(event.target.value);
                                    setErrorMessage(null);
                                }}
                                className="w-full rounded-lg border border-line bg-paper/30 px-3 py-2 text-sm font-medium text-ink focus:border-signal focus:outline-none"
                            >
                                <option value="">Select a role...</option>
                                {ROLE_PROFILES.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </option>
                                ))}
                                <option value={CUSTOM_ROLE_OPTION.id}>{CUSTOM_ROLE_OPTION.name}</option>
                            </select>
                        </div>
                    </div>

                    {selectedRoleId === CUSTOM_ROLE_OPTION.id && (
                        <div className="max-w-lg">
                            <label htmlFor="custom-role" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/60">Custom Role</label>
                            <input
                                id="custom-role"
                                type="text"
                                value={customRoleName}
                                onChange={(event) => {
                                    setCustomRoleName(event.target.value);
                                    setErrorMessage(null);
                                }}
                                placeholder="e.g. Computer Vision Engineer"
                                className="w-full rounded-lg border border-line bg-paper/30 px-3 py-2 text-sm text-ink focus:border-signal focus:outline-none"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || loadingAnalysis || !effectiveRoleName}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-all hover:bg-ink/90 disabled:opacity-50 shrink-0"
                    >
                        <RefreshCw size={16} className={analyzing ? "animate-spin" : ""} />
                        {analyzing ? "Analyzing Resume..." : effectiveRoleName ? `Analyze for ${effectiveRoleName}` : "Select Target Role"}
                    </button>
                </div>
            )}

            {!loadingResumes && !loadingAnalysis && !analyzing && !atsAnalysis && !errorMessage && (
                <div className="mb-6 rounded-xl border border-dashed border-line bg-white p-6 text-center shadow-xs">
                    <p className="text-sm font-medium text-ink">ATS Score</p>
                    <p className="mt-2 text-sm text-ink/60">Evaluate how well your resume matches a specific target role.</p>
                </div>
            )}

            {/* Error Message Toast / Banner */}
            {errorMessage && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Loading State */}
            {(loadingResumes || loadingAnalysis || analyzing) && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-white py-16 text-center shadow-xs">
                    <RefreshCw size={32} className="animate-spin text-signal mb-3" />
                    <p className="font-display text-base font-semibold text-ink">
                        {analyzing ? "Analyzing Resume for ATS Compliance..." : "Loading ATS Data..."}
                    </p>
                    <p className="text-xs text-ink/60 mt-1">Checking keywords, layout, and content quality rules...</p>
                </div>
            )}

            {/* Empty State: No Resumes in Account */}
            {!loadingResumes && resumes.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white py-16 text-center shadow-xs">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-ink/40 mb-4">
                        <FileText size={32} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-ink">No Resumes Available</h3>
                    <p className="mt-1 max-w-sm text-sm text-ink/60">
                        Upload or create a resume first to run deterministic ATS analysis.
                    </p>
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={() => navigate("/upload-resume")}
                            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                        >
                            <Upload size={16} />
                            Upload Resume
                        </button>
                        <button
                            onClick={() => navigate("/choose-template")}
                            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
                        >
                            <Plus size={16} />
                            Create Resume
                        </button>
                    </div>
                </div>
            )}

            {/* Resume Needs Review Notice */}
            {!loadingResumes && !loadingAnalysis && !analyzing && notParsed && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-12 px-6 text-center shadow-xs">
                    <AlertCircle size={28} className="text-amber-600 mb-2" />
                    <h3 className="font-display text-base font-semibold text-ink">Resume Unparsed / Review Required</h3>
                    <p className="mt-1 max-w-md text-sm text-ink/70">
                        This resume has not been parsed and verified yet. Review and confirm its content first so the ATS engine has structured data to evaluate.
                    </p>
                    <button
                        onClick={() => navigate(`/resumes/${selectedId}/review`)}
                        className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                    >
                        Go to Resume Review
                    </button>
                </div>
            )}

            {/* Empty State: No Analysis performed yet on selected resume */}
            {!loadingResumes && !loadingAnalysis && !analyzing && !notParsed && hasAnalysis === false && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white py-12 px-6 text-center shadow-xs">
                    <Target size={32} className="text-ink/40 mb-3" />
                    <h3 className="font-display text-base font-semibold text-ink">No ATS Analysis Available Yet</h3>
                    <p className="mt-1 max-w-md text-sm text-ink/60">
                        Run a rule-based ATS analysis to see keyword coverage, formatting safety, and diagnostic issues.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
                    >
                        <RefreshCw size={16} />
                        Analyze Resume Now
                    </button>
                </div>
            )}

            {/* Full ATS Results Dashboard */}
            {!loadingResumes && !loadingAnalysis && !analyzing && !notParsed && atsAnalysis && (
                <div className="flex flex-col gap-6">
                    <ATSOverallScore score={atsAnalysis.ats_score} />

                    <ATSComponentScores
                        roleSkillsScore={atsAnalysis.role_skills_score ?? atsAnalysis.section_score}
                        projectExperienceScore={atsAnalysis.project_experience_score ?? atsAnalysis.section_score}
                        qualificationsKeywordsScore={atsAnalysis.qualifications_keywords_score ?? atsAnalysis.keyword_score}
                        contentQualityScore={atsAnalysis.content_quality_score ?? atsAnalysis.content_score}
                        formattingScore={atsAnalysis.formatting_score}
                        atsParsingScore={atsAnalysis.ats_parsing_score ?? atsAnalysis.formatting_score}
                        keywordScore={atsAnalysis.keyword_score}
                        sectionScore={atsAnalysis.section_score}
                        contentScore={atsAnalysis.content_score}
                    />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <ATSKeywordsCard keywords={atsAnalysis.detected_keywords || []} />
                        <ATSIssuesCard issues={atsAnalysis.issues || []} />
                    </div>

                    {overallAssessment && (
                        <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
                            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Overall Assessment</h2>
                            <p className="text-sm leading-7 text-ink/70">{overallAssessment}</p>
                        </section>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="What's Good" icon={CheckCircle2} emptyMessage="No strong role-fit signals were identified.">
                            {ai?.strengths?.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    {ai.strengths.map((item, index) => (
                                        <Finding key={`${item.title}-${index}`} title={item.title} detail={item.evidence ? `Evidence: “${item.evidence}”` : undefined}>
                                            {item.explanation}
                                            {item.role_relevance && <><br />{item.role_relevance}</>}
                                        </Finding>
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel title="What's Missing" icon={AlertCircle} emptyMessage="No major role-fit gaps were identified.">
                            {ai?.missing?.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    {ai.missing.map((item, index) => (
                                        <Finding
                                            key={`${item.item}-${index}`}
                                            title={item.item}
                                            tone="warning"
                                            detail={`Importance: ${item.importance || "Medium"}`}
                                        >
                                            {item.reason}
                                        </Finding>
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel title="What Needs Improvement" icon={Wrench} emptyMessage="No specific improvements were identified.">
                            {ai?.improvements?.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    {ai.improvements.map((item, index) => (
                                        <Finding key={`${item.section}-${index}`} title={item.section} detail={item.evidence ? `Evidence: “${item.evidence}”` : null}>
                                            <span className="font-medium">Issue:</span> {item.issue}
                                            <br />
                                            <span className="font-medium">Why it matters:</span> {item.why_it_matters}
                                            <br />
                                            <span className="font-medium">Recommendation:</span> {item.recommendation}
                                            <span className="ml-2 align-middle"><PriorityBadge priority={item.priority} /></span>
                                        </Finding>
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel title="What Could Be De-emphasized" icon={TrendingDown} emptyMessage="No lower-priority content was identified.">
                            {ai?.deemphasize?.length > 0 && (
                                <div className="flex flex-col gap-4">
                                    {ai.deemphasize.map((item, index) => (
                                        <Finding key={`${item.item}-${index}`} title={item.item} detail={item.evidence ? `Evidence: “${item.evidence}”` : undefined}>
                                            {item.reason}
                                            <br />
                                            Suggestion: {item.suggestion}
                                        </Finding>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>

                    <Panel title="Priority Action Plan" icon={Lightbulb} emptyMessage="No action plan was generated.">
                        {actions.length > 0 && (
                            <div className="flex flex-col gap-4">
                                {PRIORITIES.map((priority) => {
                                    const group = actions.filter((item) => item.priority === priority);
                                    if (!group.length) return null;
                                    return (
                                        <div key={priority}>
                                            <div className="mb-2"><PriorityBadge priority={priority} /></div>
                                            <ol className="flex flex-col gap-3">
                                                {group.map((item, index) => (
                                                    <li key={`${item.action}-${index}`} className="text-sm text-ink/75">
                                                        <span className="font-medium text-ink">{item.action}</span>
                                                        <p className="mt-1 text-xs leading-5 text-ink/55">{item.reason}</p>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <ATSRecommendationsCard recommendations={atsAnalysis.recommendations || []} />
                        </div>
                        <div>
                            <ATSHistoryCard
                                history={atsHistory}
                                activeAnalysisId={atsAnalysis.id}
                                onSelectAnalysis={handleSelectHistoricalRun}
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
