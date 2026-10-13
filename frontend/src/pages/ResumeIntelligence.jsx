import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Lightbulb, Target, TrendingDown, Wrench } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getLatestResumeIntelligence } from "../services/atsService";

const PRIORITIES = ["high", "medium", "low"];

function Panel({ title, icon: Icon, children, emptyMessage }) {
    return (
        <section className="border-t border-line py-6">
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

export default function ResumeIntelligence() {
    const { resumeId: routeResumeId } = useParams();
    const resumeId = Number(routeResumeId);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const incomingReport = location.state?.report?.intelligence_report;
    const loadingRole = location.state?.targetRole?.name;
    const [report, setReport] = useState(incomingReport || null);
    const [baseline, setBaseline] = useState(location.state?.report || null);
    const [loading, setLoading] = useState(!incomingReport);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!Number.isSafeInteger(resumeId) || resumeId <= 0) {
            setError("A valid resume could not be identified.");
            setLoading(false);
            return;
        }
        if (incomingReport) return;

        let active = true;
        (async () => {
            try {
                const result = await getLatestResumeIntelligence(resumeId);
                if (active && result.resume_id === resumeId && result.intelligence_report) {
                    setBaseline(result);
                    setReport(result.intelligence_report);
                } else if (active) {
                    setError("No Resume IQ report is available for this resume yet.");
                }
            } catch (requestError) {
                if (!active) return;
                if (requestError.response?.status === 401) {
                    logout();
                    navigate("/login", { replace: true, state: { message: "Your session expired. Please sign in again." } });
                } else if (requestError.response?.status === 404) {
                    setError("No Resume IQ report is available for this resume yet.");
                } else {
                    setError("Unable to load this Resume IQ report. Please try again.");
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [resumeId, incomingReport, logout, navigate]);

    const ai = report?.ai_analysis;
    const dimensions = report?.score_dimensions || [];
    const actions = ai?.priority_actions || [];

    if (loading) {
        return (
            <DashboardLayout title="Resume IQ">
                <div className="flex min-h-64 items-center justify-center text-sm text-ink/60">
                    Analyzing your resume for {loadingRole || "your selected role"}...
                </div>
            </DashboardLayout>
        );
    }

    if (error || !report) {
        return (
            <DashboardLayout title="Resume IQ">
                <div role="alert" className="mx-auto max-w-2xl rounded-md border border-danger/30 bg-danger/5 p-5 text-sm text-danger">
                    <div className="flex items-center gap-2"><AlertCircle size={16} />{error || "The report could not be loaded."}</div>
                    <button
                        type="button"
                        onClick={() => navigate(`/select-role?resume_id=${routeResumeId}`)}
                        className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink"
                    >
                        <ArrowLeft size={14} /> Choose a role
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Resume IQ">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6">
                    <p className="text-xs font-semibold uppercase text-signal">Resume IQ</p>
                    <h1 className="mt-1 font-display text-2xl font-bold text-ink">Role-specific resume intelligence</h1>
                    <p className="mt-2 text-sm text-ink/60">Target Role: <span className="font-medium text-ink">{report.target_role}</span></p>
                </header>

                {!ai?.available && (
                    <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        <p>{ai?.message || "AI analysis is temporarily unavailable. Basic ATS analysis is still available."}</p>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                    <section className="flex flex-col justify-between gap-5 rounded-lg border border-line bg-white p-5 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Target size={17} className="text-signal" />ATS Score</div>
                            <p className="mt-2 text-sm leading-6 text-ink/65">{report.overall_assessment}</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                            <p className="font-display text-4xl font-bold text-ink">{report.role_match_score}<span className="text-lg font-medium text-ink/45"> / 100</span></p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-ink/50">
                                {report.role_match_score <= 49 ? "LOW" : report.role_match_score <= 74 ? "MEDIUM" : "HIGH"}
                            </p>
                        </div>
                    </section>

                    <section className="rounded-lg border border-line bg-white p-5">
                        <h2 className="mb-3 text-sm font-semibold text-ink">Role-fit analysis</h2>
                        <div className="space-y-4">
                            {dimensions.map((dimension) => (
                                <div key={dimension.key} className="rounded-lg border border-line/80 bg-paper/40 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-ink">{dimension.label}</span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-ink/65">{dimension.explanation}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {ai?.available && (
                    <div className="mt-6 grid gap-x-8 lg:grid-cols-2">
                        <Panel title="What's Good" icon={CheckCircle2} emptyMessage="No evidence-backed strengths were identified.">
                            {ai.strengths?.length > 0 && <div className="flex flex-col gap-4">{ai.strengths.map((item, index) => (
                                <Finding key={`${item.title}-${index}`} title={item.title} detail={`Evidence: “${item.evidence}”`}>{item.explanation}<br />{item.role_relevance}</Finding>
                            ))}</div>}
                        </Panel>
                        <Panel title="What's Missing" icon={AlertCircle} emptyMessage="No role-relevant capability gaps were identified.">
                            {ai.missing?.length > 0 && <div className="flex flex-col gap-4">{ai.missing.map((item, index) => (
                                <Finding key={`${item.item}-${index}`} title={item.item} tone="warning" detail={`Status: ${item.status.replace(/_/g, " ")} · Importance: ${item.importance}`}>{item.reason}</Finding>
                            ))}</div>}
                        </Panel>
                        <Panel title="What Needs Improvement" icon={Wrench} emptyMessage="No specific improvements were identified.">
                            {ai.improvements?.length > 0 && <div className="flex flex-col gap-4">{ai.improvements.map((item, index) => (
                                <Finding key={`${item.section}-${index}`} title={item.section} detail={item.evidence ? `Evidence: “${item.evidence}”` : null}>
                                    <span className="font-medium">Issue:</span> {item.issue}<br />
                                    <span className="font-medium">Why:</span> {item.why_it_matters}<br />
                                    <span className="font-medium">How:</span> {item.recommendation}
                                    <span className="ml-2 align-middle"><PriorityBadge priority={item.priority} /></span>
                                </Finding>
                            ))}</div>}
                        </Panel>
                        <Panel title="What Could Be De-emphasized" icon={TrendingDown} emptyMessage="No lower-relevance content was identified.">
                            {ai.deemphasize?.length > 0 && <div className="flex flex-col gap-4">{ai.deemphasize.map((item, index) => (
                                <Finding key={`${item.item}-${index}`} title={item.item} detail={`Evidence: “${item.evidence}”`}>{item.reason}<br />Consider: {item.suggestion}</Finding>
                            ))}</div>}
                        </Panel>
                        <Panel title="Priority Action Plan" icon={Lightbulb} emptyMessage="No actions were suggested.">
                            {actions.length > 0 && <div className="flex flex-col gap-4">{PRIORITIES.map((priority) => {
                                const group = actions.filter((item) => item.priority === priority);
                                if (!group.length) return null;
                                return <div key={priority}><div className="mb-2"><PriorityBadge priority={priority} /></div><ol className="flex flex-col gap-3">{group.map((item, index) => (
                                    <li key={`${item.action}-${index}`} className="text-sm text-ink/75"><span className="font-medium text-ink">{item.action}</span><p className="mt-1 text-xs leading-5 text-ink/55">{item.reason}</p></li>
                                ))}</ol></div>;
                            })}</div>}
                        </Panel>
                    </div>
                )}

                {!ai?.available && report.deterministic_analysis && (
                    <section className="mt-6 border-t border-line py-6">
                        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Basic ATS Analysis</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="mb-2 text-sm font-semibold text-ink">Deterministic findings</h3>
                                {report.deterministic_analysis.issues?.length ? (
                                    <ul className="flex flex-col gap-2 text-sm text-ink/70">
                                        {report.deterministic_analysis.issues.map((item, index) => <li key={`${item.type}-${index}`}>{item.message}</li>)}
                                    </ul>
                                ) : <p className="text-sm text-ink/50">No deterministic issues were detected.</p>}
                            </div>
                            <div>
                                <h3 className="mb-2 text-sm font-semibold text-ink">Deterministic recommendations</h3>
                                {report.deterministic_analysis.recommendations?.length ? (
                                    <ul className="flex flex-col gap-2 text-sm text-ink/70">
                                        {report.deterministic_analysis.recommendations.map((item, index) => <li key={`${item.category}-${index}`}>{item.message}</li>)}
                                    </ul>
                                ) : <p className="text-sm text-ink/50">No deterministic recommendations were generated.</p>}
                            </div>
                        </div>
                    </section>
                )}

                <footer className="mt-2 border-t border-line py-5 text-xs leading-5 text-ink/50">
                    Suggestions are for your consideration only. Your resume has not been changed.
                    <button type="button" onClick={() => navigate(`/select-role?resume_id=${resumeId}`)} className="ml-3 font-medium text-ink underline underline-offset-2">Analyze for another role</button>
                </footer>
            </div>
        </DashboardLayout>
    );
}
